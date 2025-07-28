#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Debug script to examine raw Zora profile responses
 */

import { load } from "@std/dotenv";
import { getProfile } from "@zoralabs/coins-sdk";

async function debugZoraResponse() {
  try {
    console.log("🔍 Debugging Raw Zora Profile Responses...\n");

    await load({ export: true });

    // Test with one of our creator addresses
    const testAddress = "0xb23683915011f78a7ed30c8484d6c83f420795e8";
    
    console.log(`Testing with: ${testAddress}\n`);

    const response = await getProfile({
      identifier: testAddress,
    });

    console.log("📋 RAW RESPONSE STRUCTURE:");
    console.log(JSON.stringify(response, null, 2));

    const profile = response?.data?.profile;
    
    if (profile) {
      console.log("\n📋 PROFILE OBJECT:");
      console.log(JSON.stringify(profile, null, 2));

      console.log("\n🔍 SOCIAL ACCOUNTS DETAILED:");
      console.log("socialAccounts:", profile.socialAccounts);
      
      if (profile.socialAccounts) {
        console.log("twitter:", profile.socialAccounts.twitter);
        console.log("instagram:", profile.socialAccounts.instagram);
        console.log("tiktok:", profile.socialAccounts.tiktok);
      }

      console.log("\n🔍 LINKED WALLETS:");
      console.log("linkedWallets:", profile.linkedWallets);

      console.log("\n🔍 ALL PROFILE KEYS:");
      console.log("Available keys:", Object.keys(profile));
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  debugZoraResponse();
} 