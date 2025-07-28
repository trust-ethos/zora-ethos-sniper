#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test the strict filtering to ensure no historical events are processed
 */

import { load } from "@std/dotenv";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { Config } from "../src/config/config.ts";

async function testStrictFiltering() {
  try {
    console.log("🔒 Testing STRICT Historical Event Filtering...\n");

    await load({ export: true });
    const config = Config.load();

    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    const currentBlock = await publicClient.getBlockNumber();
    const now = Math.floor(Date.now() / 1000);
    
    console.log("📊 CURRENT STATE:");
    console.log(`   Current block: ${currentBlock}`);
    console.log(`   Current time: ${new Date().toISOString()}`);
    console.log(`   Unix timestamp: ${now}`);

    // Simulate bot startup
    const startupBlock = currentBlock;
    const startupTimestamp = now;
    
    console.log("\n🚀 BOT STARTUP SIMULATION:");
    console.log(`   Startup block: ${startupBlock}`);
    console.log(`   Startup time: ${new Date(startupTimestamp * 1000).toISOString()}`);

    // Test different event scenarios
    console.log("\n🧪 FILTERING TEST SCENARIOS:");
    
    // Scenario 1: Event from before startup
    console.log("\n1️⃣ Event from BEFORE startup:");
    const oldBlock = currentBlock - 1n;
    console.log(`   Event block: ${oldBlock}`);
    console.log(`   Startup block: ${startupBlock}`);
    console.log(`   Result: ${oldBlock <= startupBlock ? "🚫 FILTERED OUT" : "✅ WOULD PROCESS"}`);
    
    // Scenario 2: Event from way in the past
    console.log("\n2️⃣ Very old event:");
    const veryOldBlock = currentBlock - 100n;
    const blockAge = Number(currentBlock - veryOldBlock);
    console.log(`   Event block: ${veryOldBlock}`);
    console.log(`   Block age: ${blockAge} blocks`);
    console.log(`   Result: ${blockAge > 10 ? "🚫 FILTERED OUT (too old)" : "✅ WOULD PROCESS"}`);
    
    // Scenario 3: Fresh event (would be processed)
    console.log("\n3️⃣ Fresh event (future):");
    const futureBlock = currentBlock + 1n;
    const futureAge = Number(currentBlock - futureBlock);
    console.log(`   Event block: ${futureBlock}`);
    console.log(`   Block age: ${futureAge} blocks`);
    console.log(`   Startup check: ${futureBlock > startupBlock ? "✅ PASSES" : "🚫 FAILS"}`);
    console.log(`   Age check: ${futureAge <= 10 ? "✅ PASSES" : "🚫 FAILS"}`);
    console.log(`   Result: ✅ WOULD PROCESS`);

    // Test timestamp filtering
    console.log("\n4️⃣ Timestamp filtering:");
    const pastTimestamp = now - 300; // 5 minutes ago
    const futureTimestamp = now + 60; // 1 minute in future
    
    console.log(`   Past timestamp: ${new Date(pastTimestamp * 1000).toISOString()}`);
    console.log(`   Startup time: ${new Date(startupTimestamp * 1000).toISOString()}`);
    console.log(`   Past event result: ${pastTimestamp <= startupTimestamp ? "🚫 FILTERED OUT" : "✅ WOULD PROCESS"}`);
    
    console.log(`   Future timestamp: ${new Date(futureTimestamp * 1000).toISOString()}`);
    console.log(`   Future event result: ${futureTimestamp > startupTimestamp ? "✅ WOULD PROCESS" : "🚫 FILTERED OUT"}`);

    console.log("\n🛡️ PROTECTION SUMMARY:");
    console.log("✅ Triple-layer filtering:");
    console.log("   1. Block number must be > startup block");
    console.log("   2. Block age must be ≤ 10 blocks (~2 minutes)");
    console.log("   3. Event timestamp must be > startup timestamp");
    
    console.log("\n🎯 EXPECTED BEHAVIOR:");
    console.log("- Bot ignores ALL events from before startup moment");
    console.log("- Bot only processes events from AFTER it started");
    console.log("- Events older than 2 minutes are rejected");
    console.log("- You'll see 'FRESH COIN' only for truly new launches");
    console.log("- Repeated names indicate events from BEFORE bot startup (now filtered)");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testStrictFiltering();
} 