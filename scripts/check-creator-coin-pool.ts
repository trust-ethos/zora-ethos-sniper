#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Check Creator Coin Pool Availability
 * Investigates where the creator coin can actually be traded
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, getContract, parseAbiItem } from "viem";
import { base } from "viem/chains";

// Your creator coin
const CREATOR_COIN = "0x1ffdd7a3ca67a8bc50a3db8d4ca4c3c790e70e17";
const WETH = "0x4200000000000000000000000000000000000006";

// Contract addresses
const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const UNISWAP_V4_POOL_MANAGER = "0x498581ff718922c3f8e6a244956af099b2652b2b";

// ABIs
const V3_FACTORY_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "tokenA", "type": "address"},
      {"internalType": "address", "name": "tokenB", "type": "address"},
      {"internalType": "uint24", "name": "fee", "type": "uint24"}
    ],
    "name": "getPool",
    "outputs": [{"internalType": "address", "name": "pool", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

async function checkCreatorCoinPool() {
  try {
    console.log("🔍 CHECKING CREATOR COIN POOL AVAILABILITY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    console.log(`🎯 Creator Coin: ${CREATOR_COIN}`);
    console.log(`💰 WETH: ${WETH}`);
    console.log("");

    // 1. Check creator coin basic info
    console.log("📋 1. CREATOR COIN INFO:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      const tokenContract = getContract({
        address: CREATOR_COIN as `0x${string}`,
        abi: ERC20_ABI,
        client: { public: publicClient }
      });

      const [name, symbol, totalSupply] = await Promise.all([
        tokenContract.read.name(),
        tokenContract.read.symbol(), 
        tokenContract.read.totalSupply()
      ]);

      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Total Supply: ${totalSupply}`);
      
    } catch (error) {
      console.log(`   ❌ Failed to read token info: ${error}`);
    }

    // 2. Check Uniswap V3 pools
    console.log("\n📋 2. UNISWAP V3 POOLS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const v3Factory = getContract({
      address: UNISWAP_V3_FACTORY as `0x${string}`,
      abi: V3_FACTORY_ABI,
      client: { public: publicClient }
    });

    const fees = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
    
    for (const fee of fees) {
      try {
        const poolAddress = await v3Factory.read.getPool([
          CREATOR_COIN as `0x${string}`,
          WETH as `0x${string}`,
          fee
        ]);
        
        if (poolAddress === "0x0000000000000000000000000000000000000000") {
          console.log(`   ${fee/10000}% fee: ❌ No pool`);
        } else {
          console.log(`   ${fee/10000}% fee: ✅ Pool found at ${poolAddress}`);
          
          // Check pool liquidity
          try {
            const wethBalance = await publicClient.readContract({
              address: WETH as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [poolAddress]
            });
            
            const tokenBalance = await publicClient.readContract({
              address: CREATOR_COIN as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [poolAddress]
            });
            
            console.log(`      WETH liquidity: ${wethBalance}`);
            console.log(`      Token liquidity: ${tokenBalance}`);
          } catch (error) {
            console.log(`      ❌ Failed to check liquidity: ${error}`);
          }
        }
      } catch (error) {
        console.log(`   ${fee/10000}% fee: ❌ Error checking: ${error}`);
      }
    }

    // 3. Check recent transactions
    console.log("\n📋 3. RECENT CREATOR COIN TRANSACTIONS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock - 1000n; // Last ~1000 blocks
      
      const transferLogs = await publicClient.getLogs({
        address: CREATOR_COIN as `0x${string}`,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        fromBlock: fromBlock,
        toBlock: latestBlock
      });
      
      console.log(`   Found ${transferLogs.length} transfers in last 1000 blocks`);
      
      if (transferLogs.length > 0) {
        console.log("   Recent transfers:");
        transferLogs.slice(-5).forEach((log, i) => {
          console.log(`     ${i+1}. Block ${log.blockNumber}: ${log.args?.value} tokens`);
        });
      } else {
        console.log("   ⚠️  No recent transfer activity");
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to check transfers: ${error}`);
    }

    // 4. Check where tokens are actually traded
    console.log("\n📋 4. TRADING VENUE INVESTIGATION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Check if it's traded on Zora's own system
    try {
      const zoraFactoryLogs = await publicClient.getLogs({
        address: "0x777777751622c0d3258f214F9DF38E35BF45baF3" as `0x${string}`,
        fromBlock: (await publicClient.getBlockNumber()) - 10000n,
        toBlock: "latest"
      });
      
      console.log(`   Zora Factory events: ${zoraFactoryLogs.length}`);
      
      // Look for mentions of our creator coin
      const relevantLogs = zoraFactoryLogs.filter(log => 
        log.topics.some(topic => topic?.toLowerCase().includes(CREATOR_COIN.slice(2).toLowerCase()))
      );
      
      if (relevantLogs.length > 0) {
        console.log(`   ✅ Creator coin appears in ${relevantLogs.length} Zora Factory events`);
        console.log("   💡 This coin might trade on Zora's native system, not Uniswap");
      } else {
        console.log("   ❌ No mentions in Zora Factory events");
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to check Zora Factory: ${error}`);
    }

    console.log("\n🔍 DIAGNOSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   If no V3 pools exist, possible explanations:");
    console.log("   1. 🏭 Creator coins trade on Zora's native system");
    console.log("   2. 🚫 No liquidity has been added to Uniswap yet");
    console.log("   3. 🆕 Too new - pools not created yet");
    console.log("   4. 🔄 Different trading mechanism entirely");
    console.log("");
    console.log("🔧 RECOMMENDED NEXT STEPS:");
    console.log("   1. 🔍 Research how Zora creator coins are actually traded");
    console.log("   2. 🌐 Check Zora's documentation for trading APIs");
    console.log("   3. 🎯 Look for Zora-specific router contracts");
    console.log("   4. 📊 Analyze successful creator coin trades on BaseScan");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  checkCreatorCoinPool();
} 