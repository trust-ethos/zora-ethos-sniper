import * as log from "@std/log";
import { parseEther, formatEther, type Address } from "viem";
import { createTradeCall, type TradeParameters } from "@zoralabs/coins-sdk";
import type { BotConfig } from "../config/config.ts";

export interface PriceQuote {
  tokenAddress: string;
  priceInETH: number;
  lastUpdated: Date;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  source: "ZORA_SDK" | "SIMULATION" | "CACHED";
}

export interface PriceHistory {
  timestamp: Date;
  price: number;
  volume?: number;
}

export class PriceService {
  private priceCache: Map<string, PriceQuote> = new Map();
  private priceHistory: Map<string, PriceHistory[]> = new Map();
  private cacheExpiryMs: number;

  constructor(private config: BotConfig) {
    // Cache prices for 30 seconds to avoid excessive API calls
    this.cacheExpiryMs = 30000;
  }

  /**
   * Get current price for a creator coin using Zora SDK quotes
   */
  async getCurrentPrice(tokenAddress: Address, referenceAmount = 0.001): Promise<PriceQuote> {
    const cacheKey = tokenAddress.toLowerCase();
    
    // Check cache first
    const cached = this.priceCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      log.debug(`📊 Using cached price for ${tokenAddress}: ${cached.priceInETH} ETH`);
      return cached;
    }

    try {
      log.debug(`🔄 Fetching real-time price for ${tokenAddress}...`);
      
      // Use Zora SDK to get price quote
      const tradeParameters: TradeParameters = {
        sell: { type: "eth" },
        buy: {
          type: "erc20",
          address: tokenAddress,
        },
        amountIn: parseEther(referenceAmount.toString()),
        slippage: 0.05, // 5% slippage for quote
        sender: "0x0000000000000000000000000000000000000000" as Address, // Dummy address for quote
      };

      const quote = await createTradeCall(tradeParameters);
      
      // Calculate price from quote
      const ethAmount = formatEther(BigInt(quote.call.value));
      const priceInETH = parseFloat(ethAmount) / referenceAmount; // Price per "unit" of trade
      
      const priceQuote: PriceQuote = {
        tokenAddress: tokenAddress.toLowerCase(),
        priceInETH,
        lastUpdated: new Date(),
        confidence: "HIGH",
        source: "ZORA_SDK"
      };

      // Cache the result
      this.priceCache.set(cacheKey, priceQuote);
      
      // Store in price history
      this.addToPriceHistory(tokenAddress, priceInETH);
      
      log.debug(`✅ Real-time price for ${tokenAddress}: ${priceInETH} ETH (HIGH confidence)`);
      return priceQuote;

    } catch (error) {
      log.info(`⚠️ Failed to get real-time price for ${tokenAddress}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fall back to simulation
      return this.getSimulatedPrice(tokenAddress, referenceAmount);
    }
  }

  /**
   * Get multiple prices efficiently (with batching if needed)
   */
  async getCurrentPrices(tokenAddresses: Address[]): Promise<Map<string, PriceQuote>> {
    const results = new Map<string, PriceQuote>();
    
    // For now, fetch sequentially. Could be optimized with batching later.
    for (const address of tokenAddresses) {
      try {
        const price = await this.getCurrentPrice(address);
        results.set(address.toLowerCase(), price);
      } catch (error) {
        log.error(`Failed to get price for ${address}: ${error}`);
      }
    }
    
    return results;
  }

  /**
   * Calculate price change for a token
   */
  getPriceChange(tokenAddress: Address, timeframeMinutes = 60): {
    currentPrice: number;
    previousPrice: number;
    changePercent: number;
    changeDirection: "UP" | "DOWN" | "STABLE";
  } | null {
    const history = this.priceHistory.get(tokenAddress.toLowerCase());
    if (!history || history.length < 2) return null;

    const now = Date.now();
    const cutoffTime = now - (timeframeMinutes * 60 * 1000);
    
    const currentPrice = history[history.length - 1].price;
    const previousPrices = history.filter(h => h.timestamp.getTime() >= cutoffTime);
    
    if (previousPrices.length === 0) return null;
    
    const previousPrice = previousPrices[0].price;
    const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    let changeDirection: "UP" | "DOWN" | "STABLE" = "STABLE";
    if (changePercent > 1) changeDirection = "UP";
    else if (changePercent < -1) changeDirection = "DOWN";

    return {
      currentPrice,
      previousPrice,
      changePercent,
      changeDirection
    };
  }

  /**
   * Get price with confidence interval based on recent volatility
   */
  async getPriceWithConfidence(tokenAddress: Address): Promise<{
    price: number;
    confidence: number;
    volatility: number;
  }> {
    const quote = await this.getCurrentPrice(tokenAddress);
    const history = this.priceHistory.get(tokenAddress.toLowerCase()) || [];
    
    if (history.length < 3) {
      return {
        price: quote.priceInETH,
        confidence: 0.7, // Medium confidence for new tokens
        volatility: 0
      };
    }

    // Calculate volatility from recent price movements
    const recentPrices = history.slice(-10).map(h => h.price);
    const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / recentPrices.length;
    const volatility = Math.sqrt(variance) / avgPrice;

    // Higher volatility = lower confidence
    const confidence = Math.max(0.3, 1 - (volatility * 2));

    return {
      price: quote.priceInETH,
      confidence,
      volatility
    };
  }

  /**
   * Fallback simulation when real prices fail
   */
  private getSimulatedPrice(tokenAddress: string, referenceAmount: number): PriceQuote {
    log.debug(`🎭 Using simulated price for ${tokenAddress}`);
    
    // Use the same simulation logic as the trading bot
    const basePrice = referenceAmount * 0.8; // Slightly lower than reference
    const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const simulatedPrice = Math.max(basePrice + randomVariation, referenceAmount * 0.1);

    const priceQuote: PriceQuote = {
      tokenAddress: tokenAddress.toLowerCase(),
      priceInETH: simulatedPrice,
      lastUpdated: new Date(),
      confidence: "LOW",
      source: "SIMULATION"
    };

    this.priceCache.set(tokenAddress.toLowerCase(), priceQuote);
    return priceQuote;
  }

  /**
   * Add price to historical tracking
   */
  private addToPriceHistory(tokenAddress: Address, price: number): void {
    const key = tokenAddress.toLowerCase();
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }

    const history = this.priceHistory.get(key)!;
    history.push({
      timestamp: new Date(),
      price
    });

    // Keep only last 100 entries per token
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Check if cached price is still valid
   */
  private isCacheValid(quote: PriceQuote): boolean {
    const age = Date.now() - quote.lastUpdated.getTime();
    return age < this.cacheExpiryMs;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.priceCache.clear();
    log.info("📊 Price cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalCached: number;
    validEntries: number;
    expiredEntries: number;
  } {
    let validEntries = 0;
    let expiredEntries = 0;

    for (const quote of this.priceCache.values()) {
      if (this.isCacheValid(quote)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalCached: this.priceCache.size,
      validEntries,
      expiredEntries
    };
  }
}