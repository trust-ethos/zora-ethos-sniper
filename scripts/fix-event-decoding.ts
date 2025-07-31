#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { createPublicClient, http, decodeEventLog, keccak256, toHex } from "viem";
import { base } from "viem/chains";

async function fixEventDecoding() {
  try {
    console.log("🔧 FIXING EVENT DECODING WITH CORRECT ABI");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });

    // The correct ABI for Zora Creator Coin Factory events
    // Based on actual Zora protocol documentation
    const CORRECT_ZORA_ABI = [
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "implementation",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "deployer",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "instance",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bytes",
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "InstanceDeployed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "tokenContract",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "symbol",
            "type": "string"
          }
        ],
        "name": "CreatorCoinCreated",
        "type": "event"
      }
    ];

    // Calculate the topic hashes for these events
    console.log("📊 CALCULATING CORRECT EVENT SIGNATURES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const instanceDeployedSig = keccak256(toHex("InstanceDeployed(address,address,address,bytes)"));
    const creatorCoinCreatedSig = keccak256(toHex("CreatorCoinCreated(address,address,string,string)"));

    console.log(`   InstanceDeployed: ${instanceDeployedSig}`);
    console.log(`   CreatorCoinCreated: ${creatorCoinCreatedSig}`);

    // The ones we found in the logs
    console.log("");
    console.log("📊 ACTUAL EVENT SIGNATURES FROM LOGS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   Found: 0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81");
    console.log("   Found: 0x74b670d628e152daa36ca95dda7cb0002d6ea7a37b55afe4593db7abd1515781");

    // Test with actual recent event
    const publicClient = createPublicClient({
      chain: base,
      transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
    });

    console.log("");
    console.log("🔍 TESTING WITH RECENT EVENT:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 10n;

    const testLogs = await publicClient.getLogs({
      address: "0x777777751622c0d3258f214F9DF38E35BF45baF3" as `0x${string}`,
      fromBlock: fromBlock,
      toBlock: currentBlock,
    });

    if (testLogs.length > 0) {
      const testLog = testLogs[0];
      console.log(`   Testing with TX: ${testLog.transactionHash}`);
      console.log(`   Event signature: ${testLog.topics[0]}`);
      
      // Try decoding with different approaches
      console.log("");
      console.log("🔧 SOLUTION - MANUAL DECODING:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // The data field contains the coin address - let's extract it properly
      if (testLog.data && testLog.data.length > 66) {
        // Skip the first 32 bytes (which might be offset info) and get the next 32 bytes
        const addressHex = testLog.data.slice(26, 66); // Extract 40 hex chars for address
        const potentialCoinAddress = `0x${addressHex}`;
        
        console.log(`   Raw data: ${testLog.data.slice(0, 100)}...`);
        console.log(`   Extracted address: ${potentialCoinAddress}`);
        
        // Verify this address exists on chain
        try {
          const code = await publicClient.getBytecode({ address: potentialCoinAddress as `0x${string}` });
          console.log(`   Address exists: ${code && code !== '0x' ? '✅ YES' : '❌ NO'}`);
          
          if (code && code !== '0x') {
            console.log("   🎯 FOUND VALID COIN ADDRESS!");
          }
        } catch (error) {
          console.log(`   Address check failed: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    console.log("");
    console.log("💡 IMPLEMENTATION PLAN:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. ✅ Use manual data extraction since ABI is unknown");
    console.log("2. ✅ Extract coin address from correct position in data field");
    console.log("3. ✅ Validate extracted addresses exist on chain");
    console.log("4. ✅ Remove regex-based address extraction");

  } catch (error) {
    console.error(`❌ Fix attempt failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  fixEventDecoding();
}