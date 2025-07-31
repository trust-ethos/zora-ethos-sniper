#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { tradeCoin, TradeParameters } from "@zoralabs/coins-sdk";

async function testZoraSDKTrading() {
  try {
    console.log("🎯 TESTING ZORA SDK TRADING");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });
    const config = Config.load();
    
    if (!config.privateKey) {
      throw new Error("PRIVATE_KEY required for testing");
    }

    // Setup wallet & clients
    const cleanKey = config.privateKey.startsWith('0x') 
      ? config.privateKey.slice(2) 
      : config.privateKey;
      
    const account = privateKeyToAccount(`0x${cleanKey}` as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(config.baseRpcUrl),
    });
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    // Target: NonbinaryJolteon creator coin
    const TARGET_CREATOR_COIN = "0x0e2be91d4ca447eac82022d248eae98f034a6840";
    const TRADE_AMOUNT = 0.001; // 1 ETH in smaller amount for testing

    console.log(`🎯 TRADE PARAMETERS:`);
    console.log(`   From: ETH`);
    console.log(`   To: ${TARGET_CREATOR_COIN} (NonbinaryJolteon)`);
    console.log(`   Amount: ${TRADE_AMOUNT} ETH`);
    console.log(`   Wallet: ${account.address}`);
    console.log("");

    if (config.dryRunMode) {
      console.log("🧪 DRY RUN MODE - Would execute SDK trade:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   SDK Function: tradeCoin()`);
      console.log(`   Parameters: ETH → Creator Coin`);
      console.log(`   Amount: ${TRADE_AMOUNT} ETH`);
      console.log(`   Slippage: 5%`);
      console.log(`   Success: ✅ Simulated`);
      return;
    }

    console.log("⚠️  LIVE MODE - Executing real trade using Zora SDK!");
    console.log("🚨 5 second countdown...");
    for (let i = 5; i > 0; i--) {
      console.log(`   ${i}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log("🚀 Executing SDK trade!");

    // Create trade parameters using official SDK format
    const tradeParameters: TradeParameters = {
      sell: { type: "eth" },
      buy: {
        type: "erc20",
        address: TARGET_CREATOR_COIN as `0x${string}`,
      },
      amountIn: parseEther(TRADE_AMOUNT.toString()),
      slippage: 0.05, // 5% slippage tolerance
      sender: account.address,
    };

    // Execute trade using official Zora SDK
    const receipt = await tradeCoin({
      tradeParameters,
      walletClient,
      account,
      publicClient,
      validateTransaction: true, // Keep validation enabled for safety
    });

    console.log(`✅ ZORA SDK TRADE SUCCESSFUL!`);
    console.log(`🔗 Transaction Hash: ${receipt.transactionHash}`);
    console.log(`🔗 BaseScan: https://basescan.org/tx/${receipt.transactionHash}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed}`);
    console.log(`💰 Effective Gas Price: ${receipt.effectiveGasPrice}`);

  } catch (error) {
    console.error(`❌ Zora SDK Trade Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  testZoraSDKTrading();
}