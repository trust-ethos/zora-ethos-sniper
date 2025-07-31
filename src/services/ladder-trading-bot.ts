import * as log from "@std/log";
import type { BotConfig } from "../config/config.ts";
import type { EthosService } from "./ethos-service.ts";
import type { ZoraCoinCreatedEvent } from "./zora-listener.ts";
import type { ZoraProfile } from "./zora-profile-service.ts";
import { DexService, type TradeResult } from "./dex-service.ts";
import { PriceService } from "./price-service.ts";
import type { Address } from "viem";

export interface LadderLevel {
  triggerPercent: number;    // e.g., 100% = 2x
  sellPercent: number;       // e.g., 50% = sell half remaining position
  description: string;
}

export interface LadderedPosition {
  coinAddress: string;
  coinName: string;
  coinSymbol: string;
  entryPrice: number;
  originalAmount: number;     // Original position size
  currentAmount: number;      // Current remaining position size
  entryTime: Date;
  ethosScore: number;
  ethosAddress: string;
  stopLossTarget: number;     // 50% stop loss
  maxHoldTime: Date;
  
  // Ladder tracking
  levelsHit: number[];        // Track which levels we've already hit
  totalSold: number;          // Total amount sold so far
  realizedProfits: number;    // ETH profits realized from sales
  
  isActive: boolean;
  exitPrice?: number;
  exitTime?: Date;
  exitReason?: "FULL_EXIT" | "STOP_LOSS" | "TIME_LIMIT" | "MANUAL";
}

export class LadderTradingBot {
  private activePositions: Map<string, LadderedPosition> = new Map();
  private positionHistory: LadderedPosition[] = [];
  private isMonitoring = false;
  private dexService: DexService;
  private priceService: PriceService;

  // 🎯 LADDER CONFIGURATION - The Magic Numbers!
  private readonly LADDER_LEVELS: LadderLevel[] = [
    // Early profits - secure initial investment
    { triggerPercent: 100,   sellPercent: 30, description: "2x - Secure 30% (recover ~60% of investment)" },
    { triggerPercent: 200,   sellPercent: 25, description: "3x - Lock 25% more profits" },
    { triggerPercent: 400,   sellPercent: 20, description: "5x - Take 20% more off table" },
    
    // Big gains - let winners run but take some
    { triggerPercent: 900,   sellPercent: 15, description: "10x - Partial exit at 10x" },
    { triggerPercent: 1900,  sellPercent: 10, description: "20x - Small exit at 20x" },
    { triggerPercent: 4900,  sellPercent: 8,  description: "50x - Tiny exit at 50x" },
    
    // Moon territory - keep the diamond hands dream alive
    { triggerPercent: 9900,  sellPercent: 5,  description: "100x - Keep 95% for the moon" },
    { triggerPercent: 19900, sellPercent: 3,  description: "200x - Still keeping moon bag" },
    { triggerPercent: 49900, sellPercent: 2,  description: "500x - Final tiny exit" },
    
    // The remaining ~1% rides to infinity (10000%+ gains)
  ];

  constructor(
    private config: BotConfig,
    private ethosService: EthosService
  ) {
    this.dexService = new DexService(config);
    this.priceService = new PriceService(config);
  }

  async evaluateAndTrade(
    event: ZoraCoinCreatedEvent,
    ethosScore: number,
    ethosAddress: string,
    profile: ZoraProfile
  ): Promise<boolean> {
    if (this.activePositions.size >= this.config.maxPositions) {
      log.debug(`🚫 Max positions (${this.config.maxPositions}) reached. Skipping ${profile.coinSymbol}`);
      return false;
    }

    log.warn(`💎 Creating LADDERED position for ${profile.coinSymbol} (Score: ${ethosScore})`);
    
    const position = await this.createLadderedPosition(event, ethosScore, ethosAddress, profile);
    if (position) {
      this.activePositions.set(event.coin.toLowerCase(), position);
      this.startPositionMonitoring();
      return true;
    }
    
    return false;
  }

