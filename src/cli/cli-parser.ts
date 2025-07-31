import { parseArgs } from "@std/cli/parse-args";
import { getStrategy, listStrategies, validateStrategy, AVAILABLE_STRATEGIES, type TradingStrategy } from "../strategies/trading-strategy.ts";

export interface CliOptions {
  strategy: TradingStrategy;
  help: boolean;
  listStrategies: boolean;
  dryRun: boolean;
  simulation: boolean;
  verbose: boolean;
  
  // Strategy overrides
  minEthosScore?: number;
  tradeAmount?: number;
  maxPositions?: number;
  stopLoss?: number;
}

export function parseCliArgs(args: string[]): CliOptions {
  const parsed = parseArgs(args, {
    boolean: ["help", "list-strategies", "dry-run", "simulation", "verbose"],
    string: ["strategy"],
    alias: {
      h: "help",
      s: "strategy", 
      d: "dry-run",
      sim: "simulation",
      v: "verbose",
      l: "list-strategies"
    },
    default: {
      strategy: "balanced",
      "dry-run": false,
      simulation: false,
      verbose: false,
      help: false,
      "list-strategies": false
    }
  });

  // Handle help and list commands
  if (parsed.help) {
    showHelp();
    Deno.exit(0);
  }

  if (parsed["list-strategies"]) {
    listStrategies();
    Deno.exit(0);
  }

  // Get the strategy
  const strategy = getStrategy(parsed.strategy as string);

  // Apply any overrides from command line
  const overriddenStrategy = applyOverrides(strategy, parsed);

  // Validate the final strategy
  const errors = validateStrategy(overriddenStrategy);
  if (errors.length > 0) {
    console.error("❌ Strategy validation errors:");
    errors.forEach(error => console.error(`   • ${error}`));
    Deno.exit(1);
  }

  return {
    strategy: overriddenStrategy,
    help: parsed.help,
    listStrategies: parsed["list-strategies"],
    dryRun: parsed["dry-run"],
    simulation: parsed.simulation,
    verbose: parsed.verbose,
    
    // Store original override values
    minEthosScore: parsed["min-ethos"] ? parseInt(parsed["min-ethos"] as string) : undefined,
    tradeAmount: parsed["trade-amount"] ? parseFloat(parsed["trade-amount"] as string) : undefined,
    maxPositions: parsed["max-positions"] ? parseInt(parsed["max-positions"] as string) : undefined,
    stopLoss: parsed["stop-loss"] ? parseFloat(parsed["stop-loss"] as string) : undefined,
  };
}

function applyOverrides(strategy: TradingStrategy, parsed: any): TradingStrategy {
  const overridden = { ...strategy };
  
  if (parsed["min-ethos"]) {
    overridden.minEthosScore = parseInt(parsed["min-ethos"]);
    console.log(`🎯 Override: Min Ethos Score → ${overridden.minEthosScore}`);
  }
  
  if (parsed["trade-amount"]) {
    overridden.tradeAmountEth = parseFloat(parsed["trade-amount"]);
    console.log(`💰 Override: Trade Amount → ${overridden.tradeAmountEth} ETH`);
  }
  
  if (parsed["max-positions"]) {
    overridden.maxPositions = parseInt(parsed["max-positions"]);
    console.log(`📊 Override: Max Positions → ${overridden.maxPositions}`);
  }
  
  if (parsed["stop-loss"]) {
    overridden.stopLossPercent = parseFloat(parsed["stop-loss"]);
    console.log(`🛡️  Override: Stop Loss → ${overridden.stopLossPercent}%`);
  }

  return overridden;
}

function showHelp(): void {
  console.log(`
🤖 ZORA ETHOS SNIPER - Advanced Trading Bot

USAGE:
  deno task start [OPTIONS]

STRATEGY OPTIONS:
  -s, --strategy <name>         Trading strategy to use (default: balanced)
  -l, --list-strategies         List all available strategies and exit

EXECUTION OPTIONS:
  -d, --dry-run                 Dry run mode (no real transactions)
      --simulation              Simulation mode (simulated prices)
  -v, --verbose                 Verbose logging (DEBUG level)

STRATEGY OVERRIDES:
      --min-ethos <score>       Override minimum Ethos score (0-3000)
      --trade-amount <eth>      Override trade amount in ETH (0-10)
      --max-positions <num>     Override max concurrent positions (1-20)
      --stop-loss <percent>     Override stop loss percentage (0-100)

EXAMPLES:
  # Conservative trading with high standards
  deno task start --strategy=conservative --min-ethos=1500

  # Degen mode with larger positions
  deno task start --strategy=degen --trade-amount=0.1

  # High conviction strategy in dry run mode
  deno task start --strategy=high-conviction --dry-run

  # Custom balanced approach
  deno task start --strategy=balanced --min-ethos=1000 --stop-loss=40

  # List all available strategies
  deno task start --list-strategies

AVAILABLE STRATEGIES:
  conservative     - Capital preservation focus, tight risk management
  balanced         - Good risk/reward balance with moderate moon bag  
  aggressive       - Higher risk tolerance, larger moon bag potential
  degen            - Maximum moon bag strategy for 10000%+ gains
  high-conviction  - Selective high-ethos creators, large positions

SAFETY NOTES:
  • Always test with --dry-run first
  • Start with small trade amounts  
  • Check your wallet balance before trading
  • Monitor positions actively during volatile periods
  • Each strategy has different risk profiles

CONFIGURATION:
  See config.example.env for environment variable setup
  `);
}

export function displaySelectedStrategy(strategy: TradingStrategy): void {
  console.log("🎯 SELECTED TRADING STRATEGY:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 Strategy: ${strategy.name.toUpperCase()}`);
  console.log(`📝 ${strategy.description}`);
  console.log(`🎭 Aggressiveness: ${strategy.aggressiveness}`);
  console.log("");
  
  console.log("🎯 ENTRY CRITERIA:");
  console.log(`   • Min Ethos Score: ${strategy.minEthosScore}`);
  console.log(`   • Trade Amount: ${strategy.tradeAmountEth} ETH`);
  console.log(`   • Max Positions: ${strategy.maxPositions}`);
  console.log("");
  
  console.log("🛡️  RISK MANAGEMENT:");
  console.log(`   • Stop Loss: ${strategy.stopLossPercent}%`);
  console.log(`   • Max Hold Time: ${Math.round(strategy.maxHoldTimeMinutes/60)} hours`);
  console.log(`   • Max Slippage: ${strategy.maxSlippagePercent}%`);
  console.log("");
  
  console.log("📈 LADDER CONFIGURATION:");
  strategy.ladderLevels.forEach((level, i) => {
    const trigger = level.triggerPercent + 100; // Convert to multiplier
    console.log(`   ${i+1}. ${trigger/100}x gain → Sell ${level.sellPercent}% (${level.description})`);
  });
  
  if (strategy.enableMoonBag) {
    console.log(`   🌙 Moon Bag: ${strategy.moonBagPercent}% held for extreme gains (10000%+)`);
  } else {
    console.log(`   ❌ No Moon Bag: Full exit after ladder levels`);
  }
  
  console.log("");
  console.log("⚡ MONITORING:");
  console.log(`   • Check Frequency: Every ${strategy.monitoringIntervalMs/1000} seconds`);
  console.log(`   • Price Cache: ${strategy.priceCacheExpiryMs/1000} seconds`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}