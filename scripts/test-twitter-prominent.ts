#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test Twitter extraction with more prominent creators
 */

import { load } from "@std/dotenv";
import { ZoraProfileService } from "../src/services/zora-profile-service.ts";

async function testProminentCreators() {
  try {
    console.log("🌟 Testing Twitter Extraction with Prominent Creators...\n");

    await load({ export: true });
    const zoraProfileService = new ZoraProfileService();

    // Let's try some well-known addresses from the Zora ecosystem
    // These are addresses that might be more likely to have social connections
    const prominentAddresses = [
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // Vitalik Buterin
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Common test address
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", // Another common test
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", // Hardhat test
      // Add some random recent creators with higher market caps
      "0xc36183514d88f3486cd5f3e9a14e09ddf0bbcea8", // Recent creator from logs
    ];

    let foundWithTwitter = 0;
    let totalFound = 0;

    for (const address of prominentAddresses) {
      console.log(`🔍 Testing: ${address}`);
      
      const profile = await zoraProfileService.getProfileByAddress(address);
      
      if (!profile) {
        console.log("   ❌ No profile found");
        continue;
      }

      totalFound++;
      console.log(`   ✅ Profile: ${profile.handle || profile.displayName || 'Unnamed'}`);
      
      if (profile.twitterUsername) {
        foundWithTwitter++;
        console.log(`   🐦 Twitter: @${profile.twitterUsername} ✅`);
      } else {
        console.log("   ❌ No Twitter connected");
      }

      if (profile.instagramUsername) {
        console.log(`   📸 Instagram: @${profile.instagramUsername}`);
      }

      if (profile.tiktokUsername) {
        console.log(`   🎵 TikTok: @${profile.tiktokUsername}`);
      }

      console.log("");
    }

    console.log("📊 RESULTS:");
    console.log(`   Profiles found: ${totalFound}/${prominentAddresses.length}`);
    console.log(`   With Twitter: ${foundWithTwitter}/${totalFound}`);

    if (foundWithTwitter === 0) {
      console.log("\n🤔 Still no Twitter accounts found.");
      console.log("This suggests:");
      console.log("1. Twitter integration may be less common on Zora");
      console.log("2. Our fallback to address-based scoring is crucial");
      console.log("3. Need to test bot with both strategies");
    }

    // Let's also test what the raw response looks like
    if (totalFound > 0) {
      console.log("\n🔍 Let's examine the raw social accounts structure...");
      const firstProfile = await zoraProfileService.getProfileByAddress(prominentAddresses[0]);
      // This will help us debug if we're missing something
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  testProminentCreators();
} 