import type { Address } from "viem";

export interface LadderLevel {
  triggerPercent: number;    // e.g., 100% = 2x
  sellPercent: number;       // e.g., 50% = sell half remaining position
  description: string;
}

export interface TradingStrategy {
  name: string;
  description: string;
  
  // Entry criteria
  minEthosScore: number;
  maxInvestmentEth: number;
  tradeAmountEth: number;
  maxPositions: number;
  
  // Risk management
  stopLossPercent: number;
  maxHoldTimeMinutes: number;
  
  // Ladder configuration
  ladderLevels: LadderLevel[];
  
  // Trading behavior
  aggressiveness: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE" | "DEGEN";
  
  // Special features
  enableMoonBag: boolean;     // Keep final % for extreme gains
  moonBagPercent: number;     // % to hold indefinitely
  
  // Risk tolerances
  maxSlippagePercent: number;
  maxGasPriceGwei: number;
  
  // Monitoring frequency
  monitoringIntervalMs: number;
  priceCacheExpiryMs: number;
}

/**
 * Conservative Strategy - Capital Preservation Focus
 * Perfect for risk-averse traders who want steady gains
 */
export const CONSERVATIVE_STRATEGY: TradingStrategy = {
  name: "Conservative",
  description: "Capital preservation with steady profit taking",
  
  // Higher standards for entry
  minEthosScore: 1226,
  maxInvestmentEth: 0.1,
  tradeAmountEth: 0.005,  // Smaller positions
  maxPositions: 3,
  
  // Tighter risk management
  stopLossPercent: 30,      // Tighter stop loss
  maxHoldTimeMinutes: 720,  // 12 hours max hold
  
  // Conservative ladder - take profits early and often
  ladderLevels: [
    { triggerPercent: 50,   sellPercent: 40, description: "1.5x - Early profit taking" },
    { triggerPercent: 100,  sellPercent: 30, description: "2x - Secure gains" },
    { triggerPercent: 150,  sellPercent: 20, description: "2.5x - More profits" },
    { triggerPercent: 250,  sellPercent: 15, description: "3.5x - Conservative exit" },
    { triggerPercent: 400,  sellPercent: 10, description: "5x - Final exit" },
  ],
  
  aggressiveness: "CONSERVATIVE",
  enableMoonBag: false,     // No moon bag - take all profits
  moonBagPercent: 0,
  
  maxSlippagePercent: 3,    // Lower slippage tolerance
  maxGasPriceGwei: 15,
  
  monitoringIntervalMs: 20000,  // Check every 20 seconds
  priceCacheExpiryMs: 20000,
};

/**
 * Balanced Strategy - Default Sensible Approach
 * Good balance of risk and reward
 */
export const BALANCED_STRATEGY: TradingStrategy = {
  name: "Balanced",
  description: "Balanced risk/reward with moderate moon bag",
  
  minEthosScore: 1226,
  maxInvestmentEth: 0.2,
  tradeAmountEth: 0.01,
  maxPositions: 5,
  
  stopLossPercent: 50,      // Standard stop loss
  maxHoldTimeMinutes: 1440, // 24 hours
  
  // Balanced ladder - reasonable profit taking
  ladderLevels: [
    { triggerPercent: 100,  sellPercent: 25, description: "2x - Secure 25%" },
    { triggerPercent: 200,  sellPercent: 20, description: "3x - Take more profits" },
    { triggerPercent: 400,  sellPercent: 15, description: "5x - Steady exit" },
    { triggerPercent: 900,  sellPercent: 12, description: "10x - Big gains exit" },
    { triggerPercent: 1900, sellPercent: 8,  description: "20x - Moon territory" },
    { triggerPercent: 4900, sellPercent: 5,  description: "50x - Keep moon bag" },
  ],
  
  aggressiveness: "BALANCED",
  enableMoonBag: true,
  moonBagPercent: 5,        // Keep 5% for extreme gains
  
  maxSlippagePercent: 5,
  maxGasPriceGwei: 20,
  
  monitoringIntervalMs: 30000,  // Check every 30 seconds
  priceCacheExpiryMs: 30000,
};

