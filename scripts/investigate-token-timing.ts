#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

async function investigateTokenTiming() {
  try {
    console.log("🕵️ INVESTIGATING TOKEN TIMING ISSUE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
    });

    const tokenAddress = "0xe94d01531125948ed84309063c002d7c72ae62b5";
    console.log(`🎯 INVESTIGATING TOKEN: ${tokenAddress}`);
    console.log("");

    // Step 1: Check if this token actually exists
    console.log("📊 STEP 1: TOKEN EXISTENCE CHECK");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    try {
      const code = await publicClient.getBytecode({ address: tokenAddress as `0x${string}` });
      console.log(`   Contract exists: ${code && code !== '0x' ? '✅ YES' : '❌ NO'}`);
      console.log(`   Bytecode length: ${code ? code.length : 0} chars`);
    } catch (error) {
      console.log(`   ❌ Error checking contract: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Step 2: Find the actual creation event for this token
    console.log("");
    console.log("📊 STEP 2: FIND TOKEN CREATION EVENT");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const currentBlock = await publicClient.getBlockNumber();
    console.log(`   Current block: ${currentBlock}`);
    
    // Search back a reasonable amount (last 50,000 blocks = ~7 days)
    const searchFromBlock = currentBlock - 50000n;
    console.log(`   Searching from block: ${searchFromBlock} to ${currentBlock}`);

    // Look for events from Zora Factory that created this specific token
    const ZORA_FACTORY_ADDRESS = "0x777777751622c0d3258f214F9DF38E35BF45baF3";
    
    try {
      // Search in chunks to avoid RPC limits
      const chunkSize = 5000n;
      let foundEvents = [];
      
      for (let fromBlock = searchFromBlock; fromBlock < currentBlock; fromBlock += chunkSize) {
        const toBlock = fromBlock + chunkSize > currentBlock ? currentBlock : fromBlock + chunkSize;
        
        console.log(`   🔍 Searching blocks ${fromBlock} to ${toBlock}...`);
        
        const logs = await publicClient.getLogs({
          address: ZORA_FACTORY_ADDRESS as `0x${string}`,
          fromBlock: fromBlock,
          toBlock: toBlock,
        });

        // Check if any of these events reference our token
        for (const log of logs) {
          if (log.data && log.data.includes(tokenAddress.slice(2).toLowerCase())) {
            foundEvents.push({
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              data: log.data
            });
          }
        }
      }

      console.log(`   📋 Found ${foundEvents.length} events referencing this token`);

      if (foundEvents.length > 0) {
        for (const event of foundEvents) {
          console.log("");
          console.log(`   🎯 EVENT FOUND:`);
          console.log(`      Block: ${event.blockNumber}`);
          console.log(`      TX: ${event.transactionHash}`);
          
          // Get block timestamp
          const blockInfo = await publicClient.getBlock({ blockNumber: event.blockNumber! });
          const eventTime = new Date(Number(blockInfo.timestamp) * 1000);
          const hoursAgo = (Date.now() - eventTime.getTime()) / (1000 * 60 * 60);
          
          console.log(`      Time: ${eventTime.toISOString()}`);
          console.log(`      Age: ${hoursAgo.toFixed(1)} hours ago`);
          
          if (hoursAgo > 2) {
            console.log(`      ⚠️  This token was created ${hoursAgo.toFixed(1)} hours ago!`);
            console.log(`      🚨 Bot should NOT have detected this as a fresh creation`);
          } else {
            console.log(`      ✅ This is a recent creation (within monitoring window)`);
          }
        }
      } else {
        console.log("   ❌ No creation events found for this token in recent blocks");
        console.log("   💡 This token might be very old or created outside our search window");
      }

    } catch (error) {
      console.log(`   ❌ Error searching for events: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Step 3: Check current filtering parameters
    console.log("");
    console.log("📊 STEP 3: CURRENT FILTERING PARAMETERS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   Max event age: 10 blocks (~2 minutes)");
    console.log("   Must be newer than bot startup");
    console.log("   Must have timestamp after startup");
    console.log("");
    console.log("🔍 POTENTIAL ISSUES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. Bot startup time might be wrong");
    console.log("2. Event filtering logic might have a bug");
    console.log("3. We might be detecting a different event type");
    console.log("4. Block/timestamp comparison might be incorrect");

  } catch (error) {
    console.error(`❌ Investigation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  investigateTokenTiming();
}