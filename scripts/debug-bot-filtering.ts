#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Debug the bot's filtering logic with the problematic creator
 */

import { load } from "@std/dotenv";
import { ZoraProfileService } from "../src/services/zora-profile-service.ts";
import { EthosService } from "../src/services/ethos-service.ts";

async function debugBotFiltering() {
  try {
    console.log("🔍 Debugging Bot Filtering Logic...\n");

    await load({ export: true });
    
    const zoraProfileService = new ZoraProfileService();
    const ethosService = new EthosService();

    const problemCreator = "0x49925bcf1eb68486ffa495086b5ce4a892adcb2b";
    
    console.log(`🎯 Testing with problematic creator: ${problemCreator}`);
    console.log("Expected: Should be filtered out at step 2 or 3\n");

    // Simulate the bot's filtering process step by step
    console.log("📋 SIMULATING BOT FILTERING PROCESS:");
    
    // Step 1: Get Zora profile
    console.log("\n🔍 Step 1: Getting Zora Profile...");
    const creatorProfile = await zoraProfileService.getProfileByAddress(problemCreator);
    
    if (!creatorProfile) {
      console.log("❌ STEP 1 FAIL: No Zora profile - should be filtered here");
      console.log("✅ Bot behavior: Would log 'No Zora profile - SKIPPED' and return");
      return;
    }
    
    console.log("✅ Step 1 PASS: Profile found");
    console.log(`   Handle: ${creatorProfile.handle || 'None'}`);
    console.log(`   Display Name: ${creatorProfile.displayName || 'None'}`);

    // Step 2: Check creator coin
    console.log("\n🔍 Step 2: Checking Creator Coin...");
    const hasCreatorCoin = zoraProfileService.isCreatorCoin(creatorProfile);
    
    if (!hasCreatorCoin) {
      console.log("❌ STEP 2 FAIL: No creator coin - should be filtered here");
      console.log("✅ Bot behavior: Would log 'No creator coin - SKIPPED' and return");
      return;
    }
    
    console.log("✅ Step 2 PASS: Has creator coin");
    console.log(`   Creator Coin Address: ${creatorProfile.creatorCoinAddress}`);

    // Step 3: Check Twitter
    console.log("\n🔍 Step 3: Checking Twitter Account...");
    if (!creatorProfile.twitterUsername) {
      console.log("❌ STEP 3 FAIL: No Twitter - should be filtered here");
      console.log("✅ Bot behavior: Would log 'No Twitter - SKIPPED' and return");
      return;
    }
    
    console.log("✅ Step 3 PASS: Has Twitter");
    console.log(`   Twitter: @${creatorProfile.twitterUsername}`);

    // Step 4: Check Ethos score
    console.log("\n🔍 Step 4: Checking Ethos Score...");
    const ethosScore = await ethosService.getScoreByTwitterUsername(creatorProfile.twitterUsername);
    
    if (ethosScore === null) {
      console.log("❌ STEP 4 FAIL: No Ethos score - should be filtered here");
      console.log("✅ Bot behavior: Would log 'No Ethos score - SKIPPED' and return");
      return;
    }

    console.log("✅ Step 4 PASS: Has Ethos score");
    console.log(`   Score: ${ethosScore}`);

    // Step 5: Check threshold
    console.log("\n🔍 Step 5: Checking Score Threshold...");
    const minThreshold = 750; // Default
    const meetsThreshold = ethosService.meetsScoreThreshold(ethosScore, minThreshold);
    
    if (!meetsThreshold) {
      console.log("❌ STEP 5 FAIL: Score too low - should be filtered here");
      console.log("✅ Bot behavior: Would log 'Score too low - SKIPPED' and return");
      return;
    }

    console.log("✅ STEP 5 PASS: Meets threshold - WOULD TRADE!");
    console.log("🚨 ERROR: This creator should NOT have passed all filters!");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  debugBotFiltering();
} 