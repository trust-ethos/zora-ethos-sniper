#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { ZoraProfileService } from "../src/services/zora-profile-service.ts";
import { EthosService } from "../src/services/ethos-service.ts";

async function debugMagicianAFK() {
  try {
    console.log("🔍 DEBUGGING MAGICIANAFK ISSUE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });

    const zoraProfileService = new ZoraProfileService();
    const ethosService = new EthosService();

    // We need to find the actual creator address for magicianafk
    // Let's try a few approaches to identify this user

    console.log("📊 STEP 1: SEARCH STRATEGIES");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    // Strategy 1: Direct username lookup if we can find the address
    console.log("🔍 Strategy 1: Search by known information");
    console.log("   Username: magicianafk");
    console.log("   Expected Ethos Score: 1300");
    console.log("   Twitter shown in logs: @Mushahid 🖤 🟡♦️");
    console.log("");

    // Strategy 2: Test if the Twitter handle itself has an Ethos score
    console.log("📊 STEP 2: TESTING TWITTER HANDLE LOOKUP");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const twitterHandles = [
      "magicianafk",
      "Mushahid", // Clean version without emojis
      "mushahid", // Lowercase
    ];

    for (const handle of twitterHandles) {
      console.log(`\n🐦 Testing Twitter handle: @${handle}`);
      try {
        const ethosScore = await ethosService.getScoreByTwitterUsername(handle);
        console.log(`   ✅ Found Ethos score: ${ethosScore}`);
        
        // Test risk assessment
        const riskAssessment = ethosService.getRiskAssessment(ethosScore);
        console.log(`   🎯 Risk Assessment: ${riskAssessment}`);
        
        // Test if it meets threshold
        const meetsThreshold = ethosService.meetsScoreThreshold(ethosScore, 1226);
        console.log(`   📊 Meets 1226 threshold: ${meetsThreshold ? '✅ YES' : '❌ NO'}`);
        
      } catch (error) {
        console.log(`   ❌ No Ethos score found: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log("");

    // Strategy 3: Manual profile lookups for known patterns
    console.log("📊 STEP 3: MANUAL ANALYSIS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("🔍 Analysis of the disconnect:");
    console.log("   1. Coin creator username: 'magicianafk'");
    console.log("   2. Twitter handle found: '@Mushahid 🖤 🟡♦️'");
    console.log("   3. These appear to be different people!");
    console.log("");
    console.log("💡 Possible explanations:");
    console.log("   • The Zora profile for 'magicianafk' has @Mushahid linked as their Twitter");
    console.log("   • There's an old/incorrect Twitter connection in the profile");
    console.log("   • The actual @magicianafk Twitter has the 1300 Ethos score");
    console.log("   • The profile lookup is returning the wrong social account");

    console.log("");

    // Strategy 4: Test the expected correct lookup
    console.log("📊 STEP 4: TESTING EXPECTED CORRECT LOOKUP");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    console.log("\n🎯 Testing @magicianafk (expected correct Twitter):");
    try {
      const ethosScore = await ethosService.getScoreByTwitterUsername("magicianafk");
      console.log(`   ✅ Ethos score for @magicianafk: ${ethosScore}`);
      
      if (ethosScore === 1300) {
        console.log("   🎉 MATCH! This confirms @magicianafk has the expected score");
      } else {
        console.log(`   ⚠️  Score mismatch. Expected 1300, got ${ethosScore}`);
      }
      
      const meetsThreshold = ethosService.meetsScoreThreshold(ethosScore, 1226);
      console.log(`   📊 Would qualify for trading: ${meetsThreshold ? '✅ YES' : '❌ NO'}`);
      
    } catch (error) {
      console.log(`   ❌ No score for @magicianafk: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("");

    // Strategy 5: Show what our bot logic would do
    console.log("📊 STEP 5: BOT LOGIC SIMULATION");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("🤖 Current bot behavior:");
    console.log("   1. Coin created by 'magicianafk'");
    console.log("   2. Bot fetches Zora profile for creator");
    console.log("   3. Profile returns Twitter: '@Mushahid 🖤 🟡♦️'");
    console.log("   4. Bot looks up Ethos for '@Mushahid 🖤 🟡♦️'");
    console.log("   5. No Ethos score found → SKIP");
    console.log("");
    console.log("🔧 What SHOULD happen:");
    console.log("   1. Coin created by 'magicianafk'");
    console.log("   2. Bot should look up Ethos for '@magicianafk'");
    console.log("   3. Find score of 1300 → QUALIFY for trading");
    console.log("");
    console.log("🐛 The issue appears to be:");
    console.log("   • Zora profile has incorrect/old Twitter linked");
    console.log("   • OR we need to also check the creator username directly");
    console.log("   • OR there's a mapping issue in the Zora SDK");

    console.log("");
    console.log("💡 RECOMMENDATIONS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. Add fallback: if profile Twitter has no Ethos, try creator username");
    console.log("   2. Log both the creator username AND profile Twitter for debugging");
    console.log("   3. Consider checking both accounts for Ethos scores");
    console.log("   4. Add validation to catch these mismatches");

  } catch (error) {
    console.error(`❌ Debug failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  debugMagicianAFK();
}