#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { 
  createPublicClient, 
  http, 
  parseEther, 
  getContract,
  formatEther,
  type Address 
} from "viem";
import { base } from "viem/chains";
import { createTradeCall, type TradeParameters } from "@zoralabs/coins-sdk";

// Uniswap V3 Quoter contract on Base
const UNISWAP_V3_QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as Address;
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006" as Address;

// Quoter ABI for price quotes
const QUOTER_ABI = [
  {
    "inputs": [
      {"internalType": "bytes", "name": "path", "type": "bytes"},
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"}
    ],
    "name": "quoteExactInput",
    "outputs": [
      {"internalType": "uint256", "name": "amountOut", "type": "uint256"},
      {"internalType": "uint160[]", "name": "sqrtPriceX96AfterList", "type": "uint160[]"},
      {"internalType": "uint32[]", "name": "initializedTicksCrossedList", "type": "uint32[]"},
      {"internalType": "uint256", "name": "gasEstimate", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

async function testPriceQueryingOptions() {
  console.log("🔍 TESTING PRICE QUERYING OPTIONS FOR CREATOR COINS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  await load({ export: true });
  const config = Config.load();

  const publicClient = createPublicClient({
    chain: base,
    transport: http(config.baseRpcUrl),
  });

  // Test token: NonbinaryJolteon creator coin
  const TARGET_CREATOR_COIN = "0x0e2be91d4ca447eac82022d248eae98f034a6840" as Address;
  const TEST_AMOUNT = 0.001; // 0.001 ETH

  console.log(`🎯 TARGET TOKEN: ${TARGET_CREATOR_COIN}`);
  console.log(`💰 TEST AMOUNT: ${TEST_AMOUNT} ETH`);
  console.log("");

  // ===========================================
  // OPTION 1: ZORA SDK PRICE QUOTES (createTradeCall)
  // ===========================================
  console.log("📊 OPTION 1: ZORA SDK PRICE QUOTES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  try {
    // Use createTradeCall to get quote without executing
    const tradeParameters: TradeParameters = {
      sell: { type: "eth" },
      buy: {
        type: "erc20",
        address: TARGET_CREATOR_COIN,
      },
      amountIn: parseEther(TEST_AMOUNT.toString()),
      slippage: 0.05,
      sender: "0x0000000000000000000000000000000000000000" as Address, // Dummy address for quote
    };

    console.log("   🔄 Getting price quote from Zora SDK...");
    const quote = await createTradeCall(tradeParameters);
    
    console.log("   ✅ Zora SDK Quote Result:");
    console.log(`      Call Target: ${quote.call.target}`);
    console.log(`      Call Value: ${formatEther(BigInt(quote.call.value))} ETH`);
    console.log(`      Call Data Length: ${quote.call.data.length} bytes`);
    
    // Try to extract price information from the quote
    if (quote.call.value) {
      const ethAmount = formatEther(BigInt(quote.call.value));
      console.log(`      💡 Estimated Price: ${ethAmount} ETH for transaction`);
    }

  } catch (error) {
    console.log(`   ❌ Zora SDK Quote Failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // ===========================================
  // OPTION 2: UNISWAP V3 QUOTER CONTRACT
  // ===========================================
  console.log("📊 OPTION 2: UNISWAP V3 QUOTER CONTRACT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  try {
    const quoter = getContract({
      address: UNISWAP_V3_QUOTER,
      abi: QUOTER_ABI,
      client: publicClient
    });

    // Create path: WETH -> USDC (500 fee) -> Creator Coin (3000 fee)
    const path = new Uint8Array([
      // WETH address (20 bytes)
      ...hexToBytes(WETH_ADDRESS),
      // Fee (3 bytes) - 0.05% = 500
      0x00, 0x01, 0xf4,
      // USDC address (20 bytes)
      ...hexToBytes("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
      // Fee (3 bytes) - 0.3% = 3000
      0x00, 0x0b, 0xb8,
      // Creator coin address (20 bytes)
      ...hexToBytes(TARGET_CREATOR_COIN)
    ]);

    console.log("   🔄 Getting price quote from Uniswap V3 Quoter...");
    const amountIn = parseEther(TEST_AMOUNT.toString());
    
    // This might fail if the path doesn't exist
    const result = await quoter.read.quoteExactInput([
      `0x${Array.from(path).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`,
      amountIn
    ]);

    console.log("   ✅ Uniswap V3 Quote Result:");
    console.log(`      Amount Out: ${result[0].toString()} tokens`);
    console.log(`      Gas Estimate: ${result[3].toString()}`);
    
    const tokenPrice = Number(amountIn) / Number(result[0]);
    console.log(`      💡 Token Price: ${tokenPrice.toExponential(4)} ETH per token`);

  } catch (error) {
    console.log(`   ❌ Uniswap V3 Quote Failed: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`   💡 This is expected if no V3 pool exists for this creator coin`);
  }

  console.log("");

  // ===========================================
  // OPTION 3: MANUAL POOL RESERVES QUERY
  // ===========================================
  console.log("📊 OPTION 3: MANUAL POOL RESERVES QUERY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  try {
    // This would involve finding the exact pool address and querying reserves
    console.log("   🔄 Attempting to find pool reserves...");
    console.log("   ⚠️  This requires knowing the exact pool address and structure");
    console.log("   💡 Implementation would depend on Uniswap V3/V4 pool discovery");
    console.log("   ❌ Not implemented in this test (requires pool discovery first)");

  } catch (error) {
    console.log(`   ❌ Manual Query Failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // ===========================================
  // OPTION 4: PRICE IMPACT ANALYSIS
  // ===========================================
  console.log("📊 OPTION 4: PRICE IMPACT ANALYSIS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  try {
    console.log("   💡 Concept: Use different trade amounts to estimate current price");
    console.log("   📝 Method: Compare quotes for different amounts to calculate impact");
    console.log("   🎯 Benefits: More accurate for actual trading scenarios");
    console.log("   ⚠️  Complexity: Requires multiple quote calls and calculation");
    console.log("   🔄 Not implemented in this test");

  } catch (error) {
    console.log(`   ❌ Price Impact Analysis Failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // ===========================================
  // RECOMMENDATIONS
  // ===========================================
  console.log("💡 RECOMMENDATIONS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   🏆 BEST OPTION: Zora SDK createTradeCall");
  console.log("      ✅ Uses same routing as actual trades");
  console.log("      ✅ Handles V3/V4 complexity automatically");
  console.log("      ✅ Accounts for slippage and fees");
  console.log("      ✅ Most accurate for creator coins");
  console.log("");
  console.log("   🥈 BACKUP OPTION: Uniswap V3 Quoter");
  console.log("      ✅ Direct DEX pricing");
  console.log("      ❌ May not work for all creator coins");
  console.log("      ❌ Requires path discovery");
  console.log("");
  console.log("   📊 IMPLEMENTATION STRATEGY:");
  console.log("      1. Try Zora SDK createTradeCall first");
  console.log("      2. Parse the result for price information");
  console.log("      3. Fall back to simulation if quote fails");
  console.log("      4. Cache prices to avoid excessive API calls");

}

// Helper function to convert hex string to bytes
function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }
  return bytes;
}

if (import.meta.main) {
  testPriceQueryingOptions();
}