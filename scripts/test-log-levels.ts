#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test script to demonstrate different log levels
 */

import * as log from "@std/log";

function setupLogLevel(level: string) {
  log.setup({
    handlers: {
      console: new log.ConsoleHandler(level as any),
    },
    loggers: {
      default: {
        level: level as any,
        handlers: ["console"],
      },
    },
  });
}

function demonstrateLogLevel(level: string) {
  console.log(`\n🔧 LOG_LEVEL=${level}`);
  console.log("".padEnd(50, "="));
  
  setupLogLevel(level);
  
  // Simulate different types of messages
  log.debug("🔍 DEBUG: Checking creator profile for 0x123...");
  log.info("📊 INFO: Found creator profile details");
  
  // Example 1: Qualifying creator
  log.warn("🪙 FRESH COIN: TestCoin (TEST) - 15s old");
  log.warn("   🐦 Checking Ethos for @alice...");
  log.warn("   📊 Ethos score: 850 (MEDIUM)");
  log.warn("   ✅ QUALIFIES! Score 850 ≥ 750");
  log.warn("💰 [SIMULATION] Created position for TestCoin:");
  log.warn("   💵 Entry Price: 0.001 ETH");
  log.warn("📈 [SIMULATION] Closed position for TestCoin:");
  log.warn("   📊 Profit/Loss: +150.5% (0.0234 ETH)");
  
  // Example 2: Non-qualifying creator
  log.warn("🪙 FRESH COIN: BadCoin (BAD) - 8s old");
  log.warn("   ❌ No Twitter - SKIPPED (Twitter required)");
  
  // Example 3: Low score creator
  log.warn("🪙 FRESH COIN: LowCoin (LOW) - 22s old");
  log.warn("   🐦 Checking Ethos for @lowuser...");
  log.warn("   📊 Ethos score: 300 (VERY_HIGH)");
  log.warn("   ❌ Score too low - SKIPPED (300 < 750)");
  
  // Example 4: Filtered old events
  log.warn("🚫 FILTERED: Event too old - 25 blocks ago (OldCoin)");
  
  log.error("❌ ERROR: Failed to connect to RPC endpoint");
}

function main() {
  console.log("🎯 ZORA ETHOS SNIPER - LOG LEVEL DEMONSTRATION");
  console.log("This shows what you'll see at different LOG_LEVEL settings\n");

  // Show what each log level displays
  demonstrateLogLevel("DEBUG");  // Shows everything
  demonstrateLogLevel("INFO");   // Shows info and above
  demonstrateLogLevel("WARN");   // Shows only trades/important events
  demonstrateLogLevel("ERROR");  // Shows only errors

  console.log("\n💡 RECOMMENDATIONS:");
  console.log("   LOG_LEVEL=DEBUG  - Full debugging (very verbose)");
  console.log("   LOG_LEVEL=INFO   - Normal operation (recommended for testing)");
  console.log("   LOG_LEVEL=WARN   - Focused mode (shows all creator activity + trades) ⭐");
  console.log("   LOG_LEVEL=ERROR  - Only errors (too quiet for trading)");
  
  console.log("\n🔧 TO USE:");
  console.log("   1. Edit your .env file");
  console.log("   2. Set LOG_LEVEL=WARN for focused trading (recommended)");
  console.log("   3. Set LOG_LEVEL=INFO for detailed mode");
  console.log("   4. Run: deno task start");
}

if (import.meta.main) {
  main();
} 