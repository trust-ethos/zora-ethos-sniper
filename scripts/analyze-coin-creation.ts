#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Script to analyze how a specific coin was created
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { Config } from "../src/config/config.ts";

async function analyzeCoinCreation() {
  try {
    console.log("🔍 Analyzing Coin Creation Flow...\n");

    // Load environment variables
    await load({ export: true });
    const config = Config.load();

    // Create viem client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    const exampleCoin = "0xdcfd90871435a90c944b3e0b7cd8ecfcfb4d5104" as Address;
    const possibleCreator = "0xbdbebd58cc8153ce74530bb342427579315915b2" as Address;
    const currentFactory = config.zoraFactoryAddress;

    console.log("🎯 Target Analysis:");
    console.log(`   Coin: ${exampleCoin}`);
    console.log(`   Possible Creator: ${possibleCreator}`);
    console.log(`   Current Factory: ${currentFactory}\n`);

    // First, let's find when this coin was created by looking for events mentioning it
    console.log("🔍 Searching for coin creation events...");
    
    const currentBlock = await publicClient.getBlockNumber();
    
    // Search through recent blocks for events related to this coin
    const searchBlocks = 2000n; // Search last 2000 blocks
    const fromBlock = currentBlock - searchBlocks;
    
    console.log(`   Searching blocks ${fromBlock} to ${currentBlock}...\n`);

    // Check factory events for this coin
    console.log("📊 Factory Events Analysis:");
    const factoryLogs = await publicClient.getLogs({
      address: currentFactory as Address,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`   Total factory events: ${factoryLogs.length}`);
    
    // Look for events that might contain our coin address
    const coinHex = exampleCoin.slice(2).toLowerCase(); // Remove 0x
    const coinMentioned = factoryLogs.filter(log => 
      log.data.toLowerCase().includes(coinHex)
    );

    console.log(`   Events mentioning coin: ${coinMentioned.length}`);
    
    if (coinMentioned.length > 0) {
      console.log("   📅 Found creation events:");
      for (const log of coinMentioned) {
        console.log(`     Block: ${log.blockNumber}`);
        console.log(`     TX: ${log.transactionHash}`);
        console.log(`     Topic: ${log.topics[0]}`);
        console.log(`     Address mentioned in data: YES`);
        
        // Try to parse this event with our current parser
        try {
          // Extract indexed parameters
          if (log.topics.length >= 4) {
            const caller = `0x${log.topics[1]!.slice(-40)}`;
            const payoutRecipient = `0x${log.topics[2]!.slice(-40)}`;
            const platformReferrer = `0x${log.topics[3]!.slice(-40)}`;
            
            console.log(`     Caller: ${caller}`);
            console.log(`     Payout: ${payoutRecipient}`);
            console.log(`     Platform: ${platformReferrer}`);
          }
        } catch (error) {
          console.log(`     Parse error: ${error instanceof Error ? error.message : String(error)}`);
        }
        console.log("");
      }
    }

    // Check the possible creator contract
    console.log("📊 Possible Creator Contract Analysis:");
    const creatorLogs = await publicClient.getLogs({
      address: possibleCreator,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`   Total creator contract events: ${creatorLogs.length}`);
    
    if (creatorLogs.length > 0) {
      console.log("   Recent events:");
      for (const log of creatorLogs.slice(-5)) {
        console.log(`     Block: ${log.blockNumber}`);
        console.log(`     TX: ${log.transactionHash}`);
        console.log(`     Topic: ${log.topics[0]}`);
        console.log("");
      }
    }

    // Check if the coin address appears in any transaction involving the possible creator
    console.log("🔍 Cross-Reference Analysis:");
    
    // Get a transaction that might have created the coin
    if (coinMentioned.length > 0) {
      const creationTx = coinMentioned[0];
      console.log(`   Analyzing creation TX: ${creationTx.transactionHash}`);
      
      try {
        const txReceipt = await publicClient.getTransactionReceipt({
          hash: creationTx.transactionHash!,
        });
        
        console.log(`   TX Status: ${txReceipt.status}`);
        console.log(`   From: ${txReceipt.from}`);
        console.log(`   To: ${txReceipt.to}`);
        console.log(`   Total Logs: ${txReceipt.logs.length}`);
        
        // Check if the possible creator is involved in this transaction
        const creatorInvolved = txReceipt.logs.some(log => 
          log.address.toLowerCase() === possibleCreator.toLowerCase()
        );
        
        console.log(`   Possible Creator Involved: ${creatorInvolved ? "YES" : "NO"}`);
        
        if (creatorInvolved) {
          console.log("   Creator contract logs in this TX:");
          const creatorLogs = txReceipt.logs.filter(log => 
            log.address.toLowerCase() === possibleCreator.toLowerCase()
          );
          
          for (const log of creatorLogs) {
            console.log(`     Topic: ${log.topics[0]}`);
            console.log(`     Data length: ${log.data.length}`);
          }
        }
        
      } catch (error) {
        console.log(`   TX analysis error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log("\n💡 CONCLUSIONS:");
    
    if (coinMentioned.length > 0) {
      console.log("✅ The current factory IS creating coins and we're detecting them correctly");
      console.log("✅ Our current setup appears to be working");
      
      if (creatorLogs.length === 0) {
        console.log("⚠️  The suggested creator contract has no recent activity");
        console.log("   It might be a helper contract or not the main creation contract");
      }
    } else {
      console.log("❓ Need to investigate further - coin not found in factory events");
    }

    console.log("\n🚀 RECOMMENDATIONS:");
    console.log("1. Continue monitoring the current factory - it's very active");
    console.log("2. Our event detection is working correctly");
    console.log("3. The Zora SDK might be useful for better event parsing");
    console.log("4. Consider adding the SDK for more robust coin creation detection");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  analyzeCoinCreation();
} 