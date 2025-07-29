#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Check Zora Network vs Base
 * Determine which network the creator coin actually exists on
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, getContract } from "viem";
import { base, optimism } from "viem/chains";

// Define Zora Network
const zoraNetwork = {
  id: 7777777,
  name: 'Zora',
  network: 'zora',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.zora.energy'],
    },
    public: {
      http: ['https://rpc.zora.energy'],
    },
  },
  blockExplorers: {
    default: { name: 'Zora Explorer', url: 'https://explorer.zora.energy' },
  },
  testnet: false,
} as const;

// Your creator coin
const CREATOR_COIN = "0x1ffdd7a3ca67a8bc50a3db8d4ca4c3c790e70e17";

// ERC20 ABI
const ERC20_ABI = [
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
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

async function checkNetworks() {
  try {
    console.log("🔍 CHECKING ZORA NETWORK vs BASE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎯 Creator Coin: ${CREATOR_COIN}`);
    console.log("");

    await load({ export: true });

    // Create clients for both networks
    const baseClient = createPublicClient({
      chain: base,
      transport: http("https://mainnet.base.org"),
    });

    const zoraClient = createPublicClient({
      chain: zoraNetwork,
      transport: http("https://rpc.zora.energy"),
    });

    // Check on Base
    console.log("📋 1. CHECKING BASE NETWORK:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      const baseContract = getContract({
        address: CREATOR_COIN as `0x${string}`,
        abi: ERC20_ABI,
        client: { public: baseClient }
      });

      const [baseName, baseSymbol, baseTotalSupply] = await Promise.all([
        baseContract.read.name(),
        baseContract.read.symbol(),
        baseContract.read.totalSupply()
      ]);

      console.log(`   ✅ EXISTS on Base!`);
      console.log(`   Name: ${baseName}`);
      console.log(`   Symbol: ${baseSymbol}`);
      console.log(`   Total Supply: ${baseTotalSupply}`);
      
    } catch (error) {
      console.log(`   ❌ NOT FOUND on Base`);
      console.log(`   Error: ${error}`);
    }

    // Check on Zora Network
    console.log("\n📋 2. CHECKING ZORA NETWORK:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      const zoraContract = getContract({
        address: CREATOR_COIN as `0x${string}`,
        abi: ERC20_ABI,
        client: { public: zoraClient }
      });

      const [zoraName, zoraSymbol, zoraTotalSupply] = await Promise.all([
        zoraContract.read.name(),
        zoraContract.read.symbol(),
        zoraContract.read.totalSupply()
      ]);

      console.log(`   ✅ EXISTS on Zora Network!`);
      console.log(`   Name: ${zoraName}`);
      console.log(`   Symbol: ${zoraSymbol}`);
      console.log(`   Total Supply: ${zoraTotalSupply}`);
      
    } catch (error) {
      console.log(`   ❌ NOT FOUND on Zora Network`);
      console.log(`   Error: ${error}`);
    }

    // Check Uniswap deployments
    console.log("\n📋 3. UNISWAP DEPLOYMENTS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    console.log("   Base Network:");
    console.log("   🦄 Uniswap V3 Factory: 0x33128a8fC17869897dcE68Ed026d694621f6FDfD");
    console.log("   🦄 Uniswap V4 PoolManager: 0x498581ff718922c3f8e6a244956af099b2652b2b");
    console.log("");
    console.log("   Zora Network:");
    console.log("   🦄 Uniswap V3 Factory: 0x4324A677D74764f46f33ED447964252441aA8Db6");
    console.log("   🦄 No V4 deployment yet");

    console.log("\n🔍 ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   If coin exists on BOTH networks:");
    console.log("   💡 This might be a multi-chain deployment");
    console.log("");
    console.log("   If coin only exists on Zora Network:");
    console.log("   🎯 You need to use Zora Network, not Base!");
    console.log("   🦄 Trade on Uniswap V3 on Zora Network");
    console.log("");
    console.log("   If coin only exists on Base:");
    console.log("   🤔 Might be a different trading system");
    console.log("   🏭 Could be Zora's native Base contracts");

    console.log("\n🔧 NEXT STEPS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. 🌐 Switch to the correct network");
    console.log("   2. 🦄 Use the right Uniswap deployment");
    console.log("   3. 🔄 Update RPC URL in your .env");
    console.log("   4. 🧪 Test trading on the correct network");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  checkNetworks();
} 