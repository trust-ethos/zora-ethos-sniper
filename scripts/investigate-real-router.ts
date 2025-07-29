#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Investigate Real Creator Coin Router
 * Analyze the contract that actually handles creator coin trades
 */

import { load } from "@std/dotenv";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// The REAL router contract from the actual trade
const REAL_ROUTER = "0x6ff5693b99212da76ad316178a184ab56d299b43";

async function investigateRealRouter() {
  try {
    console.log("🔍 INVESTIGATING REAL CREATOR COIN ROUTER");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎯 Router Contract: ${REAL_ROUTER}`);
    console.log("");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    // 1. Check if contract is verified on BaseScan
    console.log("📋 1. CONTRACT VERIFICATION STATUS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   🔗 BaseScan: https://basescan.org/address/${REAL_ROUTER}`);
    console.log(`   🔗 Check if verified and get ABI from there`);

    // 2. Get basic contract info
    console.log("\n📋 2. CONTRACT ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Check if it's a contract
    const code = await publicClient.getCode({ address: REAL_ROUTER as `0x${string}` });
    if (code && code !== '0x') {
      console.log(`   ✅ Valid contract (${code.length} bytes)`);
    } else {
      console.log(`   ❌ Not a contract or no code`);
      return;
    }

    // 3. Look for recent transactions to understand usage patterns
    console.log("\n📋 3. RECENT USAGE PATTERNS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock - 1000n; // Last 1000 blocks
      
      // Look for transactions TO this contract
      const logs = await publicClient.getLogs({
        address: REAL_ROUTER as `0x${string}`,
        fromBlock: fromBlock,
        toBlock: latestBlock
      });
      
      console.log(`   📊 Events in last 1000 blocks: ${logs.length}`);
      
      if (logs.length > 0) {
        console.log(`   🔥 Contract is ACTIVE!`);
        
        // Group by unique topics
        const topicCounts: { [key: string]: number } = {};
        logs.forEach(log => {
          if (log.topics[0]) {
            topicCounts[log.topics[0]] = (topicCounts[log.topics[0]] || 0) + 1;
          }
        });
        
        console.log(`   📈 Event types:`);
        Object.entries(topicCounts).slice(0, 5).forEach(([topic, count]) => {
          console.log(`     ${topic}: ${count} times`);
        });
      } else {
        console.log(`   💤 No recent activity`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking activity: ${error}`);
    }

    // 4. Compare with known router contracts
    console.log("\n📋 4. ROUTER COMPARISON:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const knownRouters = {
      "Universal Router V4": "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
      "Uniswap V4 PoolManager": "0x498581ff718922c3f8e6a244956af099b2652b2b",
      "Our Real Router": REAL_ROUTER,
    };
    
    for (const [name, address] of Object.entries(knownRouters)) {
      const code = await publicClient.getCode({ address: address as `0x${string}` });
      console.log(`   ${name}:`);
      console.log(`     📍 ${address}`);
      console.log(`     📦 Code Size: ${code ? code.length : 'No code'} bytes`);
      
      if (address === REAL_ROUTER) {
        console.log(`     🎯 THIS IS THE ONE WE NEED!`);
      }
    }

    // 5. Function signature analysis
    console.log("\n📋 5. FUNCTION SIGNATURE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   🔧 Function: 0x3593564c = execute(bytes,bytes[])`);
    console.log(`   📝 This matches Universal Router interface`);
    console.log(`   🤔 But it's a DIFFERENT contract`);

    // 6. Next steps
    console.log("\n🎯 IMMEDIATE ACTION ITEMS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   1. 🌐 Visit BaseScan to check if contract is verified`);
    console.log(`   2. 📋 Get the ABI if it's verified`);
    console.log(`   3. 🔍 If not verified, analyze bytecode patterns`);
    console.log(`   4. 🧪 Create test transaction with this router`);
    console.log(`   5. ⚡ Update DexService to use this router instead`);

    console.log("\n💡 HYPOTHESIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   🎯 This is likely a Zora-specific router`);
    console.log(`   🔄 It wraps/extends Universal Router for creator coins`);
    console.log(`   🏭 Handles creator coin specific logic`);
    console.log(`   💱 Then delegates to Uniswap V4 for actual swaps`);

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  investigateRealRouter();
} 