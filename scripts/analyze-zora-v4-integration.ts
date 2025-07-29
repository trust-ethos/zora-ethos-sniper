#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Analyze How Zora Integrates with Uniswap V4
 * Reverse-engineer Zora's V4 trading implementation
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

const UNISWAP_V4_POOL_MANAGER = "0x498581ff718922c3f8e6a244956af099b2652b2b";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

// Common V4 event signatures to look for
const V4_EVENTS = [
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f", // Initialize
  "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec", // Swap
  "0xd0565428a2140862827b5b6126002556c70acb52db537fae9cf41a18a470ec4a", // ModifyLiquidity
];

async function analyzeZoraV4Integration() {
  try {
    console.log("🔍 ANALYZING ZORA'S V4 INTEGRATION\n");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    console.log("📋 Research Strategy:");
    console.log("   1. Find recent V4 PoolManager activity");
    console.log("   2. Look for creator coin trading patterns");
    console.log("   3. Identify router contracts Zora uses");
    console.log("   4. Understand pool initialization patterns\n");

    // Step 1: Get recent V4 activity
    console.log("🦄 STEP 1: Recent V4 PoolManager Activity");
    
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock - 100n; // Last 100 blocks (~20 minutes)
      
      console.log(`   📊 Checking blocks ${fromBlock} to ${latestBlock}`);
      
      const v4Logs = await publicClient.getLogs({
        address: UNISWAP_V4_POOL_MANAGER as `0x${string}`,
        fromBlock,
        toBlock: latestBlock
      });
      
      console.log(`   📈 Total V4 events: ${v4Logs.length}`);
      
      if (v4Logs.length > 0) {
        console.log("   🎯 V4 is actively being used!");
        
        // Group by event type
        const eventCounts = new Map<string, number>();
        v4Logs.forEach(log => {
          const topic = log.topics[0];
          if (topic) {
            eventCounts.set(topic, (eventCounts.get(topic) || 0) + 1);
          }
        });
        
        console.log("\n   📋 Event Types:");
        Array.from(eventCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([topic, count]) => {
            console.log(`      ${topic}: ${count} events`);
            if (V4_EVENTS.includes(topic)) {
              if (topic === V4_EVENTS[0]) console.log(`        ↳ 🚀 Pool Initialize`);
              if (topic === V4_EVENTS[1]) console.log(`        ↳ 💱 Swap`);
              if (topic === V4_EVENTS[2]) console.log(`        ↳ 💧 Liquidity Modify`);
            }
          });

        // Analyze transaction origins
        console.log("\n   🔍 Transaction Analysis:");
        const transactions = new Set<string>();
        v4Logs.forEach(log => {
          if (log.transactionHash) {
            transactions.add(log.transactionHash);
          }
        });
        
        console.log(`   📊 Unique transactions: ${transactions.size}`);
        
        // Sample a few transactions for analysis
        const sampleTxs = Array.from(transactions).slice(0, 3);
        for (const txHash of sampleTxs) {
          try {
            const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
            console.log(`\n   🔗 Sample TX: ${txHash}`);
            console.log(`      From: ${tx.from}`);
            console.log(`      To: ${tx.to}`);
            console.log(`      Value: ${tx.value} wei`);
            console.log(`      BaseScan: https://basescan.org/tx/${txHash}`);
            
            // Check if 'to' address might be a router
            if (tx.to && tx.to.toLowerCase() !== UNISWAP_V4_POOL_MANAGER.toLowerCase()) {
              console.log(`      🎯 Potential Router: ${tx.to}`);
              console.log(`      🔗 Router BaseScan: https://basescan.org/address/${tx.to}`);
            }
          } catch (error) {
            console.log(`      ❌ Error analyzing tx: ${error}`);
          }
        }
        
      } else {
        console.log("   ⚠️  No recent V4 activity found");
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking V4 activity: ${error}`);
    }

    // Step 2: Look for V4 router patterns
    console.log("\n🔧 STEP 2: Finding V4 Router Contracts");
    
    // Known potential V4 router addresses (educated guesses)
    const POTENTIAL_V4_ROUTERS = [
      "0x2626664c2603336E57B271c5C0b26F421741e481", // V3 Router (for comparison)
      "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // Universal Router
      "0x6B36d761981d82B1e07cF3c4daF4cB4615c4850a", // SwapRouter02 (from Zora proposal)
    ];

    for (const routerAddress of POTENTIAL_V4_ROUTERS) {
      try {
        console.log(`\n   🔍 Checking: ${routerAddress}`);
        
        const bytecode = await publicClient.getBytecode({ 
          address: routerAddress as `0x${string}` 
        });
        
        if (!bytecode || bytecode === "0x") {
          console.log(`      ❌ Not a contract`);
          continue;
        }

        console.log(`      ✅ Contract found (${bytecode.length} chars)`);
        
        // Check recent activity
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock - 1000n;
        
        const routerLogs = await publicClient.getLogs({
          address: routerAddress as `0x${string}`,
          fromBlock,
          toBlock: latestBlock
        });
        
        console.log(`      📊 Recent activity: ${routerLogs.length} events`);
        
        if (routerLogs.length > 0) {
          console.log(`      🎯 ACTIVE ROUTER - potential V4 interface!`);
          console.log(`      🔗 BaseScan: https://basescan.org/address/${routerAddress}`);
        }
        
      } catch (error) {
        console.log(`      ❌ Error: ${error}`);
      }
    }

    // Step 3: Research V4 pool key patterns
    console.log("\n🔑 STEP 3: V4 Pool Key Research");
    console.log("   📝 V4 pools are identified by pool keys, not addresses");
    console.log("   🧮 Pool Key = hash(currency0, currency1, fee, tickSpacing, hooks)");
    console.log("   🎯 Need to understand Zora's pool key generation");

    // Step 4: Implementation strategy
    console.log("\n🚀 STEP 4: Implementation Strategy");
    console.log("   💡 Based on analysis, here are the next steps:");
    console.log("   ");
    console.log("   Option A: Use V4 Router (if found)");
    console.log("   ├── Find active V4 router contract");
    console.log("   ├── Get ABI from verified contract");
    console.log("   ├── Use similar interface to V3 (exactInputSingle)");
    console.log("   └── Much easier than direct PoolManager integration");
    console.log("   ");
    console.log("   Option B: Direct PoolManager Integration");
    console.log("   ├── Implement unlock/callback pattern");
    console.log("   ├── Handle pool key generation");
    console.log("   ├── Manage settlement (take/settle)");
    console.log("   └── More complex but full control");

    console.log("\n📚 RESEARCH RESOURCES:");
    console.log("   🔗 Uniswap V4 Docs: https://docs.uniswap.org/contracts/v4/");
    console.log("   🔗 V4 Periphery: https://github.com/Uniswap/v4-periphery");
    console.log("   🔗 Zora V4 Frontend: Inspect network requests at zora.co");
    console.log("   🔗 BaseScan: Analyze successful creator coin trades");

    console.log("\n🎯 IMMEDIATE NEXT STEPS:");
    console.log("   1. 🕵️  Manually inspect Zora.co network requests");
    console.log("   2. 🔍 Find active V4 router in the potential addresses above");
    console.log("   3. 📋 Get router ABI from BaseScan");
    console.log("   4. 🧪 Test router integration with small trades");
    console.log("   5. 🏗️  Update dex-service.ts with working V4 calls");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  analyzeZoraV4Integration();
} 