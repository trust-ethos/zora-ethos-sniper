#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test the new Twitter-only strategy
 */

import { load } from "@std/dotenv";
import { ZoraProfileService } from "../src/services/zora-profile-service.ts";
import { EthosService } from "../src/services/ethos-service.ts";

async function testTwitterOnlyStrategy() {
  try {
    console.log("🐦 Testing Twitter-Only Creator Coin Strategy...\n");

    await load({ export: true });
    
    const zoraProfileService = new ZoraProfileService();
    const ethosService = new EthosService();

    // Test with our known creators 
    const testCreators = [
      "0xb23683915011f78a7ed30c8484d6c83f420795e8", // salntless (no Twitter)
      "0xa14f0e58c2c9938236c2428158b837200b7ea691", // dreamflow (no Twitter)
      "0x904886eac1e6cd3a485617fd170b08b5dbbfaaf2", // beetlejaws (no Twitter)
      "0xfb55ef2fb06a01687fed044c105b0a6ed62aa9e0", // feat (no Twitter)
      "0xeb3e4f86cbbcdf51677a40e9126c84389a9b2527", // caretoomuchbear (has TikTok, no Twitter)
    ];

    let totalProfiles = 0;
    let creatorCoins = 0;
    let withTwitter = 0;
    let qualifiedForTrading = 0;
    let skippedNoTwitter = 0;

    console.log("🔍 TESTING CREATOR FILTERING:\n");

    for (const creatorAddress of testCreators) {
      console.log(`📍 Testing: ${creatorAddress}`);
      
      // Step 1: Get Zora profile
      const profile = await zoraProfileService.getProfileByAddress(creatorAddress);
      
      if (!profile) {
        console.log("   ❌ No Zora profile - SKIP (Step 1 failed)");
        continue;
      }

      totalProfiles++;
      console.log(`   ✅ Profile found: ${profile.handle || profile.displayName || 'Unnamed'}`);

      // Step 2: Check creator coin
      if (!zoraProfileService.isCreatorCoin(profile)) {
        console.log("   ❌ No creator coin - SKIP (Step 2 failed)");
        continue;
      }

      creatorCoins++;
      console.log(`   ✅ Has creator coin: ${profile.creatorCoinAddress}`);

      // Step 3: Check Twitter (NEW REQUIREMENT)
      if (!profile.twitterUsername) {
        skippedNoTwitter++;
        console.log("   ❌ No Twitter account - SKIP (Step 3 failed) ⭐ NEW FILTER");
        console.log("");
        continue;
      }

      withTwitter++;
      console.log(`   ✅ Twitter connected: @${profile.twitterUsername}`);

      // Step 4: Get Ethos score
      const ethosScore = await ethosService.getScoreByTwitterUsername(profile.twitterUsername);
      
      if (ethosScore === null) {
        console.log(`   ❌ No Ethos score for @${profile.twitterUsername} - SKIP (Step 4 failed)`);
        console.log("");
        continue;
      }

      qualifiedForTrading++;
      console.log(`   ✅ Ethos score: ${ethosScore}`);
      console.log(`   🎯 Risk: ${ethosService.getRiskAssessment(ethosScore)}`);
      console.log(`   🚀 QUALIFIES FOR TRADING! ⭐`);
      console.log("");
    }

    // Summary
    console.log("📊 FILTERING RESULTS:");
    console.log(`   Total Creators Tested: ${testCreators.length}`);
    console.log(`   ✅ Step 1 - Has Zora Profile: ${totalProfiles}/${testCreators.length} (${Math.round(totalProfiles/testCreators.length*100)}%)`);
    console.log(`   ✅ Step 2 - Has Creator Coin: ${creatorCoins}/${totalProfiles} (${Math.round(creatorCoins/totalProfiles*100)}%)`);
    console.log(`   ❌ Step 3 - No Twitter (SKIPPED): ${skippedNoTwitter}/${creatorCoins} (${Math.round(skippedNoTwitter/creatorCoins*100)}%)`);
    console.log(`   ✅ Step 3 - Has Twitter: ${withTwitter}/${creatorCoins} (${Math.round(withTwitter/creatorCoins*100)}%)`);
    console.log(`   🚀 FINAL QUALIFIED: ${qualifiedForTrading}/${testCreators.length} (${Math.round(qualifiedForTrading/testCreators.length*100)}%)`);

    console.log("\n💡 STRATEGY ANALYSIS:");
    
    if (qualifiedForTrading === 0) {
      console.log("🎯 ULTRA-SELECTIVE: No creators qualified in this sample");
      console.log("   ✅ Excellent noise reduction - only premium creators will qualify");
      console.log("   ⚠️  May need larger sample size to find Twitter-connected creators");
      console.log("   📈 When qualified creators are found, confidence will be very high");
    } else {
      console.log(`🎯 SELECTIVE FILTERING: ${qualifiedForTrading}/${testCreators.length} creators qualified`);
      console.log("   ✅ Strategy working - filtering for premium creators only");
    }

    const twitterFilterEffectiveness = creatorCoins > 0 ? Math.round(skippedNoTwitter/creatorCoins*100) : 0;
    console.log(`\n🐦 TWITTER FILTER IMPACT:`);
    console.log(`   Eliminated: ${twitterFilterEffectiveness}% of creator coins for lacking Twitter`);
    console.log(`   Philosophy: Quality over quantity - better to miss some than trade low-confidence opportunities`);

    console.log("\n🎭 SIMULATION RECOMMENDATION:");
    console.log("   Run bot in simulation mode for extended period");
    console.log("   Monitor how many qualified creators are found per day/week");
    console.log("   Adjust thresholds based on actual qualified creator frequency");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testTwitterOnlyStrategy();
} 