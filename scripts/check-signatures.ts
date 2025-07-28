#!/usr/bin/env deno run --allow-net

/**
 * Script to check event signatures and topic hashes
 */

import { parseAbiItem, keccak256, toHex } from "viem";

console.log("🔍 Checking Event Signatures...\n");

// Our expected events
const COIN_CREATED_V3_EVENT = parseAbiItem(
  "event CoinCreated(address indexed caller, address indexed payoutRecipient, address indexed platformReferrer, address currency, string uri, string name, string symbol, address coin, address pool, string version)"
);

const COIN_CREATED_V4_EVENT = parseAbiItem(
  "event CoinCreatedV4(address indexed caller, address indexed payoutRecipient, address indexed platformReferrer, address currency, string uri, string name, string symbol, address coin, bytes32 poolKey, bytes32 poolKeyHash, string version)"
);

// Calculate topic hashes
function getEventTopicHash(signature: string): string {
  return keccak256(toHex(signature));
}

console.log("📝 Our Expected Event Signatures:");
console.log(`V3 Event: ${COIN_CREATED_V3_EVENT.name}`);
console.log(`V3 Topic Hash: ${getEventTopicHash("CoinCreated(address,address,address,address,string,string,string,address,address,string)")}`);
console.log("");

console.log(`V4 Event: ${COIN_CREATED_V4_EVENT.name}`);
console.log(`V4 Topic Hash: ${getEventTopicHash("CoinCreatedV4(address,address,address,address,string,string,string,address,bytes32,bytes32,string)")}`);
console.log("");

console.log("🎯 Actual Event Found:");
console.log("Topic Hash: 0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81");
console.log("");

// Let's try some other possible signatures
const possibleSignatures = [
  "CoinCreated(address,address,address,address,string,string,string,address,address,string)",
  "CoinCreatedV4(address,address,address,address,string,string,string,address,bytes32,bytes32,string)",
  "CoinCreated(address,address,address,address,string,string,string,address,uint256,string)",
  "CoinDeployed(address,address,address,address,string,string,string,address,address,string)",
  "Deploy(address,address,address,address,string,string,string,address,address,string)",
  "TokenCreated(address,address,address,address,string,string,string,address,address,string)",
];

console.log("🔍 Testing Possible Signatures:");
for (const sig of possibleSignatures) {
  const hash = getEventTopicHash(sig);
  console.log(`${sig}`);
  console.log(`  Topic: ${hash}`);
  if (hash === "0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81") {
    console.log("  ✅ MATCH!");
  }
  console.log("");
}

// Since we found events but wrong signatures, let's suggest checking the contract source
console.log("💡 RECOMMENDATIONS:");
console.log("1. Check the actual Zora Factory contract source code for event signatures");
console.log("2. Use a block explorer to see the decoded events");
console.log("3. The factory might be using different event names or parameter types");
console.log("4. There might be multiple versions of the factory with different events"); 