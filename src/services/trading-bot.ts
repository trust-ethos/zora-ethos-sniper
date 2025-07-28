import * as log from "@std/log";
import type { BotConfig } from "../config/config.ts";
import type { EthosService } from "./ethos-service.ts";
import type { ZoraCoinCreatedEvent } from "./zora-listener.ts";
import type { ZoraProfile } from "./zora-profile-service.ts";

export interface TradePosition {
  coinAddress: string;
  coinName: string;
  coinSymbol: string;
  entryPrice: number;
  entryAmount: number;
  entryTime: Date;
  ethosScore: number;
  ethosAddress: string;
  takeProfitTarget: number;
  stopLossTarget: number;
  maxHoldTime: Date;
  isActive: boolean;
  exitPrice?: number;
  exitTime?: Date;
  exitReason?: "TAKE_PROFIT" | "STOP_LOSS" | "TIME_LIMIT" | "MANUAL";
  profitLoss?: number;
}

export class TradingBot {
  private activePositions: Map<string, TradePosition> = new Map();
  private positionHistory: TradePosition[] = [];
  private isMonitoring = false;

  constructor(
    private config: BotConfig,
    private ethosService: EthosService
  ) {}

  async evaluateAndTrade(
    event: ZoraCoinCreatedEvent,
    ethosScore: number,
    ethosAddress: string,
    creatorProfile?: ZoraProfile
  ): Promise<boolean> {
    try {
      const modePrefix = this.config.simulationMode ? "🎭 [SIMULATION]" : "💰 [LIVE]";
      
      log.info(`${modePrefix} 🤖 Evaluating trade for ${event.name} (${event.symbol})`);
      log.info(`   📊 Ethos Score: ${ethosScore} from ${ethosAddress}`);
      log.info(`   🎯 Risk Assessment: ${this.ethosService.getRiskAssessment(ethosScore)}`);
      log.info(`   🔗 Coin Address: ${event.coin}`);
      log.info(`   👤 Creator: ${event.caller}`);

      // Check if we should trade based on various criteria
      const shouldTrade = await this.shouldExecuteTrade(event, ethosScore);
      
      if (!shouldTrade) {
        log.info(`   ❌ Trade evaluation failed, skipping...`);
        return false;
      }

      if (this.config.simulationMode) {
        log.warn(`   ✅ Trade criteria met! SIMULATING trade with ${this.config.maxInvestmentEth} ETH`);
        log.warn(`   🎭 This is simulation mode - no real money will be spent`);
      } else {
        log.warn(`   ✅ Trade criteria met! EXECUTING REAL trade with ${this.config.maxInvestmentEth} ETH`);
        log.warn(`   ⚠️  This will spend REAL money from your wallet!`);
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
    // Check Ethos score threshold (already checked in listener, but double-check)
    if (!this.ethosService.meetsScoreThreshold(ethosScore, this.config.minEthosScore)) {
      log.info(`   ❌ Ethos score ${ethosScore} below threshold ${this.config.minEthosScore}`);
      return false;
    }

    // Check if we already have too many active positions
    if (this.activePositions.size >= 5) { // Max 5 concurrent positions
      log.info(`   ❌ Too many active positions (${this.activePositions.size}/5)`);
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
    const entryPrice = 0.001; // Simulated entry price (in ETH)
    const entryAmount = this.config.maxInvestmentEth;

    const position: TradePosition = {
      coinAddress: event.coin.toLowerCase(),
      coinName: event.name,
      coinSymbol: event.symbol,
      entryPrice,
      entryAmount,
      entryTime: now,
      ethosScore,
      ethosAddress,
      takeProfitTarget: entryPrice * (1 + this.config.takeProfitPercentage / 100),
      stopLossTarget: entryPrice * (1 - this.config.stopLossPercentage / 100),
      maxHoldTime: new Date(now.getTime() + this.config.maxHoldTimeMinutes * 60000),
      isActive: true,
    };

    this.activePositions.set(position.coinAddress, position);

    const modeEmoji = this.config.simulationMode ? "🎭" : "💰";
    const modeText = this.config.simulationMode ? "[SIMULATION]" : "[LIVE TRADE]";
    
    log.warn(`${modeEmoji} ${modeText} Created position for ${position.coinName}:`);
    log.warn(`   💵 Entry Price: ${position.entryPrice} ETH`);
    log.warn(`   📊 Amount: ${position.entryAmount} ETH`);
    log.warn(`   📈 Take Profit: ${position.takeProfitTarget} ETH (+${this.config.takeProfitPercentage}%)`);
    log.warn(`   📉 Stop Loss: ${position.stopLossTarget} ETH (-${this.config.stopLossPercentage}%)`);
    log.warn(`   ⏰ Max Hold Time: ${position.maxHoldTime.toISOString()}`);
    
    if (this.config.simulationMode) {
      log.info(`   🎯 Ethos Score: ${position.ethosScore} (${position.ethosAddress})`);
      log.info(`   🔍 This is a simulated position - tracking for learning purposes`);
    }
  }

  private startPositionMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    log.info("🔄 Starting position monitoring...");

    // Check positions every 30 seconds
    const monitoringInterval = 30000;

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
        // Simulate current price (in a real implementation, you'd fetch from DEX)
        const currentPrice = this.simulateCurrentPrice(position);
        
        // Check exit conditions
        const exitReason = this.checkExitConditions(position, currentPrice, now);
        
        if (exitReason) {
          await this.closePosition(coinAddress, currentPrice, exitReason, now);
          positionsToClose.push(coinAddress);
        } else {
          // Log current status periodically
          const profitLoss = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
          log.debug(`📊 ${position.coinSymbol}: ${profitLoss.toFixed(2)}% P/L, Current: ${currentPrice} ETH`);
        }
      } catch (error) {
        log.error(`Error checking position ${coinAddress}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Remove closed positions
    positionsToClose.forEach(coinAddress => {
      this.activePositions.delete(coinAddress);
    });
  }

  private simulateCurrentPrice(position: TradePosition): number {
    // Simulate price movement (in a real implementation, fetch from DEX/oracle)
    const timeElapsed = Date.now() - position.entryTime.getTime();
    const volatility = 0.0001; // Simulated volatility
    const randomChange = (Math.random() - 0.5) * volatility * (timeElapsed / 60000); // Change over time
    
    return Math.max(position.entryPrice + randomChange, 0.0001); // Minimum price floor
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
      log.info(`   🔄 Executing REAL sell order for ${position.coinSymbol}...`);
      // Here you would execute the actual sell order in a real implementation
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
      const currentPrice = this.simulateCurrentPrice(position);
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

    log.warn(`📊 🎭 SIMULATION SUMMARY:`);
    log.warn(`   📈 Total Trades: ${stats.totalTrades}`);
    log.warn(`   🎯 Win Rate: ${stats.winRate.toFixed(1)}%`);
    log.warn(`   📊 Avg P&L: ${stats.avgProfitLoss.toFixed(2)}%`);
    log.warn(`   💰 Total Simulated Investment: ${totalSimulatedValue.toFixed(4)} ETH`);
    log.warn(`   💵 Total Simulated Profit: ${totalSimulatedProfitETH.toFixed(4)} ETH`);
    log.warn(`   🎭 Remember: This is simulation - no real money involved!`);
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