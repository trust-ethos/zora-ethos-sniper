#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test Twitter username extraction from Zora profiles
 */

import { load } from "@std/dotenv";
import { ZoraProfileService } from "../src/services/zora-profile-service.ts";
import { EthosService } from "../src/services/ethos-service.ts";

async function testTwitterExtraction() {
  try {
    console.log("🐦 Testing Twitter Username Extraction from Zora Profiles...\n");

    // Load environment variables
    await load({ export: true });

    // Initialize services
    const zoraProfileService = new ZoraProfileService();
    const ethosService = new EthosService();

    // Test with several known creator addresses
    const testCreators = [
      "0xb23683915011f78a7ed30c8484d6c83f420795e8", // User's example
      "0xa14f0e58c2c9938236c2428158b837200b7ea691", // Another creator from logs
      "0x904886eac1e6cd3a485617fd170b08b5dbbfaaf2", // Another creator from logs
      "0xfb55ef2fb06a01687fed044c105b0a6ed62aa9e0", // Recent creator from logs
      "0xeb3e4f86cbbcdf51677a40e9126c84389a9b2527", // Another recent creator
    ];

    let foundTwitterAccounts = 0;
    let totalProfiles = 0;
    let successfulEthosScores = 0;

    for (const creatorAddress of testCreators) {
      console.log(`🔍 Testing creator: ${creatorAddress}`);
      
      // Get Zora profile
      const profile = await zoraProfileService.getProfileByAddress(creatorAddress);
      
      if (!profile) {
        console.log("   ❌ No Zora profile found\n");
        continue;
      }

      totalProfiles++;
      
      console.log(`   ✅ Profile found: ${profile.handle || profile.displayName || 'Unnamed'}`);
      
      // Check for Twitter
      if (profile.twitterUsername) {
        foundTwitterAccounts++;
        console.log(`   🐦 Twitter: @${profile.twitterUsername}`);
        
        // Test Ethos scoring with Twitter username
        console.log(`   📊 Testing Ethos score via Twitter...`);
        const twitterScore = await ethosService.getScoreByTwitterUsername(profile.twitterUsername);
        
        if (twitterScore !== null) {
          successfulEthosScores++;
          console.log(`   ✅ Ethos score: ${twitterScore} (via Twitter)`);
        } else {
          console.log(`   ❌ No Ethos score found for @${profile.twitterUsername}`);
        }
      } else {
        console.log("   ❌ No Twitter account connected");
      }

      // Show other social accounts if available
      if (profile.instagramUsername) {
        console.log(`   📸 Instagram: @${profile.instagramUsername}`);
      }
      if (profile.tiktokUsername) {
        console.log(`   🎵 TikTok: @${profile.tiktokUsername}`);
      }

      // Creator coin info
      if (profile.creatorCoinAddress) {
        console.log(`   🪙 Creator Coin: ${profile.creatorCoinAddress}`);
        console.log(`   💰 Market Cap: ${profile.creatorCoinMarketCap || 'Unknown'}`);
      }

      if (profile.bio) {
        console.log(`   📝 Bio: ${profile.bio.slice(0, 80)}${profile.bio.length > 80 ? '...' : ''}`);
      }

      console.log(""); // Empty line between profiles
    }

    // Summary
    console.log("📊 SUMMARY:");
    console.log(`   Total Profiles Found: ${totalProfiles}/${testCreators.length}`);
    console.log(`   Profiles with Twitter: ${foundTwitterAccounts}/${totalProfiles} (${Math.round(foundTwitterAccounts/totalProfiles*100)}%)`);
    console.log(`   Successful Ethos Scores: ${successfulEthosScores}/${foundTwitterAccounts}`);

    console.log("\n💡 INSIGHTS:");
    
    if (foundTwitterAccounts > 0) {
      console.log(`✅ Twitter extraction is working! Found ${foundTwitterAccounts} connected accounts`);
      
      if (successfulEthosScores > 0) {
        console.log(`✅ Twitter-based Ethos scoring is working! ${successfulEthosScores} successful scores`);
      } else {
        console.log(`⚠️  Twitter accounts found but no Ethos scores - may need different usernames or accounts not in Ethos`);
      }
    } else {
      console.log("❌ No Twitter accounts found in any profiles tested");
      console.log("   This could mean:");
      console.log("   1. These specific creators don't have Twitter connected");
      console.log("   2. Our extraction method needs adjustment");
      console.log("   3. Need to test with different creator addresses");
    }

    const twitterRate = totalProfiles > 0 ? Math.round(foundTwitterAccounts/totalProfiles*100) : 0;
    if (twitterRate >= 50) {
      console.log("🎯 High Twitter adoption rate - bot strategy is solid!");
    } else if (twitterRate >= 25) {
      console.log("⚠️  Medium Twitter adoption - fallback to address scoring is important");
    } else {
      console.log("🚨 Low Twitter adoption - address-based scoring will be primary method");
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testTwitterExtraction();
} 