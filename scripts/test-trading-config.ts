#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test trading configuration and safety checks
 */

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { DexService } from "../src/services/dex-service.ts";

async function testTradingConfig() {
  try {
    console.log("🧪 TESTING TRADING CONFIGURATION\n");

    await load({ export: true });
    let config;
    
    try {
      config = Config.load();
    } catch (error) {
      console.error(`❌ Configuration Error: ${error instanceof Error ? error.message : String(error)}`);
      Deno.exit(1);
    }

    // Test 1: Basic Configuration
    console.log("📋 Test 1: Basic Configuration");
    console.log(`✅ Min Ethos Score: ${config.minEthosScore}`);
    console.log(`✅ Trade Amount: ${config.tradeAmountEth} ETH`);
    console.log(`✅ Max Positions: ${config.maxPositions}`);
    console.log(`✅ Take Profit: +${config.takeProfitPercent}%`);
    console.log(`✅ Stop Loss: -${config.stopLossPercent}%`);
    console.log(`✅ Max Hold Time: ${config.maxHoldTimeMinutes} minutes`);

    // Test 2: Safety Configuration
    console.log("\n📋 Test 2: Safety Configuration");
    console.log(`   Simulation Mode: ${config.simulationMode ? '🎭 ENABLED (Safe)' : '💰 DISABLED (Live Trading!)'}`);
    console.log(`   Dry Run Mode: ${config.dryRunMode ? '🧪 ENABLED (Safe)' : '⚡ DISABLED (Real Transactions!)'}`);
    console.log(`   Enable Buying: ${config.enableBuying ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`   Enable Selling: ${config.enableSelling ? '✅ ENABLED' : '❌ DISABLED'}`);

    // Test 3: Risk Management
    console.log("\n📋 Test 3: Risk Management");
    console.log(`   Max Gas Price: ${config.maxGasPriceGwei} gwei`);
    console.log(`   Max Slippage: ${config.maxSlippagePercent}%`);
    console.log(`   Min Liquidity: ${config.minLiquidityEth} ETH`);
    console.log(`   Transaction Deadline: ${config.transactionDeadlineMinutes} minutes`);

    // Test 4: Wallet Configuration
    console.log("\n📋 Test 4: Wallet Configuration");
    if (config.privateKey) {
      console.log(`✅ Private Key: Configured (${config.privateKey.length} characters)`);
    } else {
      console.log(`❌ Private Key: Not configured`);
    }

    // Test 5: DEX Service Status
    console.log("\n📋 Test 5: DEX Service Status");
    const dexService = new DexService(config);
    const tradingStatus = dexService.getTradingStatus();
    
    console.log(`   Ready for Trading: ${tradingStatus.ready ? '✅ YES' : '❌ NO'}`);
    
    if (tradingStatus.wallet) {
      console.log(`   Wallet Address: ${tradingStatus.wallet}`);
    }
    
    if (tradingStatus.issues.length > 0) {
      console.log(`   Issues:`);
      tradingStatus.issues.forEach(issue => {
        console.log(`      • ${issue}`);
      });
    }

    // Test 6: Safety Analysis
    console.log("\n📋 Test 6: Safety Analysis");
    
    const isFullyLive = !config.simulationMode && !config.dryRunMode && 
                        (config.enableBuying || config.enableSelling);
    
    if (isFullyLive) {
      console.log("🚨 DANGER: LIVE TRADING MODE ACTIVE!");
      console.log("   ⚠️  Real money will be spent");
      console.log("   ⚠️  Real transactions will be executed");
      console.log("   ⚠️  You can lose money quickly");
      
      if (config.tradeAmountEth > 0.01) {
        console.log(`   ⚠️  Large trade amount: ${config.tradeAmountEth} ETH`);
      }
      
      if (config.maxPositions > 5) {
        console.log(`   ⚠️  High position limit: ${config.maxPositions} positions`);
      }
      
    } else {
      console.log("✅ SAFE: Bot is in simulation/dry-run mode");
      console.log("   🎭 No real money will be spent");
      console.log("   🧪 Perfect for testing and learning");
    }

    // Test 7: Recommendations
    console.log("\n📋 Test 7: Recommendations");
    
    if (!tradingStatus.ready) {
      console.log("💡 TO ENABLE LIVE TRADING:");
      console.log("   1. Add PRIVATE_KEY to your .env file");
      console.log("   2. Set SIMULATION_MODE=false");
      console.log("   3. Set DRY_RUN_MODE=false");
      console.log("   4. Set ENABLE_BUYING=true and/or ENABLE_SELLING=true");
      console.log("   ⚠️  WARNING: Only do this with small amounts initially!");
    } else {
      console.log("✅ Trading is ready to go!");
      console.log("💡 SAFETY REMINDERS:");
      console.log("   • Start with very small trade amounts (0.001 ETH)");
      console.log("   • Monitor the bot constantly when live trading");
      console.log("   • Have stop-loss strategies you're comfortable with");
      console.log("   • Keep emergency procedures ready");
    }

    // Test 8: Current Mode Summary
    console.log("\n🎯 CURRENT MODE SUMMARY:");
    if (config.simulationMode) {
      console.log("📊 MODE: SIMULATION");
      console.log("   • Detects real events");
      console.log("   • Uses real Ethos scores");
      console.log("   • Tracks hypothetical profits/losses");
      console.log("   • NO REAL MONEY AT RISK");
    } else if (config.dryRunMode) {
      console.log("🧪 MODE: DRY RUN");
      console.log("   • All checks and validations run");
      console.log("   • Would execute real transactions");
      console.log("   • But dry run prevents actual execution");
      console.log("   • NO REAL MONEY AT RISK");
    } else if (tradingStatus.ready) {
      console.log("💰 MODE: LIVE TRADING");
      console.log("   • REAL MONEY WILL BE SPENT");
      console.log("   • REAL TRANSACTIONS WILL EXECUTE");
      console.log("   • YOU CAN LOSE MONEY QUICKLY");
      console.log("   • MONITOR CONSTANTLY");
    } else {
      console.log("⚙️  MODE: INCOMPLETE SETUP");
      console.log("   • Configuration needs completion");
      console.log("   • Check issues above");
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testTradingConfig();
} 