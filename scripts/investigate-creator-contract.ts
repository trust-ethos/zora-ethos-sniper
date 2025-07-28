#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Script to investigate the actual creator contract vs what we're monitoring
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { Config } from "../src/config/config.ts";

async function investigateContracts() {
  try {
    console.log("🔍 Investigating Creator Contracts...\n");

    // Load environment variables
    await load({ export: true });
    const config = Config.load();

    // Create viem client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    const currentFactory = config.zoraFactoryAddress;
    const possibleCreatorContract = "0xbdbebd58cc8153ce74530bb342427579315915b2" as Address;
    const exampleCoin = "0xdcfd90871435a90c944b3e0b7cd8ecfcfb4d5104" as Address;

    console.log("📋 Contract Analysis:");
    console.log(`   Current Factory: ${currentFactory}`);
    console.log(`   Possible Creator: ${possibleCreatorContract}`);
    console.log(`   Example Coin: ${exampleCoin}\n`);

    // Get current block for range
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 1000n; // Last 1000 blocks

    console.log("🔍 Checking event activity in last 1000 blocks...\n");

    // Check current factory activity
    console.log("📊 Current Factory Activity:");
    try {
      const currentFactoryLogs = await publicClient.getLogs({
        address: currentFactory as Address,
        fromBlock,
        toBlock: currentBlock,
      });
      console.log(`   Events: ${currentFactoryLogs.length}`);
      
      if (currentFactoryLogs.length > 0) {
        const recent = currentFactoryLogs.slice(-3);
        console.log("   Recent events:");
        for (const log of recent) {
          console.log(`     Block ${log.blockNumber}: ${log.topics[0]}`);
        }
      }
    } catch (error) {
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("");

    // Check possible creator contract activity
    console.log("📊 Possible Creator Contract Activity:");
    try {
      const creatorContractLogs = await publicClient.getLogs({
        address: possibleCreatorContract,
        fromBlock,
        toBlock: currentBlock,
      });
      console.log(`   Events: ${creatorContractLogs.length}`);
      
      if (creatorContractLogs.length > 0) {
        const recent = creatorContractLogs.slice(-5);
        console.log("   Recent events:");
        for (const log of recent) {
          console.log(`     Block ${log.blockNumber}: TX ${log.transactionHash}`);
          console.log(`     Topic: ${log.topics[0]}`);
          console.log(`     Data length: ${log.data.length}`);
          console.log("");
        }
      }
    } catch (error) {
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check the example coin's creation transaction
    console.log("🪙 Example Coin Analysis:");
    try {
      // Get the creation transaction for the example coin
      const code = await publicClient.getCode({ address: exampleCoin });
      console.log(`   Has code: ${code && code !== "0x" ? "YES" : "NO"}`);
      console.log(`   Address: ${exampleCoin}`);
      
    } catch (error) {
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("\n💡 RECOMMENDATIONS:");
    
    // Compare activity levels
    const currentFactoryLogs = await publicClient.getLogs({
      address: currentFactory as Address,
      fromBlock,
      toBlock: currentBlock,
    }).catch(() => []);
    
    const creatorContractLogs = await publicClient.getLogs({
      address: possibleCreatorContract,
      fromBlock,
      toBlock: currentBlock,
    }).catch(() => []);

    if (creatorContractLogs.length > currentFactoryLogs.length) {
      console.log("✅ The possible creator contract has MORE activity than current factory");
      console.log("   Consider switching to monitor this contract instead");
    } else if (currentFactoryLogs.length > 0) {
      console.log("⚠️  Current factory still has activity");
      console.log("   Both contracts might be relevant - consider monitoring both");
    } else {
      console.log("❓ Need more investigation to determine the correct contract");
    }

    console.log("\n🔧 NEXT STEPS:");
    console.log("1. Check BaseScan for the actual creation transaction of the example coin");
    console.log("2. Look at what events the possible creator contract emits");
    console.log("3. Consider using the Zora SDK which knows the correct contracts");
    console.log("4. Update our monitoring to use the most active/relevant contract");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  investigateContracts();
} 