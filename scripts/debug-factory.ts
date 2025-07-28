#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Debug script to check what events the Zora Factory is actually emitting
 * Usage: deno run --allow-net --allow-env --allow-read scripts/debug-factory.ts [blockNumber]
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { Config } from "../src/config/config.ts";

async function debugFactory() {
  try {
    console.log("🔍 Debugging Zora Factory Events...\n");

    // Load environment variables
    await load({ export: true });
    const config = Config.load();

    // Create viem client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    // Get current block
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`📡 Current block: ${currentBlock}`);
    console.log(`🏭 Factory address: ${config.zoraFactoryAddress}`);
    console.log(`🔗 RPC URL: ${config.baseRpcUrl}\n`);

    // Parse command line arguments
    const args = Deno.args;
    let targetBlock: bigint;

    if (args.length >= 1) {
      targetBlock = BigInt(args[0]);
    } else {
      targetBlock = 33473406n; // The block the user mentioned
    }

    console.log(`🎯 Checking block ${targetBlock} for ANY events from factory...\n`);

    // Get ALL events from the factory for this block (no event filter)
    const allLogs = await publicClient.getLogs({
      address: config.zoraFactoryAddress as Address,
      fromBlock: targetBlock,
      toBlock: targetBlock,
    });

    console.log(`📊 Found ${allLogs.length} total events from factory in block ${targetBlock}\n`);

    if (allLogs.length === 0) {
      console.log("❌ No events found from factory in this block");
      console.log("🔍 Let's check a broader range...\n");
      
      // Try a broader range
      const broadStart = targetBlock - 50n;
      const broadEnd = targetBlock + 50n;
      
      console.log(`🔍 Checking blocks ${broadStart} to ${broadEnd}...`);
      
      const broadLogs = await publicClient.getLogs({
        address: config.zoraFactoryAddress as Address,
        fromBlock: broadStart,
        toBlock: broadEnd,
      });
      
      console.log(`📊 Found ${broadLogs.length} total events in range ${broadStart}-${broadEnd}\n`);
      
      if (broadLogs.length > 0) {
        console.log("🎉 Found some events! Analyzing...\n");
        
        for (const [index, log] of broadLogs.entries()) {
          console.log(`📝 Event ${index + 1}:`);
          console.log(`   Block: ${log.blockNumber}`);
          console.log(`   TX: ${log.transactionHash}`);
          console.log(`   Topics: ${JSON.stringify(log.topics)}`);
          console.log(`   Data: ${log.data}`);
          console.log("");
        }
      }
    } else {
      console.log("🎉 Found events! Analyzing...\n");
      
      for (const [index, log] of allLogs.entries()) {
        console.log(`📝 Event ${index + 1}:`);
        console.log(`   Block: ${log.blockNumber}`);
        console.log(`   TX: ${log.transactionHash}`);
        console.log(`   Topics: ${JSON.stringify(log.topics)}`);
        console.log(`   Data: ${log.data}`);
        console.log("");
      }
    }

    // Let's also check if the factory address has any recent activity at all
    console.log("🔍 Checking last 100 blocks for any factory activity...");
    
    const recentStart = currentBlock - 100n;
    const recentEnd = currentBlock;
    
    try {
      const recentLogs = await publicClient.getLogs({
        address: config.zoraFactoryAddress as Address,
        fromBlock: recentStart,
        toBlock: recentEnd,
      });
      
      console.log(`📊 Found ${recentLogs.length} events in last 100 blocks`);
      
      if (recentLogs.length > 0) {
        console.log("✅ Factory is active! Recent events:");
        for (const log of recentLogs.slice(-3)) { // Show last 3 events
          console.log(`   Block ${log.blockNumber}: TX ${log.transactionHash}`);
        }
      } else {
        console.log("⚠️  No recent activity from factory - address might be wrong");
      }
    } catch (error) {
      console.error(`❌ Error checking recent activity: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("\n✅ Factory debugging completed!");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  debugFactory();
} 