/**
 * Aggressive Strategy - Higher Risk, Higher Reward
 * For experienced traders comfortable with volatility
 */
export const AGGRESSIVE_STRATEGY: TradingStrategy = {
  name: "Aggressive",
  description: "Higher risk tolerance with significant moon bag",
  
  minEthosScore: 1226,       // Lower standards, more opportunities
  maxInvestmentEth: 0.5,
  tradeAmountEth: 0.02,     // Larger positions
  maxPositions: 8,
  
  stopLossPercent: 60,      // Wider stop loss
  maxHoldTimeMinutes: 2880, // 48 hours
  
  // Aggressive ladder - let winners run longer
  ladderLevels: [
    { triggerPercent: 100,  sellPercent: 20, description: "2x - Light profit taking" },
    { triggerPercent: 300,  sellPercent: 15, description: "4x - Some profits" },
    { triggerPercent: 900,  sellPercent: 12, description: "10x - Let it run" },
    { triggerPercent: 1900, sellPercent: 8,  description: "20x - Small exit" },
    { triggerPercent: 4900, sellPercent: 5,  description: "50x - Tiny exit" },
    { triggerPercent: 9900, sellPercent: 3,  description: "100x - Keep riding" },
  ],
  
  aggressiveness: "AGGRESSIVE",
  enableMoonBag: true,
  moonBagPercent: 15,       // Keep 15% for extreme gains
  
  maxSlippagePercent: 8,    // Higher slippage tolerance
  maxGasPriceGwei: 30,
  
  monitoringIntervalMs: 15000,  // Check every 15 seconds
  priceCacheExpiryMs: 15000,
};

/**
 * DEGEN Strategy - Maximum Moon Bag Potential
 * For true diamond hands who want to capture 10000%+ moves
 */
export const DEGEN_STRATEGY: TradingStrategy = {
  name: "Degen",
  description: "Maximum moon bag strategy for 10000%+ potential",
  
  minEthosScore: 1600,       // Cast a wide net
  maxInvestmentEth: 0.015,
  tradeAmountEth: 0.015,     // Significant positions
  maxPositions: 1,
  
  stopLossPercent: 70,      // Very wide stop loss
  maxHoldTimeMinutes: 15, // 5 days (!!)
  
  // DEGEN ladder - minimal profit taking, maximum moon bag
  ladderLevels: [
    { triggerPercent: 50,  sellPercent: 30, description: "2x - Light profit taking" },
    { triggerPercent: 100,  sellPercent: 25, description: "2x - Light profit taking" },
    { triggerPercent: 200,  sellPercent: 20, description: "3x - Tiny exit to secure investment" },
    { triggerPercent: 900,  sellPercent: 10, description: "10x - Minimal profit taking" },
    { triggerPercent: 1900, sellPercent: 5,  description: "20x - Keep riding" },
    { triggerPercent: 4900, sellPercent: 3,  description: "50x - Still holding" },
    { triggerPercent: 9900, sellPercent: 2,  description: "100x - Diamond hands" },
    { triggerPercent: 24900,sellPercent: 5,  description: "250x - TRUE DEGEN" },
  ],
  
  aggressiveness: "DEGEN",
  enableMoonBag: true,
  moonBagPercent: 5,       // Keep 25% for EXTREME gains
  
  maxSlippagePercent: 50,   // Very high slippage tolerance
  maxGasPriceGwei: 50,
  
  monitoringIntervalMs: 10000,  // Check every 10 seconds (frequent)
  priceCacheExpiryMs: 10000,
};

/**
 * HIGH CONVICTION Strategy - For Premium Creators Only
 * Very selective but larger positions
 */
