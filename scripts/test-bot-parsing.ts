#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test script to verify bot event parsing
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { Config } from "../src/config/config.ts";
import { ZoraListener } from "../src/services/zora-listener.ts";
import { EthosService } from "../src/services/ethos-service.ts";
import { TradingBot } from "../src/services/trading-bot.ts";

async function testBotParsing() {
  try {
    console.log("🧪 Testing Bot Event Parsing...\n");

    // Load environment variables
    await load({ export: true });
    const config = Config.load();

    // Create services
    const ethosService = new EthosService();
    const tradingBot = new TradingBot(config, ethosService);
    const zoraListener = new ZoraListener(config, ethosService, tradingBot);

    // Create viem client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    console.log("🎯 Fetching events from block 33473406...");

    // Get the events we know exist
    const allLogs = await publicClient.getLogs({
      address: config.zoraFactoryAddress as Address,
      fromBlock: 33473406n,
      toBlock: 33473406n,
    });

    const coinCreationEvents = allLogs.filter(log => 
      log.topics[0] === "0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81"
    );

    console.log(`📊 Found ${coinCreationEvents.length} coin creation events`);

    for (const [index, log] of coinCreationEvents.entries()) {
      console.log(`\n🪙 Testing Event ${index + 1}:`);
      console.log(`   TX: ${log.transactionHash}`);
      
      try {
        // Test if the bot can parse this event
        const parsedEvent = (zoraListener as any).parseGenericEvent(log);
        
        if (parsedEvent) {
          console.log("   ✅ Successfully parsed!");
          console.log(`   📛 Name: ${parsedEvent.name}`);
          console.log(`   🏷️  Symbol: ${parsedEvent.symbol}`);
          console.log(`   🪙 Coin: ${parsedEvent.coin}`);
          console.log(`   👤 Creator: ${parsedEvent.caller}`);
          console.log(`   💰 Payout: ${parsedEvent.payoutRecipient}`);
          console.log(`   🔗 Platform: ${parsedEvent.platformReferrer}`);
          
          if (parsedEvent.uri && parsedEvent.uri !== "") {
            console.log(`   📎 URI: ${parsedEvent.uri}`);
          }
        } else {
          console.log("   ❌ Failed to parse event");
        }
      } catch (error) {
        console.log(`   ❌ Parse error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log("\n✅ Bot parsing test completed!");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testBotParsing();
} 