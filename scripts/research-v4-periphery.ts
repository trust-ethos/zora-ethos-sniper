#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Research Uniswap V4 Periphery Contracts on Base
 * This script helps find the router contracts that make V4 trading easier
 */

import { load } from "@std/dotenv";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Known V4 PoolManager (we found this!)
const POOL_MANAGER = "0x498581ff718922c3f8e6a244956af099b2652b2b";

// Potential V4 periphery contracts to check
const POTENTIAL_V4_CONTRACTS = [
  // These are educated guesses based on typical Uniswap deployment patterns
  "0x2626664c2603336E57B271c5C0b26F421741e481", // V3 SwapRouter (for reference)
  "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // Universal Router (might support V4)
  "0x198EF1ec325a96cc354C46140dB6B41cbC3c0D1a", // Another potential router
  // Add more addresses here as they're discovered
];

async function researchV4Periphery() {
  try {
    console.log("🔍 RESEARCHING UNISWAP V4 PERIPHERY CONTRACTS ON BASE\n");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    console.log("📋 Current Status:");
    console.log(`   ✅ V4 PoolManager Found: ${POOL_MANAGER}`);
    console.log(`   🔍 Looking for: SwapRouter, UniversalRouter, PositionManager`);
    console.log(`   🎯 Goal: Find contracts that simplify V4 trading\n`);

    // Check each potential contract
    for (const address of POTENTIAL_V4_CONTRACTS) {
      console.log(`🔍 Checking: ${address}`);
      
      try {
        const bytecode = await publicClient.getBytecode({ 
          address: address as `0x${string}` 
        });
        
        if (!bytecode || bytecode === "0x") {
          console.log(`   ❌ Not a contract`);
          continue;
        }

        console.log(`   ✅ Is a contract (${bytecode.length} chars)`);
        console.log(`   🔗 BaseScan: https://basescan.org/address/${address}`);
        
        // Try to get recent transactions to see activity
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock - 1000n; // Last ~1000 blocks
        
        try {
          const logs = await publicClient.getLogs({
            address: address as `0x${string}`,
            fromBlock,
            toBlock: latestBlock
          });
          
          console.log(`   📊 Recent activity: ${logs.length} events in last 1000 blocks`);
          
          if (logs.length > 0) {
            console.log(`   🎯 ACTIVE CONTRACT - Worth investigating!`);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not check activity`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error checking: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      console.log(); // Empty line for readability
    }

    console.log("🔍 RESEARCH INSTRUCTIONS:\n");
    
    console.log("📚 Official Sources to Check:");
    console.log("   1. Uniswap GitHub: https://github.com/Uniswap/v4-periphery");
    console.log("   2. Uniswap Docs: https://docs.uniswap.org/contracts/v4/");
    console.log("   3. Uniswap Governance: https://gov.uniswap.org/");
    console.log("   4. Base Ecosystem: https://base.org/ecosystem");

    console.log("\n🕵️  Manual Investigation Steps:");
    console.log("   1. Visit each BaseScan link above");
    console.log("   2. Check contract name/verification status");
    console.log("   3. Look for functions like 'exactInputSingle', 'swapExact'");
    console.log("   4. Check if contract interacts with PoolManager");

    console.log("\n🎯 What to Look For:");
    console.log("   ✅ Contract name contains 'Router', 'Swap', or 'Universal'");
    console.log("   ✅ Has functions similar to V3 SwapRouter");
    console.log("   ✅ Recent transaction activity");
    console.log("   ✅ Interacts with PoolManager address");

    console.log("\n🧪 Once You Find a Router:");
    console.log("   1. Update UNISWAP_V4_ROUTER in dex-service.ts");
    console.log("   2. Add the router's ABI");
    console.log("   3. Test with exactInputSingle() calls");
    console.log("   4. Start with WETH/USDC pairs");

    console.log("\n💡 Alternative Strategy:");
    console.log("   • Find recent successful token purchases on Base");
    console.log("   • Analyze those transactions for router contracts");
    console.log("   • Look for V4-style transaction patterns");

    console.log("\n⚠️  Important Notes:");
    console.log("   • V4 is still relatively new");
    console.log("   • Periphery contracts might not be widely deployed yet");
    console.log("   • You might need to deploy your own callback contract");
    console.log("   • Consider starting with V3 and upgrading to V4 later");

    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   1. Manual research using the links above`);
    console.log(`   2. Check Uniswap's official deployment announcements`);
    console.log(`   3. Consider asking Uniswap community/Discord`);
    console.log(`   4. Look at other successful V4 integrations`);

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  researchV4Periphery();
} 