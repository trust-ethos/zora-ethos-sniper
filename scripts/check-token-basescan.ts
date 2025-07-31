#!/usr/bin/env deno run --allow-net --allow-env --allow-read

async function checkTokenOnBaseScan() {
  console.log("🔍 CHECKING TOKEN ON BASESCAN");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const tokenAddress = "0xe94d01531125948ed84309063c002d7c72ae62b5";
  console.log(`Token: ${tokenAddress}`);
  console.log("");

  console.log("🔗 MANUAL VERIFICATION STEPS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. Go to BaseScan:");
  console.log(`   https://basescan.org/address/${tokenAddress}`);
  console.log("");
  console.log("2. Look for the contract creation transaction");
  console.log("3. Check the timestamp of the creation transaction");
  console.log("4. Compare with when your bot detected and traded it");
  console.log("");

  console.log("🎯 WHAT TO LOOK FOR:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("• Contract Creation timestamp");
  console.log("• First transaction timestamp");
  console.log("• Any recent transactions that might have triggered detection");
  console.log("• Check if there are multiple events for the same token");
  console.log("");

  console.log("🚨 HYPOTHESIS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("The bot might be detecting:");
  console.log("• A secondary event (not the original creation)");
  console.log("• A pool creation or update event");
  console.log("• A transaction that references the token but isn't creation");
  console.log("• An event with incorrect timestamp parsing");
  console.log("");

  console.log("✅ NEXT STEPS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. Check BaseScan manually for the token");
  console.log("2. Run the bot with enhanced logging");
  console.log("3. See what the EVENT ANALYSIS shows for the next detection");
  console.log("4. Compare bot detection time vs actual creation time");
  console.log("");

  // Simple timestamp conversion helper
  const now = Math.floor(Date.now() / 1000);
  console.log(`Current Unix timestamp: ${now}`);
  console.log(`Current time: ${new Date().toISOString()}`);
  console.log("");
  console.log("Compare these with what you see in BaseScan!");
}

if (import.meta.main) {
  checkTokenOnBaseScan();
}