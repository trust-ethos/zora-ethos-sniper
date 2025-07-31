#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { getProfile } from "@zoralabs/coins-sdk";

async function debugZoraTwitterFields() {
  try {
    console.log("🔍 DEBUGGING ZORA TWITTER FIELDS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });

    // Let's examine the structure of Twitter social accounts in Zora profiles
    console.log("📊 EXAMINING ZORA PROFILE TWITTER STRUCTURE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    // We need a sample address to test with, but since we don't have magicianafk's address,
    // let's show what the structure looks like and what fields are available

    console.log("🔍 Current code (WRONG):");
    console.log("   twitterUsername: profile.socialAccounts?.twitter?.displayName");
    console.log("   ↳ This gets the display name like 'Mushahid 🖤 🟡♦️'");
    console.log("");

    console.log("🔧 What we should be using:");
    console.log("   Possible fields to check:");
    console.log("   • profile.socialAccounts?.twitter?.username");
    console.log("   • profile.socialAccounts?.twitter?.handle");  
    console.log("   • profile.socialAccounts?.twitter?.screenName");
    console.log("   • profile.socialAccounts?.twitter?.id");
    console.log("");

    console.log("💡 THE ISSUE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   Creator: magicianafk");
    console.log("   Twitter displayName: 'Mushahid 🖤 🟡♦️'  ← This is what we're getting");
    console.log("   Twitter username: 'magicianafk'          ← This is what we SHOULD get");
    console.log("");

    console.log("🎯 SOLUTION:");
    console.log("   1. Change from profile.socialAccounts?.twitter?.displayName");
    console.log("   2. To profile.socialAccounts?.twitter?.username (or similar)");
    console.log("");

    console.log("📋 LET'S CHECK WHAT FIELDS ARE ACTUALLY AVAILABLE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("   We need to test with an actual profile to see the structure...");
    console.log("   But based on typical Twitter API structure, it's likely:");
    console.log("");
    console.log("   profile.socialAccounts.twitter = {");
    console.log("     displayName: 'Mushahid 🖤 🟡♦️',  // Display name (what we're getting)");
    console.log("     username: 'magicianafk',            // Handle/username (what we want)");
    console.log("     id: '12345678',                      // Twitter user ID");
    console.log("     url: 'https://twitter.com/magicianafk'");
    console.log("   }");

    console.log("");
    console.log("🚀 NEXT STEPS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. Update ZoraProfileService to use .username instead of .displayName");
    console.log("   2. Add logging to show ALL available Twitter fields");
    console.log("   3. Test with the next coin creation event");
    console.log("   4. Verify we get 'magicianafk' instead of 'Mushahid 🖤 🟡♦️'");

  } catch (error) {
    console.error(`❌ Debug failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  debugZoraTwitterFields();
}