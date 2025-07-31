#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import * as log from "@std/log";

async function testWarnLogging() {
  console.log("🔍 TESTING WARN LEVEL QUALIFYING USER LOGS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  await load({ export: true });

  // Set log level to WARN to test what shows up
  log.setup({
    handlers: {
      console: new log.ConsoleHandler("WARN"),
    },
    loggers: {
      default: {
        level: "WARN",
        handlers: ["console"],
      },
    },
  });

  console.log("📊 LOG LEVEL SET TO WARN - Testing new qualifying user logs:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // Simulate the new WARN logs that will show for qualifying users
  log.warn("🎯 FOUND QUALIFYING CREATOR: magicianafk (@magicianafk)");
  log.warn("   📊 Credibility Score: 1456 (Low Risk)");
  log.warn("   💰 Attempting to buy: 0.0025 ETH worth");
  log.warn("   🎭 Strategy: Degen (DEGEN)");
  
  console.log("");
  
  // Test a skipped qualifying creator
  log.warn("🎯 FOUND QUALIFYING CREATOR: anothercreator (@anothercreator)");
  log.warn("   📊 Credibility Score: 1800 (Low Risk)");
  log.warn("   💰 Attempting to buy: 0.0025 ETH worth");
  log.warn("   🎭 Strategy: Degen (DEGEN)");
  log.warn("   ❌ SKIPPING QUALIFYING CREATOR: Trade evaluation failed");
  log.warn("   🚫 Possible reasons: Max positions reached, insufficient funds, or safety checks");
  
  console.log("");
  
  // Test successful buy
  log.warn("🎯 FOUND QUALIFYING CREATOR: successfulcreator (@successfulcreator)");
  log.warn("   📊 Credibility Score: 2200 (Low Risk)");
  log.warn("   💰 Attempting to buy: 0.0025 ETH worth");
  log.warn("   🎭 Strategy: Degen (DEGEN)");
  log.warn("💰 LIVE TRADING: Buying 0.0025 ETH worth of creator coins");
  log.warn("✅ Zora SDK trade successful!");
  log.warn("🔗 Transaction Hash: 0x1234567890abcdef...");

  // These should NOT show in WARN mode
  log.info("ℹ️  INFO: This should NOT appear (discovery/filtering)");
  log.debug("🔍 DEBUG: This should NOT appear");

  console.log("");
  console.log("📊 EXPECTED WARN MODE BEHAVIOR:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ WARN level now shows:");
  console.log("   • 🎯 FOUND QUALIFYING CREATOR with score and buy amount");
  console.log("   • 💰 Actual buy/sell execution attempts");
  console.log("   • ✅ Successful transaction results");
  console.log("   • ❌ Skipped qualifying creators with reasons");
  console.log("   • 🔗 Transaction hashes and BaseScan links");
  console.log("");
  console.log("❌ WARN level does NOT show:");
  console.log("   • User discovery and filtering (moved to INFO)");
  console.log("   • Profile checks and Twitter lookups");
  console.log("   • Simulation setup and configuration");
  console.log("");
  console.log("🎯 RESULT: Clean, focused view of actual trading activity!");
}

if (import.meta.main) {
  testWarnLogging();
}