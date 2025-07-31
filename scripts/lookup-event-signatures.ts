#!/usr/bin/env deno run --allow-net --allow-env --allow-read

async function lookupEventSignatures() {
  console.log("🔍 LOOKING UP ACTUAL EVENT SIGNATURES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const signatures = [
    "0x74b670d628e152daa36ca95dda7cb0002d6ea7a37b55afe4593db7abd1515781",
    "0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81"
  ];

  // Based on the raw data patterns, these look like:
  // 1. Different types of Zora events
  // 2. The coin addresses are in the raw data, not decoded properly

  console.log("📊 DETECTED PATTERNS FROM RAW DATA:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const rawDataExamples = [
    "0x0000000000000000000000001111111111166b7fe7bd91427724b487980afc69",
    "0x0000000000000000000000005ed21a6cdebc4a02b120804b06e51905cf1d42cb", 
    "0x000000000000000000000000f5779650c8cc18db965d3d590ddf9a32765d62f2"
  ];

  rawDataExamples.forEach((data, i) => {
    // Extract the address part (remove leading zeros)
    const addressMatch = data.match(/0x0+([1-9a-f][0-9a-f]*)/);
    if (addressMatch) {
      const cleanAddress = "0x" + addressMatch[1].padStart(40, '0');
      console.log(`   Example ${i + 1}: ${cleanAddress}`);
    }
  });

  console.log("");
  console.log("🎯 REAL SOLUTION:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("❌ Current approach: Manual hex parsing with wrong assumptions");
  console.log("✅ Correct approach: Find the right event type and ABI");
  console.log("");
  console.log("🔍 IMMEDIATE FIXES:");
  console.log("1. Check if these are different Zora Factory events");
  console.log("2. Look for the creator coin creation events specifically");
  console.log("3. Use proper ABI decoding for the correct event type");
  console.log("4. Stop using regex to extract addresses from raw data");
  console.log("");
  console.log("💡 The addresses we're getting are probably:");
  console.log("   • Wrong field from the wrong event type");
  console.log("   • Or raw data that needs proper decoding");
  console.log("   • Not the actual creator coin contract addresses");
  
  console.log("");
  console.log("🚨 CRITICAL: We need to identify the CORRECT event for creator coins!");
}

if (import.meta.main) {
  lookupEventSignatures();
}