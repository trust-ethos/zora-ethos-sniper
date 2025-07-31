#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";

async function explainSellingStrategies() {
  console.log("📊 SELLING STRATEGIES EXPLANATION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  await load({ export: true });
  const config = Config.load();

  console.log("🎯 **CURRENT CONFIGURATION:**");
  console.log(`   Take Profit: +${config.takeProfitPercent}%`);
  console.log(`   Stop Loss: -${config.stopLossPercent}%`);
  console.log(`   Max Hold Time: ${config.maxHoldTimeMinutes} minutes`);
  console.log(`   Trade Amount: ${config.tradeAmountEth} ETH`);
  console.log("");

  console.log("🚀 **HOW IT WORKS:**");
  console.log("");

  console.log("📈 **1. POSITION CREATION:**");
  console.log("   • Bot detects qualifying creator coin");
  console.log("   • Executes buy using Zora SDK");
  console.log("   • Calculates targets based on entry price:");
  
  const exampleEntryPrice = 0.001;
  const takeProfitTarget = exampleEntryPrice * (1 + config.takeProfitPercent / 100);
  const stopLossTarget = exampleEntryPrice * (1 - config.stopLossPercent / 100);
  
  console.log(`     Entry Price: ${exampleEntryPrice} ETH`);
  console.log(`     Take Profit: ${takeProfitTarget.toFixed(6)} ETH (+${config.takeProfitPercent}%)`);
  console.log(`     Stop Loss: ${stopLossTarget.toFixed(6)} ETH (-${config.stopLossPercent}%)`);
  console.log("");

  console.log("🔄 **2. CONTINUOUS MONITORING:**");
  console.log("   • Runs every 30 seconds");
  console.log("   • Checks current token price vs targets");
  console.log("   • Currently uses SIMULATED prices*");
  console.log("   • Triggers sell when conditions are met");
  console.log("");

  console.log("🎯 **3. EXIT CONDITIONS:**");
  console.log("   • **TAKE_PROFIT**: Price ≥ take profit target");
  console.log("   • **STOP_LOSS**: Price ≤ stop loss target");
  console.log("   • **TIME_LIMIT**: Held longer than max hold time");
  console.log("   • **MANUAL**: Manually closed by user");
  console.log("");

  console.log("💰 **4. SELL EXECUTION:**");
  console.log("   • Uses Zora SDK `tradeCoin()` for selling");
  console.log("   • Automatically handles permit signatures");
  console.log("   • Converts creator coins back to ETH");
  console.log("   • Logs profit/loss and performance stats");
  console.log("");

  console.log("⚠️  **IMPORTANT LIMITATIONS:**");
  console.log("   • **Price Data**: Currently uses simulated prices");
  console.log("   • **Real Implementation**: Needs DEX/oracle integration");
  console.log("   • **Slippage**: May affect actual exit prices");
  console.log("   • **Gas Costs**: Factor into final P/L");
  console.log("");

  console.log("🔧 **CONFIGURATION OPTIONS:**");
  console.log("   Environment Variables:");
  console.log(`   • TAKE_PROFIT_PERCENT=${config.takeProfitPercent}    # Take profit percentage`);
  console.log(`   • STOP_LOSS_PERCENT=${config.stopLossPercent}        # Stop loss percentage`);
  console.log(`   • MAX_HOLD_TIME_MINUTES=${config.maxHoldTimeMinutes}    # Max hold time`);
  console.log(`   • TRADE_AMOUNT_ETH=${config.tradeAmountEth}       # Amount per trade`);
  console.log("");

  console.log("📊 **EXAMPLE SCENARIOS:**");
  console.log("");

  // Scenario 1: Take Profit
  console.log("✅ **Scenario 1: Take Profit Hit**");
  console.log(`   Entry: ${exampleEntryPrice} ETH`);
  console.log(`   Current: ${takeProfitTarget.toFixed(6)} ETH`);
  console.log(`   Action: SELL (Take Profit)`);
  console.log(`   Result: +${config.takeProfitPercent}% profit`);
  console.log("");

  // Scenario 2: Stop Loss
  console.log("❌ **Scenario 2: Stop Loss Hit**");
  console.log(`   Entry: ${exampleEntryPrice} ETH`);
  console.log(`   Current: ${stopLossTarget.toFixed(6)} ETH`);
  console.log(`   Action: SELL (Stop Loss)`);
  console.log(`   Result: -${config.stopLossPercent}% loss`);
  console.log("");

  // Scenario 3: Time Limit
  console.log("⏰ **Scenario 3: Time Limit**");
  console.log(`   Entry: ${exampleEntryPrice} ETH`);
  console.log(`   Time Held: ${config.maxHoldTimeMinutes} minutes`);
  console.log(`   Action: SELL (Time Limit)`);
  console.log(`   Result: Variable P/L`);
  console.log("");

  console.log("🎭 **SIMULATION vs LIVE:**");
  console.log("   • **Simulation Mode**: Tracks positions without real money");
  console.log("   • **Live Mode**: Executes real buy/sell transactions");
  console.log("   • **Both modes**: Same strategy logic and monitoring");
  console.log("");

  console.log("*Currently price monitoring uses simulation. For production,");
  console.log(" you'd need to integrate with real DEX price feeds or oracles.");
}

if (import.meta.main) {
  explainSellingStrategies();
}