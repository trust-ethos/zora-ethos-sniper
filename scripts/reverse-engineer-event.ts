#!/usr/bin/env deno run --allow-net

/**
 * Reverse engineer the correct event signature from actual event data
 */

import { keccak256, toHex } from "viem";

console.log("🔍 Reverse Engineering Event Signature...\n");

const actualTopicHash = "0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81";

console.log(`🎯 Target Topic Hash: ${actualTopicHash}\n`);

// Generate topic hash for a signature
function getEventTopicHash(signature: string): string {
  return keccak256(toHex(signature));
}

// Looking at the event data, I can see:
// - 3 indexed parameters (topics[1], topics[2], topics[3])
// - String data that looks like: "ipfs://...", "meme 54", "MEME54", "S1.1.0"
// - Address-like data

console.log("🧪 Testing Event Signatures Based on Data Analysis...\n");

// The most likely signatures based on the data structure
const candidateSignatures = [
  // Basic deploy/create events
  "deploy(address,address[],string,string,string,bytes,address,address,bytes,bytes32)",
  "deploy(address,address[],string,string,string,bytes,address,uint256)",
  
  // More specific coin creation events  
  "CoinCreated(address,address,address,address,string,string,string,address,address,string)",
  "CoinCreatedV4(address,address,address,address,string,string,string,address,bytes32,bytes32,string)",
  
  // From Zora docs but different parameter order/types
  "CoinCreated(address,address,address,address,string,string,string,address,uint256,string)", 
  "CoinCreatedV4(address,address,address,address,string,string,string,address,uint256,bytes32,string)",
  
  // Possible variations with different names
  "Deployed(address,address,address,address,string,string,string,address,address,string)",
  "Created(address,address,address,address,string,string,string,address,address,string)",
  
  // Based on actual function signature that might exist
  "deploy(address,address[],string,string,string,bytes,address,address,bytes,bytes32)",
  "CoinDeployed(address,address[],string,string,string,bytes,address,address,bytes,bytes32)",
  
  // Variations without version string
  "CoinCreated(address,address,address,address,string,string,string,address,address)",
  "CoinCreated(address,address,address,address,string,string,string,address,uint256)",
  
  // With different parameter types for pools
  "CoinCreated(address,address,address,address,string,string,string,address,bytes32,string)",
  "CoinCreatedV4(address,address,address,address,string,string,string,address,bytes32,bytes32)",
];

let foundMatch = false;

for (const signature of candidateSignatures) {
  const hash = getEventTopicHash(signature);
  console.log(`${signature}`);
  console.log(`  Topic: ${hash}`);
  
  if (hash === actualTopicHash) {
    console.log("  ✅ MATCH FOUND!");
    foundMatch = true;
  }
  console.log("");
}

if (!foundMatch) {
  console.log("❌ No match found in candidates. Let's try a different approach...\n");
  
  // Let's try to work backwards from the known topic hash
  console.log("🔍 The event has 3 indexed parameters (based on topics array)");
  console.log("📊 Event data suggests parameters like:");
  console.log("   - Addresses (caller, payout recipient, platform referrer)");
  console.log("   - Strings (URI, name, symbol, version)");  
  console.log("   - Contract addresses (coin, pool/currency)");
  console.log("   - Possibly bytes32 or uint256 values");
  console.log("");
  
  console.log("💡 NEXT STEPS:");
  console.log("1. Check BaseScan for the actual transaction to see decoded event");
  console.log("2. Look at Zora's GitHub repository for the actual contract source");
  console.log("3. The event signature might be from a different version of the factory");
  console.log("4. Consider using a generic event listener to catch all events");
} 