#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import * as log from "@std/log";

async function testLoggingLevels() {
  console.log("🔍 TESTING LOGGING LEVEL CHANGES");
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

  console.log("📊 LOG LEVEL SET TO WARN - Only warnings should appear below:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // Test various log levels
  log.debug("🔍 DEBUG: This should NOT appear");
  log.info("ℹ️  INFO: This should NOT appear (user detection, Ethos lookup, etc.)");
  log.warn("⚠️  WARN: This SHOULD appear (actual trading activity)");
  log.error("❌ ERROR: This should appear");

  console.log("");
  console.log("📊 EXPECTED BEHAVIOR:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ WARN level should ONLY show:");
  console.log("   • Actual buy/sell executions");
  console.log("   • Real money transaction alerts");
  console.log("   • Trading qualifications (when user meets criteria)");
  console.log("   • Ladder triggers and position updates");
  console.log("   • Stop loss and time limit executions");
  console.log("");
  console.log("❌ WARN level should NOT show:");
  console.log("   • User discovery and filtering");
  console.log("   • Ethos score lookups");
  console.log("   • Profile checks");
  console.log("   • Simulation mode activities");
  console.log("   • Bot initialization messages");
  console.log("");
  console.log("🎯 RESULT: Now you'll only see WARN logs for actual trading actions!");
}

if (import.meta.main) {
  testLoggingLevels();
}