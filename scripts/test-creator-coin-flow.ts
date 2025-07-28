#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test the new creator coin detection flow end-to-end
 */

import { load } from "@std/dotenv";
import { ZoraProfileService } from "../src/services/zora-profile-service.ts";
import { EthosService } from "../src/services/ethos-service.ts";

async function testCreatorCoinFlow() {
  try {
    console.log("🧪 Testing Creator Coin Detection Flow...\n");

    // Load environment variables
    await load({ export: true });

    // Initialize services
    const zoraProfileService = new ZoraProfileService();
    const ethosService = new EthosService();

    // Test with the user's example creator
    const testCreatorAddress = "0xb23683915011f78a7ed30c8484d6c83f420795e8"; // From user's example
    
    console.log(`🎯 Testing with creator: ${testCreatorAddress}\n`);

    // Step 1: Get Zora profile
    console.log("📋 Step 1: Getting Zora Profile...");
    const creatorProfile = await zoraProfileService.getProfileByAddress(testCreatorAddress);
    
    if (!creatorProfile) {
      console.log("❌ No Zora profile found - this would be skipped in bot");
      return;
    }

    console.log("✅ Profile found!");
    console.log(`   Handle: ${creatorProfile.handle || 'None'}`);
    console.log(`   Display Name: ${creatorProfile.displayName || 'None'}`);
    console.log(`   Twitter: ${creatorProfile.twitterUsername ? '@' + creatorProfile.twitterUsername : 'None'}`);
    console.log(`   Bio: ${creatorProfile.bio ? creatorProfile.bio.slice(0, 100) + '...' : 'None'}`);

    // Step 2: Check if creator coin
    console.log("\n📋 Step 2: Checking if Creator Coin...");
    const isCreatorCoin = zoraProfileService.isCreatorCoin(creatorProfile);
    console.log(`   Is Creator Coin: ${isCreatorCoin ? '✅ YES' : '❌ NO'}`);
    
    if (isCreatorCoin) {
      console.log(`   Creator Coin Address: ${creatorProfile.creatorCoinAddress}`);
      console.log(`   Market Cap: ${creatorProfile.creatorCoinMarketCap || 'Unknown'}`);
    }

    if (!isCreatorCoin) {
      console.log("❌ Not a creator coin - this would be skipped in bot");
      return;
    }

    // Step 3: Get Ethos score
    console.log("\n📋 Step 3: Getting Ethos Score...");
    let ethosScore: number | null = null;
    let scoreSource = "";

    if (creatorProfile.twitterUsername) {
      console.log(`   🐦 Trying Twitter: @${creatorProfile.twitterUsername}`);
      ethosScore = await ethosService.getScoreByTwitterUsername(creatorProfile.twitterUsername);
      scoreSource = `Twitter @${creatorProfile.twitterUsername}`;
    }

    if (ethosScore === null) {
      console.log(`   🔍 Trying address: ${testCreatorAddress}`);
      ethosScore = await ethosService.getScoreByAddress(testCreatorAddress);
      scoreSource = `Address ${testCreatorAddress}`;
    }

    if (ethosScore === null) {
      console.log("❌ No Ethos score found - this would be skipped in bot");
      return;
    }

    console.log(`✅ Ethos score found: ${ethosScore}`);
    console.log(`   Source: ${scoreSource}`);
    console.log(`   Risk: ${ethosService.getRiskAssessment(ethosScore)}`);

    // Step 4: Check threshold
    console.log("\n📋 Step 4: Checking Threshold...");
    const minThreshold = 750; // Default threshold
    const meetsThreshold = ethosService.meetsScoreThreshold(ethosScore, minThreshold);
    
    console.log(`   Score: ${ethosScore}`);
    console.log(`   Threshold: ${minThreshold}`);
    console.log(`   Meets Threshold: ${meetsThreshold ? '✅ YES' : '❌ NO'}`);

    // Final result
    console.log("\n🎯 FINAL RESULT:");
    
    if (meetsThreshold) {
      console.log("🚀 CREATOR COIN QUALIFIES FOR TRADING!");
      console.log("   ✅ Has Zora profile");
      console.log("   ✅ Is a creator coin");
      console.log("   ✅ Has Ethos score");
      console.log("   ✅ Meets score threshold");
      console.log("   📈 Bot would evaluate this for trading!");
    } else {
      console.log("❌ Creator coin does not qualify");
      console.log(`   Score ${ethosScore} is below threshold ${minThreshold}`);
      console.log("   Bot would skip this creator coin");
    }

    // Test with a few more random creators
    console.log("\n📊 Testing with more creator addresses...");
    const moreCreators = [
      "0xa14f0e58c2c9938236c2428158b837200b7ea691", // Another creator from logs
      "0x904886eac1e6cd3a485617fd170b08b5dbbfaaf2", // Another creator from logs
    ];

    for (const creatorAddr of moreCreators) {
      console.log(`\n🔍 Testing ${creatorAddr}:`);
      const profile = await zoraProfileService.getProfileByAddress(creatorAddr);
      
      if (!profile) {
        console.log("   ❌ No profile");
        continue;
      }

      const hasCreatorCoin = zoraProfileService.isCreatorCoin(profile);
      const hasTwitter = !!profile.twitterUsername;
      
      console.log(`   Profile: ${profile.handle || profile.displayName || 'Unnamed'}`);
      console.log(`   Creator Coin: ${hasCreatorCoin ? '✅' : '❌'}`);
      console.log(`   Twitter: ${hasTwitter ? `✅ @${profile.twitterUsername}` : '❌'}`);
      
      if (hasCreatorCoin && hasTwitter) {
        console.log("   🎯 Would qualify for enhanced scoring!");
      }
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testCreatorCoinFlow();
} 