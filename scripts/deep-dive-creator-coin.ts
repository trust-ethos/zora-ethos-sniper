#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Deep Dive Analysis of Creator Coin Trading Infrastructure
 * Analyze ALL transactions to understand how creator coins are traded
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

const ZORA_FACTORY = "0x777777751622c0d3258f214F9DF38E35BF45baF3";
const UNISWAP_V4_POOL_MANAGER = "0x498581ff718922c3f8e6a244956af099b2652b2b";

async function deepDiveCreatorCoin(creatorCoinAddress: string) {
  try {
    console.log("🔍 DEEP DIVE: CREATOR COIN TRADING INFRASTRUCTURE\n");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    console.log("📋 Analyzing:");
    console.log(`   Token: ${creatorCoinAddress}`);
    console.log(`   BaseScan: https://basescan.org/address/${creatorCoinAddress}\n`);

    // Get ALL Transfer events since creation
    console.log("📊 FULL TRANSACTION HISTORY:");
    
    let allTransfers: any[] = [];
    try {
      allTransfers = await publicClient.getLogs({
        address: creatorCoinAddress as `0x${string}`,
        event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
        fromBlock: 'earliest',
        toBlock: 'latest'
      });
      
      console.log(`   Total Transfer Events: ${allTransfers.length}`);
      
      if (allTransfers.length === 0) {
        console.log("   ⚠️  No transfers found - token might be very new or inactive\n");
      } else {
        console.log(`   📅 First Transfer: Block ${allTransfers[0].blockNumber}`);
        console.log(`   📅 Last Transfer: Block ${allTransfers[allTransfers.length - 1].blockNumber}\n`);

        // Analyze all transfer destinations
        const allDestinations = new Map<string, number>();
        const allSources = new Map<string, number>();
        
        allTransfers.forEach(log => {
          const from = log.args?.from as string;
          const to = log.args?.to as string;
          
          if (from && from !== "0x0000000000000000000000000000000000000000") {
            allSources.set(from, (allSources.get(from) || 0) + 1);
          }
          if (to) {
            allDestinations.set(to, (allDestinations.get(to) || 0) + 1);
          }
        });

        console.log("🎯 TOP TRANSFER SOURCES (All Time):");
        Array.from(allSources.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([address, count]) => {
            console.log(`   ${address}: ${count} outgoing transfers`);
            console.log(`      🔗 https://basescan.org/address/${address}`);
          });

        console.log("\n🎯 TOP TRANSFER DESTINATIONS (All Time):");
        Array.from(allDestinations.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([address, count]) => {
            console.log(`   ${address}: ${count} incoming transfers`);
            
            // Check for known contracts
            if (address.toLowerCase() === ZORA_FACTORY.toLowerCase()) {
              console.log(`      ↳ 🏭 ZORA FACTORY!`);
            } else if (address.toLowerCase() === UNISWAP_V4_POOL_MANAGER.toLowerCase()) {
              console.log(`      ↳ 🦄 UNISWAP V4 POOL MANAGER!`);
            } else {
              console.log(`      🔗 https://basescan.org/address/${address}`);
            }
          });
      }
      
    } catch (error) {
      console.log(`   ❌ Error getting transfer history: ${error}`);
    }

    // Check for creation event
    console.log("\n🏭 CREATION ANALYSIS:");
    
    try {
      // Look for coin creation events in Zora Factory
      const creationEvents = await publicClient.getLogs({
        address: ZORA_FACTORY as `0x${string}`,
        event: parseAbiItem("event CoinCreated(address indexed creator, address coin, string name, string symbol)"),
        fromBlock: 'earliest',
        toBlock: 'latest'
      });
      
      const thisCreation = creationEvents.find(event => 
        (event.args?.coin as string)?.toLowerCase() === creatorCoinAddress.toLowerCase()
      );
      
      if (thisCreation) {
        console.log(`   ✅ Found creation event!`);
        console.log(`   📅 Block: ${thisCreation.blockNumber}`);
        console.log(`   👤 Creator: ${thisCreation.args?.creator}`);
        console.log(`   🏷️  Name: ${thisCreation.args?.name}`);
        console.log(`   🔤 Symbol: ${thisCreation.args?.symbol}`);
      } else {
        console.log("   ⚠️  Creation event not found (might be older format)");
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking creation: ${error}`);
    }

    // Check V4 activity specifically
    console.log("\n🦄 V4 ACTIVITY ANALYSIS:");
    
    try {
      const v4Events = await publicClient.getLogs({
        address: UNISWAP_V4_POOL_MANAGER as `0x${string}`,
        fromBlock: 'earliest',
        toBlock: 'latest'
      });
      
      console.log(`   📊 Total V4 PoolManager events: ${v4Events.length}`);
      
      // Check if any involve our token (this is complex without full V4 decoding)
      console.log("   ⚠️  V4 token-specific analysis requires pool key decoding");
      
    } catch (error) {
      console.log(`   ❌ Error checking V4 activity: ${error}`);
    }

    // Check for potential Zora-specific trading infrastructure
    console.log("\n🎨 ZORA ECOSYSTEM ANALYSIS:");
    console.log("   🔍 Creator coins might use Zora's own trading infrastructure");
    console.log("   📝 Check Zora documentation for:");
    console.log("      • Creator coin marketplaces");
    console.log("      • Zora-specific AMM/DEX");
    console.log("      • Creator coin trading APIs");

    console.log("\n💡 CONCLUSIONS:");
    
    if (allTransfers.length === 0) {
      console.log("   🆕 This appears to be a very new or inactive creator coin");
      console.log("   📊 No trading history found");
      console.log("   🎯 Focus on newly created coins with activity");
    } else {
      console.log("   📈 Token has transaction history");
      console.log("   🔍 Check the top addresses manually on BaseScan");
      console.log("   🎯 Look for DEX/marketplace patterns in the addresses");
    }

    console.log("\n🚀 NEXT STEPS FOR BOT:");
    console.log("   1. 🔍 Analyze newly created coins (not historical ones)");
    console.log("   2. 📊 Focus on coins with immediate trading activity");
    console.log("   3. 🦄 Investigate V4 integration for active trading");
    console.log("   4. 🎨 Research Zora's own trading infrastructure");
    console.log("   5. 📈 Monitor creation events for real-time analysis");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  const creatorCoinAddress = Deno.args[0];
  
  if (!creatorCoinAddress) {
    console.log("Usage: deno task deep-dive <creator-coin-address>");
    Deno.exit(1);
  }
  
  deepDiveCreatorCoin(creatorCoinAddress);
} 