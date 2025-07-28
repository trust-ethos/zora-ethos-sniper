#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test script to check if we can detect Zora coin creation events
 * Usage: deno run --allow-net --allow-env --allow-read scripts/test-events.ts [startBlock] [endBlock]
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { base } from "viem/chains";
import { Config } from "../src/config/config.ts";

// Zora Factory events from the documentation
const COIN_CREATED_V3_EVENT = parseAbiItem(
  "event CoinCreated(address indexed caller, address indexed payoutRecipient, address indexed platformReferrer, address currency, string uri, string name, string symbol, address coin, address pool, string version)"
);

const COIN_CREATED_V4_EVENT = parseAbiItem(
  "event CoinCreatedV4(address indexed caller, address indexed payoutRecipient, address indexed platformReferrer, address currency, string uri, string name, string symbol, address coin, bytes32 poolKey, bytes32 poolKeyHash, string version)"
);

async function testEventDetection() {
  try {
    console.log("🧪 Testing Zora Event Detection...\n");

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
    console.log(`🏭 Factory address: ${config.zoraFactoryAddress}\n`);

    // Parse command line arguments for block range
    const args = Deno.args;
    let startBlock: bigint;
    let endBlock: bigint;

    if (args.length >= 2) {
      startBlock = BigInt(args[0]);
      endBlock = BigInt(args[1]);
    } else {
      // Default to last 500 blocks (RPC limit)
      startBlock = currentBlock - 500n;
      endBlock = currentBlock;
    }

    console.log(`🔍 Searching for events from block ${startBlock} to ${endBlock}...`);

    // Get ALL events from the factory (generic approach)
    console.log("📋 Fetching all factory events...");
    const allLogs = await publicClient.getLogs({
      address: config.zoraFactoryAddress as Address,
      fromBlock: startBlock,
      toBlock: endBlock,
    });

    // Filter for coin creation events based on actual topic hash
    const coinCreationEvents = allLogs.filter(log => 
      log.topics[0] === "0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81"
    );

    console.log(`\n📊 RESULTS:`);
    console.log(`   Total Factory Events: ${allLogs.length}`);
    console.log(`   Coin Creation Events: ${coinCreationEvents.length}\n`);

    if (coinCreationEvents.length === 0) {
      console.log("❌ No events found in the specified range");
      console.log("💡 Try expanding the block range or check if events exist on basescan");
      return;
    }

    // Display events
    console.log("🪙 COIN CREATION EVENTS:\n");
    
    for (const [index, log] of coinCreationEvents.entries()) {
      const logWithArgs = log as any;
      const args = logWithArgs.args;
      
      if (!args) {
        console.log(`❌ Event ${index + 1}: Missing args property`);
        console.log(`   Block: ${log.blockNumber}`);
        console.log(`   TX: ${log.transactionHash}`);
        console.log(`   Topics: ${JSON.stringify(log.topics)}`);
        console.log(`   Data length: ${log.data.length} chars\n`);
        continue;
      }

      console.log(`🪙 Event ${index + 1}:`);
      console.log(`   Block: ${log.blockNumber}`);
      console.log(`   TX: ${log.transactionHash}`);
      console.log(`   Name: ${args.name}`);
      console.log(`   Symbol: ${args.symbol}`);
      console.log(`   Coin: ${args.coin}`);
      console.log(`   Creator: ${args.caller}`);
      console.log(`   Payout: ${args.payoutRecipient}`);
      console.log(`   Version: ${args.version}`);
      
      if (args.pool) {
        console.log(`   Pool (V3): ${args.pool}`);
      }
      if (args.poolKey) {
        console.log(`   Pool Key (V4): ${args.poolKey}`);
      }
      
      console.log("");
    }

    // Test the specific block the user mentioned
    if (args.length === 0) {
      console.log("🔍 Testing specific block 33473406 (mentioned by user)...");
      
      const specificLogs = await publicClient.getLogs({
        address: config.zoraFactoryAddress as Address,
        events: [COIN_CREATED_V3_EVENT, COIN_CREATED_V4_EVENT],
        fromBlock: 33473406n,
        toBlock: 33473406n,
      });
      
      if (specificLogs.length > 0) {
        console.log(`✅ Found ${specificLogs.length} event(s) in block 33473406!`);
        for (const log of specificLogs) {
          const logWithArgs = log as any;
          console.log(`   Event: ${logWithArgs.args?.name || 'Unknown'} (${logWithArgs.args?.symbol || 'Unknown'})`);
        }
      } else {
        console.log("❌ No events found in block 33473406");
      }
    }

    console.log("\n✅ Event detection test completed!");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testEventDetection();
} 