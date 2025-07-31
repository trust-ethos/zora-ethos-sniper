import * as log from "@std/log";
import type { BotConfig } from "../config/config.ts";
import type { EthosService } from "./ethos-service.ts";
import type { ZoraCoinCreatedEvent } from "./zora-listener.ts";
import type { ZoraProfile } from "./zora-profile-service.ts";
import { DexService, type TradeResult } from "./dex-service.ts";
import { PriceService } from "./price-service.ts";
import type { TradingStrategy } from "../strategies/trading-strategy.ts";
import type { Address } from "viem";

export interface TradePosition {
  coinAddress: string;
  coinName: string;
  coinSymbol: string;
  entryPrice: number;
  originalAmount: number;     // Original position size
  currentAmount: number;      // Current remaining position size  
  entryTime: Date;
  ethosScore: number;
  ethosAddress: string;
  stopLossTarget: number;
  maxHoldTime: Date;
  
  // Ladder tracking
  levelsHit: number[];        // Track which levels we've already hit
  totalSold: number;          // Total amount sold so far
  realizedProfits: number;    // ETH profits realized from sales
  
  isActive: boolean;
  exitPrice?: number;
  exitTime?: Date;
  exitReason?: "FULL_EXIT" | "STOP_LOSS" | "TIME_LIMIT" | "MANUAL";
  profitLoss?: number;
}

export class TradingBot {
  private activePositions: Map<string, TradePosition> = new Map();
  private positionHistory: TradePosition[] = [];
  private isMonitoring = false;
  private dexService: DexService;
  private priceService: PriceService;

  constructor(
    private config: BotConfig,
    private ethosService: EthosService,
    private strategy: TradingStrategy
  ) {
    this.dexService = new DexService(config);
    this.priceService = new PriceService(config);
    
    log.info(`🎯 Trading Bot initialized with ${strategy.name.toUpperCase()} strategy`);
    log.info(`   📊 Min Ethos: ${strategy.minEthosScore} | Trade Amount: ${strategy.tradeAmountEth} ETH`);
    log.info(`   🛡️  Stop Loss: ${strategy.stopLossPercent}% | Ladder Levels: ${strategy.ladderLevels.length}`);
    if (strategy.enableMoonBag) {
      log.info(`   🌙 Moon Bag: ${strategy.moonBagPercent}% held for extreme gains`);
    }
  }

