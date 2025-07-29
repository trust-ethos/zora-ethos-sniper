#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Investigate Zora Trading on Base
 * Find out how creator coins actually trade on Base
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

// Your creator coin
const CREATOR_COIN = "0x1ffdd7a3ca67a8bc50a3db8d4ca4c3c790e70e17";

// Zora contracts on Base
const ZORA_FACTORY = "0x777777751622c0d3258f214F9DF38E35BF45baF3";

// Potential Zora trading contracts to investigate
const POTENTIAL_ZORA_CONTRACTS = [
  "0x777777C338D93e2C7adf08D102d45CA7CC4Ed021", // Common Zora pattern
  "0x7777777F279eba3d3Ad8F4E708545291A6fDBA8B", // Another pattern
  "0x04E2516A2c207E84a1839755675dfd8eF6302F0a", // Zora Protocol Rewards
  "0x777777751622c0d3258f214F9DF38E35BF45baF3", // Factory (we know this one)
];

async function investigateZoraTrading() {
  try {
    console.log("🔍 INVESTIGATING ZORA TRADING ON BASE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎯 Creator Coin: ${CREATOR_COIN}`);
    console.log("");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    // 1. Look for recent creator coin transactions
    console.log("📋 1. RECENT CREATOR COIN ACTIVITY:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock - 5000n; // Last ~5000 blocks
      
      // Look for any transfers of the creator coin
      const transferLogs = await publicClient.getLogs({
        address: CREATOR_COIN as `0x${string}`,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        fromBlock: fromBlock,
        toBlock: latestBlock
      });
      
      console.log(`   Found ${transferLogs.length} transfers in last 5000 blocks`);
      
      if (transferLogs.length > 0) {
        console.log("   Recent transfers:");
        transferLogs.slice(-3).forEach((log, i) => {
          console.log(`     ${i+1}. Block ${log.blockNumber}`);
          console.log(`        From: ${log.args?.from}`);
          console.log(`        To: ${log.args?.to}`);
          console.log(`        Value: ${log.args?.value}`);
          console.log(`        Tx: ${log.transactionHash}`);
        });
      } else {
        console.log("   ⚠️  No recent transfer activity");
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to check transfers: ${error}`);
    }

    // 2. Check interactions with known Zora contracts
    console.log("\n📋 2. ZORA CONTRACT INTERACTIONS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for (const contractAddr of POTENTIAL_ZORA_CONTRACTS) {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock - 1000n;
        
        // Check for any events from these contracts
        const logs = await publicClient.getLogs({
          address: contractAddr as `0x${string}`,
          fromBlock: fromBlock,
          toBlock: latestBlock
        });
        
        console.log(`   ${contractAddr}: ${logs.length} events`);
        
        if (logs.length > 0) {
          console.log(`     Recent events:`);
          logs.slice(-2).forEach((log, i) => {
            console.log(`       ${i+1}. Topic: ${log.topics[0]?.slice(0, 18)}...`);
            console.log(`          Block: ${log.blockNumber}`);
          });
        }
        
      } catch (error) {
        console.log(`   ${contractAddr}: ❌ Error checking`);
      }
    }

    // 3. Look for creator coin creation transaction
    console.log("\n📋 3. CREATOR COIN CREATION ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      // Look for factory events that might have created this coin
      const factoryLogs = await publicClient.getLogs({
        address: ZORA_FACTORY as `0x${string}`,
        fromBlock: 1n,
        toBlock: "latest"
      });
      
      console.log(`   Total factory events: ${factoryLogs.length}`);
      
      // Look for events that mention our creator coin
      const relevantLogs = factoryLogs.filter(log => {
        const dataLower = log.data.toLowerCase();
        const coinAddrLower = CREATOR_COIN.slice(2).toLowerCase();
        return dataLower.includes(coinAddrLower) || 
               log.topics.some(topic => topic?.toLowerCase().includes(coinAddrLower));
      });
      
      if (relevantLogs.length > 0) {
        console.log(`   ✅ Found ${relevantLogs.length} events mentioning this coin!`);
        relevantLogs.forEach((log, i) => {
          console.log(`     Event ${i+1}:`);
          console.log(`       Block: ${log.blockNumber}`);
          console.log(`       Topic: ${log.topics[0]}`);
          console.log(`       Tx: ${log.transactionHash}`);
        });
      } else {
        console.log("   ❌ No factory events found for this coin");
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to check factory: ${error}`);
    }

    // 4. Check common trading patterns
    console.log("\n📋 4. TRADING PATTERN ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      // Check for any events on the creator coin contract
      const coinLogs = await publicClient.getLogs({
        address: CREATOR_COIN as `0x${string}`,
        fromBlock: (await publicClient.getBlockNumber()) - 1000n,
        toBlock: "latest"
      });
      
      console.log(`   Found ${coinLogs.length} events on creator coin contract`);
      
      if (coinLogs.length > 0) {
        const uniqueTopics = [...new Set(coinLogs.map(log => log.topics[0]))];
        console.log(`   Unique event types: ${uniqueTopics.length}`);
        uniqueTopics.slice(0, 3).forEach((topic, i) => {
          console.log(`     ${i+1}. ${topic?.slice(0, 18)}...`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to check trading patterns: ${error}`);
    }

    console.log("\n🔍 HYPOTHESIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   Based on research, Zora creator coins on Base likely:");
    console.log("   1. 🏭 Use Zora's custom trading contracts (not Uniswap)");
    console.log("   2. 📈 Have bonding curves built into the coin contract");
    console.log("   3. 🔄 Trade through Zora's frontend API calls");
    console.log("   4. 💱 May integrate with specialized AMMs");

    console.log("\n🔧 NEXT STEPS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. 🌐 Check Zora's documentation for trading APIs");
    console.log("   2. 🔍 Reverse engineer Zora frontend trading calls");
    console.log("   3. 📊 Look for Zora-specific trading contracts");
    console.log("   4. 🧪 Test direct coin contract trading functions");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  investigateZoraTrading();
} 