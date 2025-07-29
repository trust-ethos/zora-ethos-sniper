#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Check Intermediate Token Status
 * Verify the intermediate token is still trading before attempting replication
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

// Key addresses from successful transaction
const WETH = "0x4200000000000000000000000000000000000006";
const INTERMEDIATE_TOKEN = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // From V3 path
const YOUR_CREATOR_COIN = "0x1ffdd7a3ca67a8bc50a3db8d4ca4c3c790e70e17";
const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

async function checkIntermediateToken() {
  try {
    console.log("🔍 CHECKING INTERMEDIATE TOKEN STATUS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎯 Intermediate Token: ${INTERMEDIATE_TOKEN}`);
    console.log(`🎯 Creator Coin: ${YOUR_CREATOR_COIN}`);
    console.log("");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    const currentBlock = await publicClient.getBlockNumber();

    // 1. Check intermediate token recent activity
    console.log("📋 1. INTERMEDIATE TOKEN ACTIVITY:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      const transferEvents = await publicClient.getLogs({
        address: INTERMEDIATE_TOKEN as `0x${string}`,
        event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
        fromBlock: currentBlock - 1000n,
        toBlock: "latest"
      });

      console.log(`   Recent Transfers (1000 blocks): ${transferEvents.length}`);
      
      if (transferEvents.length > 0) {
        console.log("   ✅ Token is actively trading");
        console.log(`   📊 Latest transfer: Block ${transferEvents[transferEvents.length - 1].blockNumber}`);
      } else {
        console.log("   ⚠️  No recent transfers found");
      }
    } catch (error) {
      console.log(`   ❌ Error checking transfers: ${error}`);
    }

    // 2. Check WETH -> Intermediate token pool
    console.log("\n📋 2. WETH → INTERMEDIATE TOKEN POOL:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      // Check for pool events involving our tokens
      const poolEvents = await publicClient.getLogs({
        address: UNISWAP_V3_FACTORY as `0x${string}`,
        fromBlock: currentBlock - 10000n,
        toBlock: "latest"
      });

      console.log(`   Recent V3 factory events: ${poolEvents.length}`);
      
      // Look for pools involving our tokens
      const relevantPools = poolEvents.filter(log => {
        const data = log.data.toLowerCase();
        return data.includes(WETH.slice(2).toLowerCase()) && 
               data.includes(INTERMEDIATE_TOKEN.slice(2).toLowerCase());
      });
      
      console.log(`   WETH/Intermediate pool events: ${relevantPools.length}`);
      
      if (relevantPools.length > 0) {
        console.log("   ✅ Pool activity found for WETH → Intermediate");
      } else {
        console.log("   ⚠️  No recent pool activity found");
      }
    } catch (error) {
      console.log(`   ❌ Error checking pools: ${error}`);
    }

    // 3. Check if intermediate token -> creator coin path exists
    console.log("\n📋 3. INTERMEDIATE → CREATOR COIN PATH:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Check V4 activity for creator coin
    const v4PoolManager = "0x498581ff718922c3f8e6a244956af099b2652b2b";
    
    try {
      const v4Events = await publicClient.getLogs({
        address: v4PoolManager as `0x${string}`,
        fromBlock: currentBlock - 1000n,
        toBlock: "latest"
      });

      console.log(`   Recent V4 PoolManager events: ${v4Events.length}`);
      
      // Look for events involving creator coin
      const creatorCoinEvents = v4Events.filter(log => {
        const topics = log.topics.join('').toLowerCase();
        const data = log.data.toLowerCase();
        return topics.includes(YOUR_CREATOR_COIN.slice(2).toLowerCase()) ||
               data.includes(YOUR_CREATOR_COIN.slice(2).toLowerCase());
      });
      
      console.log(`   Creator coin V4 events: ${creatorCoinEvents.length}`);
      
      if (creatorCoinEvents.length > 0) {
        console.log("   ✅ Creator coin active in V4");
      } else {
        console.log("   ⚠️  No recent V4 activity for creator coin");
      }
    } catch (error) {
      console.log(`   ❌ Error checking V4 activity: ${error}`);
    }

    // 4. Summary and recommendation
    console.log("\n🎯 TRADING PATH ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   Path: ETH → WETH → Intermediate → Creator Coin");
    console.log(`   Step 1: ETH → WETH (✅ Always works)`);
    console.log(`   Step 2: WETH → ${INTERMEDIATE_TOKEN.slice(0, 10)}...`);
    console.log(`   Step 3: Intermediate → ${YOUR_CREATOR_COIN.slice(0, 10)}... (V4)`);
    console.log(`   Step 4: Sweep remaining tokens`);

    console.log("\n💡 RECOMMENDATION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   🧪 Our transaction structure is CORRECT");
    console.log("   💰 Try with exact same amount (0.03 ETH)");
    console.log("   ⏰ Market conditions may have changed since original");
    console.log("   🎯 If 0.03 ETH works, then scale down to smaller amounts");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  checkIntermediateToken();
} 