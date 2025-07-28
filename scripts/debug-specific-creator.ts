#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Debug script to investigate the specific creator coin issue
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { Config } from "../src/config/config.ts";
import { ZoraProfileService } from "../src/services/zora-profile-service.ts";

async function debugSpecificCreator() {
  try {
    console.log("🔍 Debugging Specific Creator Issue...\n");

    await load({ export: true });
    const config = Config.load();
    const zoraProfileService = new ZoraProfileService();

    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    // User mentioned this creator address from BaseScan
    const creatorAddress = "0x49925bcf1eb68486ffa495086b5ce4a892adcb2b" as Address;
    
    console.log(`🎯 Investigating creator: ${creatorAddress}`);
    console.log("User report: Coin created 24 hours ago, name doesn't match\n");

    // 1. Check Zora profile
    console.log("📋 Step 1: Checking Zora Profile...");
    const profile = await zoraProfileService.getProfileByAddress(creatorAddress);
    
    if (profile) {
      console.log(`✅ Profile found:`);
      console.log(`   Handle: ${profile.handle || 'None'}`);
      console.log(`   Display Name: ${profile.displayName || 'None'}`);
      console.log(`   Twitter: ${profile.twitterUsername ? '@' + profile.twitterUsername : 'None'}`);
      console.log(`   Creator Coin: ${profile.creatorCoinAddress || 'None'}`);
      console.log(`   Market Cap: ${profile.creatorCoinMarketCap || 'Unknown'}`);
    } else {
      console.log("❌ No Zora profile found");
    }

    // 2. Check recent factory events for this creator
    console.log("\n📋 Step 2: Checking Recent Factory Events...");
    
    const currentBlock = await publicClient.getBlockNumber();
    const searchBlocks = 2000n; // Last 2000 blocks (~7 hours)
    const fromBlock = currentBlock - searchBlocks;
    
    console.log(`   Searching blocks ${fromBlock} to ${currentBlock}`);
    
    const factoryLogs = await publicClient.getLogs({
      address: config.zoraFactoryAddress as Address,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`   Total factory events: ${factoryLogs.length}`);

    // Filter for events mentioning this creator
    const creatorEvents = factoryLogs.filter(log => {
      if (log.topics.length >= 2) {
        const caller = `0x${log.topics[1]!.slice(-40)}`;
        return caller.toLowerCase() === creatorAddress.toLowerCase();
      }
      return false;
    });

    console.log(`   Events for this creator: ${creatorEvents.length}`);

    if (creatorEvents.length > 0) {
      console.log("\n📅 Creator Events Found:");
      
      for (const event of creatorEvents) {
        const blockInfo = await publicClient.getBlock({ blockNumber: event.blockNumber });
        const timeAgo = Math.floor((Date.now() / 1000) - Number(blockInfo.timestamp));
        const hoursAgo = Math.floor(timeAgo / 3600);
        const minutesAgo = Math.floor((timeAgo % 3600) / 60);
        
        console.log(`   📅 Block ${event.blockNumber}:`);
        console.log(`      Time: ${hoursAgo}h ${minutesAgo}m ago`);
        console.log(`      TX: ${event.transactionHash}`);
        console.log(`      Topic: ${event.topics[0]}`);
        
        // Try to parse the coin name from the event data
        try {
          const dataHex = event.data.slice(2); // Remove 0x
          
          // Basic parsing attempt - look for string data
          let extractedName = "Unknown";
          
          // Try to find ASCII text in the data
          for (let i = 0; i < dataHex.length - 8; i += 2) {
            const chunk = dataHex.slice(i, i + 64); // 32 bytes
            try {
              const bytes = new Uint8Array(chunk.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
              const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\0/g, '');
              if (text.length > 2 && text.length < 50 && /^[a-zA-Z0-9\s\-_]+$/.test(text)) {
                extractedName = text;
                break;
              }
            } catch {}
          }
          
          console.log(`      Parsed Name: "${extractedName}"`);
        } catch (error) {
          console.log(`      Parse Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } else {
      console.log("   ❌ No recent events found for this creator");
    }

    // 3. Check what our bot would detect
    console.log("\n📋 Step 3: Bot Detection Analysis...");
    
    if (creatorEvents.length === 0) {
      console.log("❓ ISSUE: No recent events found, but bot claims to have detected this creator");
      console.log("   Possible causes:");
      console.log("   1. Bot processed an old event from startup");
      console.log("   2. Event parsing is incorrect");
      console.log("   3. Different creator address was actually involved");
    } else {
      const latestEvent = creatorEvents[0];
      const blockInfo = await publicClient.getBlock({ blockNumber: latestEvent.blockNumber });
      const hoursAgo = Math.floor((Date.now() / 1000 - Number(blockInfo.timestamp)) / 3600);
      
      if (hoursAgo > 1) {
        console.log(`⚠️  TIMING ISSUE: Latest event was ${hoursAgo} hours ago`);
        console.log("   Bot should only process very recent events");
      } else {
        console.log(`✅ Recent event found (${hoursAgo} hours ago)`);
      }
    }

    console.log("\n💡 DEBUGGING RECOMMENDATIONS:");
    console.log("1. Check bot's lastProcessedBlock to ensure it's current");
    console.log("2. Verify event parsing is extracting correct coin names");
    console.log("3. Ensure bot only processes events from last few minutes");
    console.log("4. Cross-reference coin address with actual Zora coin data");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  debugSpecificCreator();
} 