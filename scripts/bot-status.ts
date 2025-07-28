#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Bot status checker and simulation report generator
 * Usage: deno run --allow-net --allow-env --allow-read scripts/bot-status.ts
 */

import { load } from "@std/dotenv";
import * as log from "@std/log";
import { Config } from "../src/config/config.ts";
import { EthosService } from "../src/services/ethos-service.ts";
import { TradingBot } from "../src/services/trading-bot.ts";

async function main() {
  try {
    // Load environment variables
    await load({ export: true });
    
    // Simple console logging for this script
    log.setup({
      handlers: {
        console: new log.ConsoleHandler("INFO"),
      },
      loggers: {
        default: {
          level: "INFO",
          handlers: ["console"],
        },
      },
    });

    console.log("🔍 Bot Status Checker\n");

    // Load configuration
    const config = Config.load();
    
    // Display current configuration
    console.log("⚙️  CURRENT CONFIGURATION:");
    console.log(`   Mode: ${config.simulationMode ? "🎭 SIMULATION" : "💰 LIVE TRADING"}`);
    console.log(`   Min Ethos Score: ${config.minEthosScore}`);
    console.log(`   Max Investment: ${config.maxInvestmentEth} ETH`);
    console.log(`   Take Profit: +${config.takeProfitPercentage}%`);
    console.log(`   Stop Loss: -${config.stopLossPercentage}%`);
    console.log(`   Max Hold Time: ${config.maxHoldTimeMinutes} minutes`);
    console.log(`   RPC URL: ${config.baseRpcUrl}`);
    console.log(`   Factory Address: ${config.zoraFactoryAddress}\n`);

    if (!config.simulationMode) {
      console.log("⚠️  WARNING: Bot is configured for LIVE TRADING!");
      console.log("💰 Real money will be used if the bot is running!\n");
    } else {
      console.log("✅ Bot is in safe SIMULATION MODE\n");
    }

    // Test Ethos API connectivity
    console.log("🔗 Testing Ethos API connectivity...");
    const ethosService = new EthosService();
    
    try {
      // Try a simple API call to check connectivity
      const testScore = await ethosService.getScoreByAddress("0x0000000000000000000000000000000000000000");
      console.log("✅ Ethos API is accessible");
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        console.log("✅ Ethos API is accessible (got expected 404 for test address)");
      } else {
        console.log(`❌ Ethos API connectivity issue: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Create a trading bot instance to check simulation status
    const tradingBot = new TradingBot(config, ethosService);
    
    if (config.simulationMode) {
      console.log("\n📊 SIMULATION STATUS:");
      const stats = tradingBot.getStats();
      
      if (stats.totalTrades === 0) {
        console.log("   No simulated trades yet");
        console.log("   🎭 Start the bot to begin collecting simulation data");
      } else {
        tradingBot.logFullSimulationReport();
      }
    }

    console.log("\n💡 HOW TO USE:");
    console.log("   🚀 Start bot: deno task start");
    console.log("   🔧 Development: deno task dev");
    console.log("   📊 Check status: deno run --allow-net --allow-env --allow-read scripts/bot-status.ts");
    console.log("   🧪 Test Ethos: deno run --allow-net scripts/test-ethos.ts");

    if (config.simulationMode) {
      console.log("\n🎭 SIMULATION MODE TIPS:");
      console.log("   • Run the bot for a while to collect data on real coin launches");
      console.log("   • Monitor which creators have high Ethos scores");
      console.log("   • Check win rates and profit potential before going live");
      console.log("   • Set SIMULATION_MODE=false only when you're confident");
    } else {
      console.log("\n⚠️  LIVE TRADING MODE REMINDERS:");
      console.log("   • Make sure you have ETH in your wallet");
      console.log("   • Start with small MAX_INVESTMENT_ETH amounts");
      console.log("   • Monitor the bot closely when first starting");
      console.log("   • Have stop-loss and take-profit levels you're comfortable with");
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
} 