  private async createLadderedPosition(
    event: ZoraCoinCreatedEvent,
    ethosScore: number,
    ethosAddress: string,
    profile: ZoraProfile
  ): Promise<LadderedPosition | null> {
    try {
      let actualEntryPrice = this.config.tradeAmountEth;
      let buyResult: TradeResult | null = null;

      if (!this.config.simulationMode) {
        log.warn(`💰 Executing REAL laddered buy for ${profile.coinSymbol}...`);
        buyResult = await this.dexService.buyToken(
          event.coin as Address,
          this.config.tradeAmountEth
        );

        if (!buyResult.success) {
          log.error(`❌ Buy failed for ${profile.coinSymbol}: ${buyResult.error}`);
          return null;
        }

        actualEntryPrice = parseFloat(buyResult.amountIn);
        log.warn(`✅ Laddered buy successful! Amount: ${actualEntryPrice} ETH`);
      }

      const position: LadderedPosition = {
        coinAddress: event.coin.toLowerCase(),
        coinName: profile.coinName,
        coinSymbol: profile.coinSymbol,
        entryPrice: actualEntryPrice,
        originalAmount: this.config.tradeAmountEth,
        currentAmount: this.config.tradeAmountEth, // Start with full position
        entryTime: new Date(),
        ethosScore,
        ethosAddress,
        stopLossTarget: actualEntryPrice * (1 - this.config.stopLossPercent / 100),
        maxHoldTime: new Date(Date.now() + this.config.maxHoldTimeMinutes * 60000),
        levelsHit: [],
        totalSold: 0,
        realizedProfits: 0,
        isActive: true
      };

      log.warn(`🎯 LADDER SETUP for ${profile.coinSymbol}:`);
      log.warn(`   💰 Position Size: ${this.config.tradeAmountEth} ETH`);
      log.warn(`   🛡️  Stop Loss: -${this.config.stopLossPercent}% (${position.stopLossTarget.toFixed(6)} ETH)`);
      log.warn(`   🎯 Ladder Levels: ${this.LADDER_LEVELS.length} profit-taking levels`);
      log.warn(`   💎 Moon Bag: ~1% held for 10000%+ gains`);

      return position;

    } catch (error) {
      log.error(`❌ Failed to create laddered position: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private startPositionMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    log.info("🔄 Starting LADDERED position monitoring...");

    const monitoringInterval = 30000; // Check every 30 seconds

    const intervalId = setInterval(async () => {
      if (this.activePositions.size === 0) return;

      try {
        await this.checkLadderedPositions();
      } catch (error) {
        log.error(`Ladder monitoring error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, monitoringInterval);

    (this as any).monitoringIntervalId = intervalId;
  }

  private async checkLadderedPositions(): Promise<void> {
    const now = new Date();
    const positionsToUpdate: string[] = [];

    for (const [coinAddress, position] of this.activePositions) {
      try {
        const currentPrice = await this.getCurrentPrice(position);
        const currentValueETH = currentPrice * position.currentAmount;
        const totalReturnPercent = ((currentValueETH - position.entryPrice) / position.entryPrice) * 100;

        // Check for ladder level triggers
        await this.checkLadderLevels(position, currentPrice, totalReturnPercent);

        // Check stop loss (only if we haven't hit any profit levels yet)
        if (position.levelsHit.length === 0 && currentPrice <= position.stopLossTarget) {
          await this.executeStopLoss(position, currentPrice, now);
          positionsToUpdate.push(coinAddress);
          continue;
        }

        // Check max hold time
        if (now >= position.maxHoldTime) {
          await this.executeTimeLimit(position, currentPrice, now);
          positionsToUpdate.push(coinAddress);
          continue;
        }

        // Log current status
        const realizedPercent = (position.realizedProfits / position.originalAmount) * 100;
        const unrealizedPercent = ((currentValueETH - position.currentAmount) / position.originalAmount) * 100;
        
        log.debug(`💎 ${position.coinSymbol}:`);
        log.debug(`   📊 Total Return: ${totalReturnPercent.toFixed(1)}%`);
        log.debug(`   💰 Realized: ${realizedPercent.toFixed(1)}% | Unrealized: ${unrealizedPercent.toFixed(1)}%`);
        log.debug(`   📈 Position: ${((position.currentAmount / position.originalAmount) * 100).toFixed(1)}% remaining`);
        log.debug(`   🎯 Levels Hit: ${position.levelsHit.length}/${this.LADDER_LEVELS.length}`);

      } catch (error) {
        log.error(`Error checking laddered position ${coinAddress}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Clean up fully exited positions
    positionsToUpdate.forEach(coinAddress => {
      const position = this.activePositions.get(coinAddress);
      if (position && (!position.isActive || position.currentAmount < 0.001)) {
        this.activePositions.delete(coinAddress);
        this.positionHistory.push(position);
      }
    });
  }

  private async checkLadderLevels(position: LadderedPosition, currentPrice: number, totalReturnPercent: number): Promise<void> {
    for (let i = 0; i < this.LADDER_LEVELS.length; i++) {
      const level = this.LADDER_LEVELS[i];
      
      // Skip if we already hit this level
      if (position.levelsHit.includes(i)) continue;
      
      // Check if we hit this level
      if (totalReturnPercent >= level.triggerPercent) {
        await this.executeLadderLevel(position, level, i, currentPrice);
      }
    }
  }

  private async executeLadderLevel(
    position: LadderedPosition, 
    level: LadderLevel, 
    levelIndex: number, 
    currentPrice: number
  ): Promise<void> {
    const sellAmount = position.currentAmount * (level.sellPercent / 100);
    const sellValueETH = sellAmount * currentPrice;
    
    log.warn(`🎯 LADDER TRIGGER: ${position.coinSymbol} hit ${level.triggerPercent + 100}% gain!`);
    log.warn(`   📝 ${level.description}`);
    log.warn(`   💰 Selling ${level.sellPercent}% of remaining position (${sellAmount.toFixed(6)} tokens)`);
    log.warn(`   💎 Keeping ${100 - level.sellPercent}% for further gains`);

    if (!this.config.simulationMode && this.config.enableSelling) {
      try {
        // Convert sell amount to proper token units for the actual trade
        const tokenAmount = BigInt(Math.floor(sellAmount * 1e18)); // Assuming 18 decimals
        const sellResult = await this.dexService.sellToken(position.coinAddress as Address, tokenAmount);
        
        if (sellResult.success) {
          log.warn(`   ✅ Ladder sell successful! TX: ${sellResult.transactionHash}`);
        } else {
          log.error(`   ❌ Ladder sell failed: ${sellResult.error}`);
          return; // Don't update position if trade failed
        }
      } catch (error) {
        log.error(`   ❌ Ladder sell error: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
    }

    // Update position
    position.currentAmount -= sellAmount;
    position.totalSold += sellAmount;
    position.realizedProfits += sellValueETH - (sellAmount * position.entryPrice);
    position.levelsHit.push(levelIndex);

    const remainingPercent = (position.currentAmount / position.originalAmount) * 100;
    log.warn(`   📊 Position Update: ${remainingPercent.toFixed(1)}% remaining (moon bag status!)`);
  }

  private async executeStopLoss(position: LadderedPosition, currentPrice: number, now: Date): Promise<void> {
    log.warn(`🛡️ STOP LOSS triggered for ${position.coinSymbol} at ${currentPrice.toFixed(6)} ETH`);
    
    if (!this.config.simulationMode && this.config.enableSelling) {
      const tokenAmount = BigInt(Math.floor(position.currentAmount * 1e18));
      const sellResult = await this.dexService.sellToken(position.coinAddress as Address, tokenAmount);
      
      if (sellResult.success) {
        log.warn(`   ✅ Stop loss sell successful! TX: ${sellResult.transactionHash}`);
      } else {
        log.error(`   ❌ Stop loss sell failed: ${sellResult.error}`);
      }
    }

    const totalLoss = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    position.isActive = false;
    position.exitPrice = currentPrice;
    position.exitTime = now;
    position.exitReason = "STOP_LOSS";
    
    log.warn(`   📊 Final Loss: ${totalLoss.toFixed(2)}%`);
  }

  private async executeTimeLimit(position: LadderedPosition, currentPrice: number, now: Date): Promise<void> {
    log.warn(`⏰ TIME LIMIT reached for ${position.coinSymbol} - selling remaining position`);
    
    if (!this.config.simulationMode && this.config.enableSelling && position.currentAmount > 0.001) {
      const tokenAmount = BigInt(Math.floor(position.currentAmount * 1e18));
      const sellResult = await this.dexService.sellToken(position.coinAddress as Address, tokenAmount);
      
      if (sellResult.success) {
        log.warn(`   ✅ Time limit sell successful! TX: ${sellResult.transactionHash}`);
      } else {
        log.error(`   ❌ Time limit sell failed: ${sellResult.error}`);
      }
    }

    position.isActive = false;
    position.exitPrice = currentPrice;
    position.exitTime = now;
    position.exitReason = "TIME_LIMIT";
  }

  private async getCurrentPrice(position: LadderedPosition): Promise<number> {
    try {
      const priceQuote = await this.priceService.getCurrentPrice(
        position.coinAddress as Address,
        position.currentAmount
      );
      return priceQuote.priceInETH;
    } catch (error) {
      log.warn(`⚠️ Failed to get current price for ${position.coinSymbol}, using entry price: ${error instanceof Error ? error.message : String(error)}`);
      return position.entryPrice;
    }
  }

  // Public interface methods
  getActivePositions(): Map<string, LadderedPosition> {
    return new Map(this.activePositions);
  }

  getPositionHistory(): LadderedPosition[] {
    return [...this.positionHistory];
  }

  getLadderStats(): {
    totalPositions: number;
    activeLadders: number;
    totalRealized: number;
    averageLevelsHit: number;
    moonBags: number; // Positions with >80% still held
  } {
    const allPositions = [...this.activePositions.values(), ...this.positionHistory];
    const totalRealized = allPositions.reduce((sum, p) => sum + p.realizedProfits, 0);
    const averageLevelsHit = allPositions.length > 0 
      ? allPositions.reduce((sum, p) => sum + p.levelsHit.length, 0) / allPositions.length 
      : 0;
    const moonBags = allPositions.filter(p => (p.currentAmount / p.originalAmount) > 0.8).length;

    return {
      totalPositions: allPositions.length,
      activeLadders: this.activePositions.size,
      totalRealized,
      averageLevelsHit,
      moonBags
    };
  }
}