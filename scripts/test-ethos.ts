#!/usr/bin/env deno run --allow-net

/**
 * Simple test script to verify Ethos API integration
 * Usage: deno run --allow-net scripts/test-ethos.ts
 */

import { EthosService } from "../src/services/ethos-service.ts";

async function testEthosAPI() {
  console.log("🧪 Testing Ethos API integration...");
  
  const ethosService = new EthosService();
  
  // Test addresses (you can replace with real addresses to test)
  const testAddresses = [
    "0x7696f9208f9e195ba31e6f4B2D07B6462C8C42bb", // Example address
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
  ];
  
  console.log("\n📊 Testing address score lookups:");
  
  for (const address of testAddresses) {
    try {
      console.log(`\nChecking ${address}...`);
      
      const score = await ethosService.getScoreByAddress(address);
      if (score !== null) {
        console.log(`✅ Score: ${score}`);
        console.log(`📈 Risk Assessment: ${ethosService.getRiskAssessment(score)}`);
        console.log(`🎯 Meets 750 threshold: ${ethosService.meetsScoreThreshold(score, 750) ? "YES" : "NO"}`);
        
        // Also try to get full profile
        const profile = await ethosService.getProfileByAddress(address);
        if (profile) {
          console.log(`👤 Profile: ${profile.twitterHandle || "No Twitter"} | Reviews: +${profile.positiveReviews}/-${profile.negativeReviews}`);
        }
      } else {
        console.log("❌ No score found");
      }
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log("\n🔍 Testing Twitter handle search:");
  
  // Test Twitter search (if we have any known handles)
  const testTwitterHandles = ["vitalik", "ethosnet"];
  
  for (const handle of testTwitterHandles) {
    try {
      console.log(`\nSearching for @${handle}...`);
      const profiles = await ethosService.searchProfilesByTwitter(handle);
      
      if (profiles.length > 0) {
        console.log(`✅ Found ${profiles.length} profile(s)`);
        for (const profile of profiles) {
          console.log(`   📊 ${profile.primaryAddress}: Score ${profile.score}`);
        }
      } else {
        console.log("❌ No profiles found");
      }
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log("\n✅ Ethos API test completed!");
}

if (import.meta.main) {
  testEthosAPI().catch(console.error);
} 