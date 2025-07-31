#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { ZoraProfileService } from "../src/services/zora-profile-service.ts";
import { EthosService } from "../src/services/ethos-service.ts";

async function investigateMagicianAFKProfile() {
  try {
    console.log("🔍 INVESTIGATING MAGICIANAFK ZORA PROFILE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });

    const zoraProfileService = new ZoraProfileService();
    const ethosService = new EthosService();

    // We need to figure out what creator address is associated with magicianafk
    // Since we don't have the exact creator address from the logs, let's try different approaches

    console.log("📊 STEP 1: SEARCH FOR MAGICIANAFK");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    
    // First, let's see what we can find about magicianafk
    console.log("🔍 Attempting to find magicianafk profile...");
    console.log("   Note: We need a creator address to query the profile");
    console.log("   The coin creation event would have the creator address");
    console.log("");

    // Since we don't have the exact creator address, let's demonstrate what we would see
    // if we had it by showing the profile structure for a known user

    console.log("📊 STEP 2: SHOW PROFILE DATA STRUCTURE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    
    console.log("🔍 What we need to investigate:");
    console.log("   1. Creator address from the coin creation event");
    console.log("   2. Zora profile for that address");
    console.log("   3. All social accounts linked to that profile");
    console.log("   4. Compare with expected Twitter @magicianafk");
    console.log("");

    // Let's test our profile service to see what data structure we get
    console.log("📊 STEP 3: TEST PROFILE SERVICE STRUCTURE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    // Show what a typical profile looks like
    console.log("🔍 Example of profile data structure:");
    console.log("   {");
    console.log("     handle: 'username',");
    console.log("     displayName: 'Display Name',");
    console.log("     bio: 'User bio...',");
    console.log("     twitterUsername: 'twitter_handle',");
    console.log("     socialAccounts: [");
    console.log("       { platform: 'twitter', username: 'handle1' },");
    console.log("       { platform: 'instagram', username: 'handle2' }");
    console.log("     ],");
    console.log("     creatorCoinAddress: '0x...',");
    console.log("     creatorCoinMarketCap: '...'");
    console.log("   }");
    console.log("");

    console.log("📊 STEP 4: WHAT WE NEED TO CHECK");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    
    console.log("🎯 Key questions:");
    console.log("   1. What is magicianafk's actual creator address?");
    console.log("   2. What does getProfileByAddress() return for that address?");
    console.log("   3. What's in profile.socialAccounts?");
    console.log("   4. What's profile.twitterUsername vs profile.handle?");
    console.log("   5. Are there multiple Twitter accounts linked?");
    console.log("");

    console.log("🔧 DEBUGGING SUGGESTIONS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. Get the creator address from the next coin creation event");
    console.log("   2. Add detailed logging in ZoraProfileService.getProfileByAddress()");
    console.log("   3. Log ALL social accounts, not just the primary Twitter");
    console.log("   4. Check if multiple Twitter accounts are linked");
    console.log("   5. Verify the Zora SDK response matches expectations");
    console.log("");

    // Let's also test what the Ethos service would return for different handles
    console.log("📊 STEP 5: ETHOS SCORE VERIFICATION");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    const testHandles = ["magicianafk", "Mushahid", "mushahid"];
    
    for (const handle of testHandles) {
      console.log(`🐦 Testing @${handle}:`);
      try {
        const score = await ethosService.getScoreByTwitterUsername(handle);
        console.log(`   ✅ Ethos score: ${score}`);
        
        if (score && score >= 1226) {
          console.log(`   🎯 QUALIFIES for trading (≥ 1226)`);
        } else if (score) {
          console.log(`   ❌ Does not qualify (< 1226)`);
        }
        
      } catch (error) {
        console.log(`   ❌ No score found: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log("");
    console.log("🎯 NEXT STEPS TO SOLVE THIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. Wait for the next magicianafk coin creation event");
    console.log("   2. Capture the creator address from that event");
    console.log("   3. Run: deno run investigation-script.ts <creator-address>");
    console.log("   4. Compare profile data with expected Twitter handle");
    console.log("   5. Check if Zora profile is outdated or incorrect");
    console.log("");
    console.log("💡 OR add enhanced logging to the bot to capture this data automatically");

  } catch (error) {
    console.error(`❌ Investigation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  investigateMagicianAFKProfile();
}