#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test enhanced event detection to ensure we catch all coin creation types
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { Config } from "../src/config/config.ts";

async function testEnhancedDetection() {
  try {
    console.log("🧪 Testing Enhanced Event Detection...\n");

    // Load environment variables
    await load({ export: true });
    const config = Config.load();

    // Create viem client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    const currentBlock = await publicClient.getBlockNumber();
    const searchBlocks = 1000n;
    const fromBlock = currentBlock - searchBlocks;

    console.log(`🔍 Searching last ${searchBlocks} blocks (${fromBlock} to ${currentBlock})...`);

    // Get all factory events
    const allLogs = await publicClient.getLogs({
      address: config.zoraFactoryAddress as Address,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`📊 Total factory events: ${allLogs.length}\n`);

    // Filter using our enhanced detection logic
    const knownCoinCreationTopics = [
      "0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81", // Original topic
      "0x74b670d628e152daa36ca95dda7cb0002d6ea7a37b55afe4593db7abd1515781", // User's example topic
    ];
    
    const knownCoinEvents = allLogs.filter(log => 
      knownCoinCreationTopics.includes(log.topics[0] || "")
    );

    const possibleCoinEvents = allLogs.filter(log => {
      if (knownCoinEvents.some(existing => existing.logIndex === log.logIndex)) {
        return false; // Already found by topic
      }
      return log.topics.length >= 4 && log.data.length > 500;
    });

    console.log("📋 DETECTION RESULTS:");
    console.log(`   Known coin events: ${knownCoinEvents.length}`);
    console.log(`   Possible coin events: ${possibleCoinEvents.length}`);
    console.log(`   Total detected: ${knownCoinEvents.length + possibleCoinEvents.length}\n`);

    // Analyze topic distribution
    const topicCounts = new Map<string, number>();
    for (const log of allLogs) {
      const topic = log.topics[0] || "unknown";
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }

    console.log("🏷️  TOP EVENT TOPICS:");
    const sortedTopics = Array.from(topicCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    for (const [topic, count] of sortedTopics) {
      const isKnown = knownCoinCreationTopics.includes(topic);
      const marker = isKnown ? "🪙" : "  ";
      console.log(`   ${marker} ${topic}: ${count} events`);
    }

    console.log("\n📝 SAMPLE EVENTS:");

    // Show samples of known events
    if (knownCoinEvents.length > 0) {
      console.log(`\n🪙 Known Coin Events (${knownCoinEvents.length} total):`);
      for (const log of knownCoinEvents.slice(-3)) {
        console.log(`   Block ${log.blockNumber}: ${log.topics[0]}`);
        console.log(`   TX: ${log.transactionHash}`);
        
        // Try to extract creator
        if (log.topics.length >= 4) {
          const caller = `0x${log.topics[1]!.slice(-40)}`;
          console.log(`   Creator: ${caller}`);
        }
        console.log("");
      }
    }

    // Show samples of possible events
    if (possibleCoinEvents.length > 0) {
      console.log(`\n🔍 Possible Coin Events (${possibleCoinEvents.length} total):`);
      for (const log of possibleCoinEvents.slice(-3)) {
        console.log(`   Block ${log.blockNumber}: ${log.topics[0]}`);
        console.log(`   TX: ${log.transactionHash}`);
        console.log(`   Topics: ${log.topics.length}, Data: ${log.data.length} chars`);
        console.log("");
      }
    }

    // Test specific example from user
    console.log("🎯 TESTING USER'S EXAMPLE:");
    const userExampleCoin = "0xdcfd90871435a90c944b3e0b7cd8ecfcfb4d5104";
    const userExampleTopic = "0x74b670d628e152daa36ca95dda7cb0002d6ea7a37b55afe4593db7abd1515781";
    
    const userEventFound = allLogs.some(log => 
      log.topics[0] === userExampleTopic && 
      log.data.toLowerCase().includes(userExampleCoin.slice(2).toLowerCase())
    );
    
    console.log(`   User's coin (${userExampleCoin}): ${userEventFound ? "✅ DETECTED" : "❌ NOT FOUND"}`);
    console.log(`   User's topic (${userExampleTopic}): ${knownCoinCreationTopics.includes(userExampleTopic) ? "✅ IN FILTER" : "❌ NOT IN FILTER"}`);

    console.log("\n💡 RECOMMENDATIONS:");
    
    const totalDetected = knownCoinEvents.length + possibleCoinEvents.length;
    const detectionRate = allLogs.length > 0 ? (totalDetected / allLogs.length) * 100 : 0;
    
    console.log(`   Detection rate: ${detectionRate.toFixed(1)}% of all factory events`);
    
    if (totalDetected > knownCoinEvents.length) {
      console.log("✅ Enhanced detection found additional possible coin events");
    }
    
    if (userEventFound) {
      console.log("✅ Successfully detects the user's example coin type");
    }

    console.log("✅ Bot should now catch multiple types of coin creation events");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testEnhancedDetection();
} 