  async evaluateAndTrade(
    event: ZoraCoinCreatedEvent,
    ethosScore: number,
    ethosAddress: string,
    creatorProfile?: ZoraProfile
  ): Promise<boolean> {
    try {
      // Prominent WARN log for qualifying users (shows even in WARN mode)
      log.warn(`🎯 FOUND QUALIFYING CREATOR: ${event.name} (@${ethosAddress})`);
      log.warn(`   📊 Credibility Score: ${ethosScore} (${this.ethosService.getRiskAssessment(ethosScore)})`);
      log.warn(`   💰 Attempting to buy: ${this.strategy.tradeAmountEth} ETH worth`);
      log.warn(`   🎭 Strategy: ${this.strategy.name} (${this.strategy.aggressiveness})`);
      
      const modePrefix = this.config.simulationMode ? "🎭 [SIMULATION]" : "💰 [LIVE]";
      
      log.info(`${modePrefix} 🤖 Evaluating trade for ${event.name} (${event.symbol})`);
      log.info(`   🔗 Coin Address: ${event.coin}`);
      log.info(`   👤 Creator: ${event.caller}`);

          // Check if we should trade based on various criteria
    const shouldTrade = await this.shouldExecuteTrade(event, ethosScore);
    
    if (!shouldTrade) {
      log.warn(`   ❌ SKIPPING QUALIFYING CREATOR: Trade evaluation failed`);
      log.warn(`   🚫 Possible reasons: Max positions reached, insufficient funds, or safety checks`);
      return false;
    }

    if (this.config.simulationMode) {
      log.info(`   ✅ Trade criteria met! SIMULATING trade with ${this.config.tradeAmountEth} ETH`);
      log.info(`   🎭 This is simulation mode - no real money will be spent`);
    } else {
      log.warn(`   ✅ Trade criteria met! EXECUTING REAL trade with ${this.config.tradeAmountEth} ETH`);
      log.warn(`   ⚠️  This will spend REAL money from your wallet!`);
      
      // Show DEX service status
      const dexStatus = this.dexService.getTradingStatus();
      if (!dexStatus.ready) {
        log.error(`   ❌ DEX service not ready for trading:`);
        dexStatus.issues.forEach(issue => log.error(`      • ${issue}`));
        return false;
      }
    }
      
      // Create a position (simulated or real based on mode)
      await this.createPosition(event, ethosScore, ethosAddress, creatorProfile);
      
      // Start monitoring if not already started
      if (!this.isMonitoring) {
        this.startPositionMonitoring();
      }

      return true;
    } catch (error) {
      log.error(`Failed to evaluate trade: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async shouldExecuteTrade(
    event: ZoraCoinCreatedEvent,
    ethosScore: number
  ): Promise<boolean> {
    // Check Ethos score threshold (use strategy criteria)
    if (!this.ethosService.meetsScoreThreshold(ethosScore, this.strategy.minEthosScore)) {
      log.info(`   ❌ Ethos score ${ethosScore} below ${this.strategy.name} strategy threshold ${this.strategy.minEthosScore}`);
      return false;
    }
    
    log.warn(`   ✅ QUALIFIES! Score ${ethosScore} ≥ ${this.strategy.minEthosScore} (${this.strategy.name} strategy)`);
    log.warn(`🎯 FOUND QUALIFYING CREATOR: ${event.name} (@${event.caller})`);

    // Check if we already have too many active positions (use strategy limit)
    if (this.activePositions.size >= this.strategy.maxPositions) {
      log.info(`   ❌ Too many active positions (${this.activePositions.size}/${this.strategy.maxPositions}) for ${this.strategy.name} strategy`);
      return false;
    }

    // Check if we already have a position in this coin
    if (this.activePositions.has(event.coin.toLowerCase())) {
      log.info(`   ❌ Already have position in ${event.coin}`);
      return false;
    }

    // Additional criteria could be added here:
    // - Market cap analysis
    // - Liquidity checks
    // - Trading volume
    // - Token holder distribution
    // - Time-based restrictions (e.g., no trading during certain hours)

    log.info(`   ✅ All trade criteria passed`);
    return true;
  }

  private async createPosition(
    event: ZoraCoinCreatedEvent,
    ethosScore: number,
    ethosAddress: string,
    creatorProfile?: ZoraProfile
  ): Promise<void> {
    const now = new Date();
    const tradeAmount = this.strategy.tradeAmountEth; // Use strategy amount

    // Check DEX service status for live trading
    if (!this.config.simulationMode) {
      const dexStatus = this.dexService.getTradingStatus();
      if (!dexStatus.ready) {
        log.error(`❌ Cannot execute live trade - DEX service not ready:`);
        dexStatus.issues.forEach(issue => log.error(`   • ${issue}`));
        return;
      }
    }

    const modeEmoji = this.config.simulationMode ? "🎭" : "💎";
    const modeText = this.config.simulationMode ? "[SIMULATION]" : "[LADDER TRADE]";
    
    log.info(`${modeEmoji} ${modeText} Creating ${this.strategy.name.toUpperCase()} position for ${event.name}:`);
    log.info(`   💵 Trade Amount: ${tradeAmount} ETH`);
    log.info(`   🎯 Target: ${event.coin}`);
    log.info(`   📊 Ethos Score: ${ethosScore}`);
    log.info(`   🎭 Strategy: ${this.strategy.aggressiveness}`);

    let tradeResult: TradeResult;
    let actualEntryPrice = 0.001; // Default/simulated price

    if (this.config.simulationMode) {
      // Simulation mode - create position object only
      tradeResult = {
        success: true,
        amountIn: tradeAmount.toString(),
        amountOut: "1000", // Simulated tokens received
        transactionHash: "0x" + Math.random().toString(16).slice(2),
      };
      log.info(`   🎭 This is a simulated ${this.strategy.name} position - tracking for learning purposes`);
    } else {
      // Live trading mode - execute actual transaction
      log.warn(`   ⚠️  EXECUTING REAL ${this.strategy.name.toUpperCase()} TRANSACTION WITH REAL MONEY!`);
      
      tradeResult = await this.dexService.buyToken(
        event.coin as Address,
        tradeAmount
      );

      if (!tradeResult.success) {
        log.error(`❌ Failed to execute buy transaction: ${tradeResult.error}`);
        return;
      }

      log.warn(`✅ Live ladder trade executed successfully!`);
      log.warn(`   TX Hash: ${tradeResult.transactionHash}`);
      log.warn(`   Tokens Received: ${tradeResult.amountOut}`);
      
      // Use actual trade data for position
      actualEntryPrice = parseFloat(tradeResult.amountIn) / parseFloat(tradeResult.amountOut || "1");
    }

    // Create LADDER position tracking object
    const position: TradePosition = {
      coinAddress: event.coin.toLowerCase(),
      coinName: event.name,
      coinSymbol: event.symbol,
      entryPrice: actualEntryPrice,
      originalAmount: tradeAmount,       // Track original position size
      currentAmount: tradeAmount,        // Start with full position
      entryTime: now,
      ethosScore,
      ethosAddress,
      stopLossTarget: actualEntryPrice * (1 - this.strategy.stopLossPercent / 100), // Use strategy stop loss
      maxHoldTime: new Date(now.getTime() + this.strategy.maxHoldTimeMinutes * 60000), // Use strategy hold time
      
      // Initialize ladder tracking
      levelsHit: [],
      totalSold: 0,
      realizedProfits: 0,
      
      isActive: true,
    };

    // Store the position for monitoring
    this.activePositions.set(position.coinAddress, position);

    log.info(`🎯 LADDER SETUP for ${event.symbol}:`);
    log.info(`   💰 Position Size: ${tradeAmount} ETH`);
    log.info(`   🛡️  Stop Loss: -${this.strategy.stopLossPercent}% (${position.stopLossTarget.toFixed(6)} ETH`);
    log.info(`   ⏰ Max Hold: ${Math.round(this.strategy.maxHoldTimeMinutes/60)} hours`);
    log.info(`   🎯 Ladder Levels: ${this.strategy.ladderLevels.length} profit-taking levels`);
    
    if (this.strategy.enableMoonBag) {
      log.info(`   🌙 Moon Bag: ~${this.strategy.moonBagPercent}% held for extreme gains (10000%+)`);
    } else {
      log.info(`   ❌ No Moon Bag: Full exit after all ladder levels`);
    }
    
    // Show first few ladder levels
    this.strategy.ladderLevels.slice(0, 3).forEach((level, i) => {
      const trigger = level.triggerPercent + 100; // Convert to multiplier
              log.info(`   ${i+1}. ${trigger/100}x → Sell ${level.sellPercent}%`);
    });
    if (this.strategy.ladderLevels.length > 3) {
      log.info(`   ... and ${this.strategy.ladderLevels.length - 3} more levels`);
    }
    
    if (this.config.simulationMode) {
      log.info(`   🔍 Ladder position created in simulation mode`);
    } else {
      log.info(`   💎 LIVE LADDER POSITION CREATED - Diamond hands activated!`);
    }
  }

  private startPositionMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    log.info(`🔄 Starting ${this.strategy.name.toUpperCase()} position monitoring...`);

    // Use strategy-specific monitoring interval
    const monitoringInterval = this.strategy.monitoringIntervalMs;

    const intervalId = setInterval(async () => {
      if (this.activePositions.size === 0) {
        // No active positions, but keep monitoring
        return;
      }

      try {
        await this.checkPositions();
      } catch (error) {
        log.error(`Position monitoring error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, monitoringInterval);

    // Store interval ID for cleanup if needed
    (this as any).monitoringIntervalId = intervalId;
  }

  private async checkPositions(): Promise<void> {
    const now = new Date();
    const positionsToClose: string[] = [];

    for (const [coinAddress, position] of this.activePositions) {
      try {
        // Get real current price using PriceService
        const currentPrice = await this.getCurrentPrice(position);
        const currentValueETH = currentPrice * position.currentAmount;
        const totalReturnPercent = ((currentValueETH - position.entryPrice) / position.entryPrice) * 100;

        // Check for ladder level triggers
        await this.checkLadderLevels(position, currentPrice, totalReturnPercent);

        // Check stop loss (only if we haven't hit any profit levels yet)
        if (position.levelsHit.length === 0 && currentPrice <= position.stopLossTarget) {
          await this.executeStopLoss(position, currentPrice, now);
          positionsToClose.push(coinAddress);
          continue;
        }

        // Check max hold time
        if (now >= position.maxHoldTime) {
          await this.executeTimeLimit(position, currentPrice, now);
          positionsToClose.push(coinAddress);
          continue;
        }

        // Log current status with ladder details
        const realizedPercent = (position.realizedProfits / position.originalAmount) * 100;
        const unrealizedPercent = ((currentValueETH - position.currentAmount) / position.originalAmount) * 100;
        
        log.debug(`💎 ${position.coinSymbol} (${this.strategy.name}):`);
        log.debug(`   📊 Total Return: ${totalReturnPercent.toFixed(1)}%`);
        log.debug(`   💰 Realized: ${realizedPercent.toFixed(1)}% | Unrealized: ${unrealizedPercent.toFixed(1)}%`);
        log.debug(`   📈 Position: ${((position.currentAmount / position.originalAmount) * 100).toFixed(1)}% remaining`);
        log.debug(`   🎯 Levels Hit: ${position.levelsHit.length}/${this.strategy.ladderLevels.length}`);
        
        const priceChange = this.priceService.getPriceChange(coinAddress as Address, 30);
        if (priceChange) {
          const changeEmoji = priceChange.changeDirection === "UP" ? "📈" : priceChange.changeDirection === "DOWN" ? "📉" : "➡️";
          log.debug(`   ${changeEmoji} 30min change: ${priceChange.changePercent.toFixed(2)}%`);
        }
        
      } catch (error) {
        log.error(`Error checking ladder position ${coinAddress}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Remove closed positions
    positionsToClose.forEach(coinAddress => {
      this.activePositions.delete(coinAddress);
    });
  }

  private async getCurrentPrice(position: TradePosition): Promise<number> {
    try {
      // Get real price from PriceService
      const priceQuote = await this.priceService.getCurrentPrice(
        position.coinAddress as Address,
        position.currentAmount // Use current position size as reference amount
      );
      
      if (priceQuote.source === "ZORA_SDK") {
        log.debug(`📊 Real price for ${position.coinSymbol}: ${priceQuote.priceInETH.toFixed(6)} ETH (${priceQuote.confidence} confidence)`);
      } else {
        log.debug(`🎭 Simulated price for ${position.coinSymbol}: ${priceQuote.priceInETH.toFixed(6)} ETH`);
      }
      
      return priceQuote.priceInETH;
      
    } catch (error) {
      log.warn(`⚠️ Failed to get current price for ${position.coinSymbol}, using entry price: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to entry price if all else fails
      return position.entryPrice;
    }
  }

  private async checkLadderLevels(position: TradePosition, currentPrice: number, totalReturnPercent: number): Promise<void> {
    for (let i = 0; i < this.strategy.ladderLevels.length; i++) {
      const level = this.strategy.ladderLevels[i];
      
      // Skip if we already hit this level
      if (position.levelsHit.includes(i)) continue;
      
      // Check if we hit this level
      if (totalReturnPercent >= level.triggerPercent) {
        await this.executeLadderLevel(position, level, i, currentPrice);
      }
    }
  }

  private async executeLadderLevel(
    position: TradePosition, 
    level: { triggerPercent: number; sellPercent: number; description: string }, 
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

  private async executeStopLoss(position: TradePosition, currentPrice: number, now: Date): Promise<void> {
    log.warn(`🛡️ STOP LOSS triggered for ${position.coinSymbol} at ${currentPrice.toFixed(6)} ETH`);
    
    if (!this.config.simulationMode && this.config.enableSelling && position.currentAmount > 0.001) {
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

  private async executeTimeLimit(position: TradePosition, currentPrice: number, now: Date): Promise<void> {
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

  private checkExitConditions(
    position: TradePosition,
    currentPrice: number,
    now: Date
  ): "TAKE_PROFIT" | "STOP_LOSS" | "TIME_LIMIT" | null {
    // Check take profit
    if (currentPrice >= position.takeProfitTarget) {
      return "TAKE_PROFIT";
    }

    // Check stop loss
    if (currentPrice <= position.stopLossTarget) {
      return "STOP_LOSS";
    }

    // Check time limit
    if (now >= position.maxHoldTime) {
      return "TIME_LIMIT";
    }

    return null;
  }

  private async closePosition(
    coinAddress: string,
    exitPrice: number,
    exitReason: "TAKE_PROFIT" | "STOP_LOSS" | "TIME_LIMIT" | "MANUAL",
    exitTime: Date
  ): Promise<void> {
    const position = this.activePositions.get(coinAddress);
    if (!position) return;

    // Calculate profit/loss
    const profitLoss = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
    const profitLossETH = (exitPrice - position.entryPrice) * position.entryAmount;

    // Update position
    position.isActive = false;
    position.exitPrice = exitPrice;
    position.exitTime = exitTime;
    position.exitReason = exitReason;
    position.profitLoss = profitLoss;

    // Move to history
    this.positionHistory.push(position);

    // Log the exit
    const profitEmoji = profitLoss > 0 ? "📈" : "📉";
    const modeEmoji = this.config.simulationMode ? "🎭" : "💰";
    const modeText = this.config.simulationMode ? "[SIMULATION]" : "[LIVE TRADE]";
    
    log.warn(`${profitEmoji} ${modeEmoji} ${modeText} Closed position for ${position.coinSymbol}:`);
    log.warn(`   🚪 Exit Reason: ${exitReason}`);
    log.warn(`   💵 Exit Price: ${exitPrice} ETH`);
    log.warn(`   📊 Profit/Loss: ${profitLoss.toFixed(2)}% (${profitLossETH.toFixed(4)} ETH)`);
    log.warn(`   ⏱️  Hold Time: ${Math.round((exitTime.getTime() - position.entryTime.getTime()) / 60000)} minutes`);
    log.info(`   🎯 Ethos Score: ${position.ethosScore}`);

    if (this.config.simulationMode) {
      log.info(`   🎭 This was a simulated position - no real money was involved`);
      this.logSimulationSummary();
    } else {
      log.warn(`   🔄 Executing REAL sell order for ${position.coinSymbol}...`);
      log.warn(`   ⚠️  SELLING REAL TOKENS FOR REAL MONEY!`);
      
      // Execute actual sell transaction
      const tokenAmount = BigInt(Math.floor(parseFloat(position.entryAmount.toString()) / position.entryPrice * 1e18)); // Convert to token units
      
      const sellResult = await this.dexService.sellToken(
        position.coinAddress as Address,
        tokenAmount
      );
      
      if (sellResult.success) {
        log.warn(`   ✅ Sell transaction successful!`);
        log.warn(`   📝 TX Hash: ${sellResult.transactionHash}`);
        log.warn(`   💰 ETH Received: ${sellResult.amountOut}`);
      } else {
        log.error(`   ❌ Sell transaction failed: ${sellResult.error}`);
        log.error(`   🚨 Manual intervention may be required!`);
      }
    }
  }

  // Public methods for monitoring and control
  getActivePositions(): TradePosition[] {
    return Array.from(this.activePositions.values());
  }

  getPositionHistory(): TradePosition[] {
    return [...this.positionHistory];
  }

  async closeAllPositions(): Promise<void> {
    const now = new Date();
    for (const [coinAddress, position] of this.activePositions) {
      const currentPrice = await this.getCurrentPrice(position);
      await this.closePosition(coinAddress, currentPrice, "MANUAL", now);
    }
    this.activePositions.clear();
  }

  getStats(): {
    activePositions: number;
    totalTrades: number;
    winRate: number;
    avgProfitLoss: number;
  } {
    const totalTrades = this.positionHistory.length;
    const wins = this.positionHistory.filter(p => p.profitLoss && p.profitLoss > 0).length;
    const avgProfitLoss = totalTrades > 0 
      ? this.positionHistory.reduce((sum, p) => sum + (p.profitLoss || 0), 0) / totalTrades 
      : 0;

    return {
      activePositions: this.activePositions.size,
      totalTrades,
      winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
      avgProfitLoss,
    };
  }

  private logSimulationSummary(): void {
    if (!this.config.simulationMode) return;

    const stats = this.getStats();
    const totalSimulatedValue = this.positionHistory.reduce((sum, p) => sum + p.entryAmount, 0);
    const totalSimulatedProfitETH = this.positionHistory.reduce((sum, p) => {
      if (p.profitLoss && p.exitPrice) {
        return sum + ((p.exitPrice - p.entryPrice) * p.entryAmount);
      }
      return sum;
    }, 0);

    log.info(`📊 🎭 SIMULATION SUMMARY:`);
    log.info(`   📈 Total Trades: ${stats.totalTrades}`);
    log.warn(`   🎯 Win Rate: ${stats.winRate.toFixed(1)}%`);
    log.warn(`   📊 Avg P&L: ${stats.avgProfitLoss.toFixed(2)}%`);
    log.warn(`   💰 Total Simulated Investment: ${totalSimulatedValue.toFixed(4)} ETH`);
    log.warn(`   💵 Total Simulated Profit: ${totalSimulatedProfitETH.toFixed(4)} ETH`);
    log.info(`   🎭 Remember: This is simulation - no real money involved!`);
  }

  // Method to manually log full simulation report
  logFullSimulationReport(): void {
    if (!this.config.simulationMode) {
      log.info("⚠️  Not in simulation mode - cannot generate simulation report");
      return;
    }

    log.info(`\n🎭 ===== FULL SIMULATION REPORT =====`);
    this.logSimulationSummary();
    
    if (this.activePositions.size > 0) {
      log.info(`\n📋 Active Simulated Positions (${this.activePositions.size}):`);
      for (const position of this.activePositions.values()) {
        const currentPrice = this.simulateCurrentPrice(position);
        const unrealizedPL = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        log.info(`   ${position.coinSymbol}: ${unrealizedPL.toFixed(2)}% P&L (Score: ${position.ethosScore})`);
      }
    }

    if (this.positionHistory.length > 0) {
      log.info(`\n📜 Recent Closed Simulated Positions (last 5):`);
      const recent = this.positionHistory.slice(-5);
      for (const position of recent) {
        const pl = position.profitLoss || 0;
        const emoji = pl > 0 ? "📈" : "📉";
        log.info(`   ${emoji} ${position.coinSymbol}: ${pl.toFixed(2)}% | ${position.exitReason} | Score: ${position.ethosScore}`);
      }
    }
    
    log.info(`🎭 ===== END SIMULATION REPORT =====\n`);
  }
} 