export const HIGH_CONVICTION_STRATEGY: TradingStrategy = {
  name: "High Conviction",
  description: "Selective high-ethos creators with large positions",
  
  minEthosScore: 1500,      // Very high standards
  maxInvestmentEth: 2.0,
  tradeAmountEth: 0.1,      // Large positions
  maxPositions: 3,          // Very focused
  
  stopLossPercent: 40,      // Reasonable protection
  maxHoldTimeMinutes: 4320, // 3 days
  
  // High conviction ladder - bigger moon bag
  ladderLevels: [
    { triggerPercent: 150,  sellPercent: 20, description: "2.5x - Minimal early exit" },
    { triggerPercent: 400,  sellPercent: 15, description: "5x - Some profits" },
    { triggerPercent: 900,  sellPercent: 10, description: "10x - Let conviction run" },
    { triggerPercent: 1900, sellPercent: 8,  description: "20x - Still believing" },
    { triggerPercent: 4900, sellPercent: 5,  description: "50x - High conviction pays" },
    { triggerPercent: 9900, sellPercent: 3,  description: "100x - Moon mission" },
  ],
  
  aggressiveness: "AGGRESSIVE",
  enableMoonBag: true,
  moonBagPercent: 20,       // 20% moon bag for high conviction plays
  
  maxSlippagePercent: 6,
  maxGasPriceGwei: 25,
  
  monitoringIntervalMs: 25000,  // Less frequent - high conviction holds
  priceCacheExpiryMs: 25000,
};

/**
 * Available trading strategies
 */
export const AVAILABLE_STRATEGIES: Record<string, TradingStrategy> = {
  "conservative": CONSERVATIVE_STRATEGY,
  "balanced": BALANCED_STRATEGY,
  "aggressive": AGGRESSIVE_STRATEGY,
  "degen": DEGEN_STRATEGY,
  "high-conviction": HIGH_CONVICTION_STRATEGY,
};

/**
 * Get strategy by name with fallback to balanced
 */
export function getStrategy(name: string): TradingStrategy {
  const strategy = AVAILABLE_STRATEGIES[name.toLowerCase()];
  if (!strategy) {
    console.warn(`⚠️  Unknown strategy '${name}', falling back to 'balanced'`);
    return BALANCED_STRATEGY;
  }
  return strategy;
}

/**
 * List available strategies
 */
export function listStrategies(): void {
  console.log("📊 AVAILABLE TRADING STRATEGIES:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  Object.entries(AVAILABLE_STRATEGIES).forEach(([key, strategy]) => {
    console.log(`\n🎯 ${strategy.name.toUpperCase()} (--strategy=${key})`);
    console.log(`   📝 ${strategy.description}`);
    console.log(`   🎭 Aggressiveness: ${strategy.aggressiveness}`);
    console.log(`   🎯 Min Ethos: ${strategy.minEthosScore} | Trade Amount: ${strategy.tradeAmountEth} ETH`);
    console.log(`   🛡️  Stop Loss: ${strategy.stopLossPercent}% | Max Hold: ${Math.round(strategy.maxHoldTimeMinutes/60)}h`);
    console.log(`   🎯 Ladder Levels: ${strategy.ladderLevels.length} | Moon Bag: ${strategy.enableMoonBag ? strategy.moonBagPercent + '%' : 'No'}`);
  });
  
  console.log("\n💡 USAGE EXAMPLES:");
  console.log("   deno task start --strategy=conservative");
  console.log("   deno task start --strategy=degen");
  console.log("   deno task start --strategy=high-conviction");
}

/**
 * Validate strategy configuration
 */
export function validateStrategy(strategy: TradingStrategy): string[] {
  const errors: string[] = [];
  
  if (strategy.minEthosScore < 0 || strategy.minEthosScore > 3000) {
    errors.push("minEthosScore must be between 0 and 3000");
  }
  
  if (strategy.tradeAmountEth <= 0 || strategy.tradeAmountEth > 10) {
    errors.push("tradeAmountEth must be between 0 and 10 ETH");
  }
  
  if (strategy.stopLossPercent <= 0 || strategy.stopLossPercent >= 100) {
    errors.push("stopLossPercent must be between 0 and 100");
  }
  
  if (strategy.ladderLevels.length === 0) {
    errors.push("Strategy must have at least one ladder level");
  }
  
  // Validate ladder levels are in ascending order
  for (let i = 1; i < strategy.ladderLevels.length; i++) {
    if (strategy.ladderLevels[i].triggerPercent <= strategy.ladderLevels[i-1].triggerPercent) {
      errors.push("Ladder levels must be in ascending order of triggerPercent");
    }
  }
  
  return errors;
}