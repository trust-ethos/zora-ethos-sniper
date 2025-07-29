#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test Creator Coin Trading Availability
 * Check where a specific creator coin can actually be traded
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, getContract, parseAbiItem } from "viem";
import { base } from "viem/chains";

// Known DEX addresses on Base
const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const UNISWAP_V4_POOL_MANAGER = "0x498581ff718922c3f8e6a244956af099b2652b2b";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

// Common fee tiers
const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1.0%

async function testCreatorCoinTrading(creatorCoinAddress: string) {
  try {
    console.log("🔍 TESTING CREATOR COIN TRADING AVAILABILITY\n");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    console.log("📋 Creator Coin Analysis:");
    console.log(`   Token Address: ${creatorCoinAddress}`);
    console.log(`   Network: Base (${base.id})`);
    console.log(`   BaseScan: https://basescan.org/address/${creatorCoinAddress}\n`);

    // Check if it's a valid contract
    const bytecode = await publicClient.getBytecode({ 
      address: creatorCoinAddress as `0x${string}` 
    });
    
    if (!bytecode || bytecode === "0x") {
      console.log("❌ ERROR: Address is not a contract!");
      return;
    }

    console.log("✅ Valid Contract Found\n");

    // Test V3 Pool Existence
    console.log("🦄 TESTING UNISWAP V3 POOLS:");
    
    const v3Factory = getContract({
      address: UNISWAP_V3_FACTORY as `0x${string}`,
      abi: [parseAbiItem("function getPool(address,address,uint24) view returns (address)")],
      client: publicClient,
    });

    let v3PoolFound = false;
    for (const fee of FEE_TIERS) {
      try {
        const poolAddress = await v3Factory.read.getPool([
          WETH_ADDRESS as `0x${string}`,
          creatorCoinAddress as `0x${string}`,
          fee
        ]);
        
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
          console.log(`   ✅ V3 Pool Found (${fee/10000}%): ${poolAddress}`);
          console.log(`      🔗 BaseScan: https://basescan.org/address/${poolAddress}`);
          v3PoolFound = true;
          
          // Check pool liquidity
          try {
            const poolContract = getContract({
              address: poolAddress as `0x${string}`,
              abi: [parseAbiItem("function liquidity() view returns (uint128)")],
              client: publicClient,
            });
            
            const liquidity = await poolContract.read.liquidity();
            console.log(`      💧 Liquidity: ${liquidity.toString()}`);
            
            if (liquidity > 0n) {
              console.log(`      🎯 TRADEABLE on V3!`);
            } else {
              console.log(`      ⚠️  Pool exists but no liquidity`);
            }
          } catch (error) {
            console.log(`      ⚠️  Could not check liquidity`);
          }
        } else {
          console.log(`   ❌ No V3 Pool (${fee/10000}%)`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking V3 pool (${fee/10000}%): ${error}`);
      }
    }

    if (!v3PoolFound) {
      console.log("   ❌ NO V3 POOLS FOUND\n");
    } else {
      console.log();
    }

    // Test V4 Pool Existence (more complex - need pool keys)
    console.log("🦄 TESTING UNISWAP V4 POOLS:");
    console.log("   ⚠️  V4 pool discovery requires pool key generation");
    console.log("   🔍 This is more complex - checking transaction history instead...\n");

    // Check recent transactions for trading activity
    console.log("📊 CHECKING RECENT TRADING ACTIVITY:");
    
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock - 2000n; // Last ~2000 blocks (~1 hour)
      
      // Look for Transfer events (indicates trading)
      const transferLogs = await publicClient.getLogs({
        address: creatorCoinAddress as `0x${string}`,
        event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
        fromBlock,
        toBlock: latestBlock
      });
      
      console.log(`   📈 Transfer Events (last 2000 blocks): ${transferLogs.length}`);
      
      if (transferLogs.length > 0) {
        console.log("   🎯 Token has recent activity!");
        
        // Analyze transfer destinations to find DEXes
        const destinations = new Map<string, number>();
        transferLogs.forEach(log => {
          const to = log.args?.to as string;
          if (to) {
            destinations.set(to, (destinations.get(to) || 0) + 1);
          }
        });
        
        console.log("\n   🔍 Top Transfer Destinations:");
        Array.from(destinations.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([address, count]) => {
            console.log(`      ${address}: ${count} transfers`);
            
            // Check if it's a known DEX
            if (address.toLowerCase() === UNISWAP_V3_ROUTER.toLowerCase()) {
              console.log(`        ↳ 🦄 Uniswap V3 Router!`);
            } else if (address.toLowerCase() === UNISWAP_V4_POOL_MANAGER.toLowerCase()) {
              console.log(`        ↳ 🦄 Uniswap V4 PoolManager!`);
            } else {
              console.log(`        ↳ 🔗 https://basescan.org/address/${address}`);
            }
          });
      } else {
        console.log("   ⚠️  No recent trading activity found");
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking activity: ${error}`);
    }

    // Check for other DEX integrations
    console.log("\n🔍 OTHER DEX POSSIBILITIES:");
    console.log("   • Zora's own AMM/DEX");
    console.log("   • SushiSwap on Base");
    console.log("   • Other Base ecosystem DEXes");
    console.log("   • Custom creator coin marketplaces");

    console.log("\n💡 RECOMMENDATIONS:");
    
    if (v3PoolFound) {
      console.log("   ✅ Use Uniswap V3 - pools exist!");
      console.log("   📝 Update dex-service.ts to use V3 SwapRouter");
    } else {
      console.log("   ⚠️  V3 may not be the right choice");
      console.log("   🔍 Investigate where this token is actually traded:");
      console.log("      1. Check recent transactions on BaseScan");
      console.log("      2. Look for DEX interactions in transaction history");
      console.log("      3. Check Zora's own trading infrastructure");
      console.log("      4. Consider if V4 or custom DEX is required");
    }

    console.log(`\n🔗 Manual Investigation:`);
    console.log(`   • Token: https://basescan.org/address/${creatorCoinAddress}`);
    console.log(`   • Recent transactions: Look for DEX interactions`);
    console.log(`   • Holders: Check who owns the token`);

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  const creatorCoinAddress = Deno.args[0];
  
  if (!creatorCoinAddress) {
    console.log("Usage: deno task test-creator-trading <creator-coin-address>");
    console.log("Example: deno task test-creator-trading 0x1234...");
    Deno.exit(1);
  }
  
  testCreatorCoinTrading(creatorCoinAddress);
} 