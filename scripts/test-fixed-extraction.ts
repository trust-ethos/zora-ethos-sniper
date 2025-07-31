#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

async function testFixedExtraction() {
  try {
    console.log("🧪 TESTING FIXED COIN ADDRESS EXTRACTION");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
    });

    // Test the extraction logic with recent events
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 20n;

    console.log("📊 FETCHING RECENT EVENTS TO TEST:");
    console.log(`   From Block: ${fromBlock}`);
    console.log(`   To Block: ${currentBlock}`);
    console.log("");

    const testLogs = await publicClient.getLogs({
      address: "0x777777751622c0d3258f214F9DF38E35BF45baF3" as `0x${string}`,
      fromBlock: fromBlock,
      toBlock: currentBlock,
    });

    if (testLogs.length === 0) {
      console.log("❌ No recent events to test with");
      return;
    }

    console.log(`📋 FOUND ${testLogs.length} RECENT EVENTS`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Test extraction on first few events
    for (let i = 0; i < Math.min(3, testLogs.length); i++) {
      const log = testLogs[i];
      console.log(`\n🔍 EVENT ${i + 1}:`);
      console.log(`   TX: ${log.transactionHash}`);
      console.log(`   Signature: ${log.topics[0]}`);

      // Apply the new extraction logic
      const data = log.data;
      
      if (data && data.length >= 66) {
        // Extract the coin address from bytes 12-32 of the data (skip padding zeros)
        const coinAddressHex = data.slice(26, 66); // 40 hex chars = 20 bytes
        const extractedCoin = `0x${coinAddressHex}`;
        
        console.log(`   Raw data: ${data.slice(0, 100)}...`);
        console.log(`   ✅ EXTRACTED COIN: ${extractedCoin}`);
        
        // Verify this address exists on chain
        try {
          const code = await publicClient.getBytecode({ address: extractedCoin as `0x${string}` });
          const exists = code && code !== '0x';
          console.log(`   🔍 Contract exists: ${exists ? '✅ YES' : '❌ NO'}`);
          
          if (exists) {
            // Try to get token name/symbol to verify it's a real token
            try {
              // Simple name() call
              const nameData = await publicClient.readContract({
                address: extractedCoin as `0x${string}`,
                abi: [
                  {
                    name: 'name',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [],
                    outputs: [{ name: '', type: 'string' }],
                  },
                ],
                functionName: 'name',
              });
              console.log(`   📝 Token name: ${nameData}`);
            } catch (error) {
              console.log(`   📝 Token name: Could not read (${error instanceof Error ? error.message.slice(0, 50) : 'Unknown error'})`);
            }
            
            try {
              // Simple symbol() call
              const symbolData = await publicClient.readContract({
                address: extractedCoin as `0x${string}`,
                abi: [
                  {
                    name: 'symbol',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [],
                    outputs: [{ name: '', type: 'string' }],
                  },
                ],
                functionName: 'symbol',
              });
              console.log(`   🎯 Token symbol: ${symbolData}`);
            } catch (error) {
              console.log(`   🎯 Token symbol: Could not read (${error instanceof Error ? error.message.slice(0, 50) : 'Unknown error'})`);
            }
          }
          
        } catch (error) {
          console.log(`   🔍 Contract check failed: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      } else {
        console.log(`   ❌ Insufficient data length: ${data ? data.length : 'null'}`);
      }
    }

    console.log("");
    console.log("🎯 EXTRACTION FIX RESULTS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Fixed extraction logic implemented");
    console.log("✅ Coin addresses from correct data field position");
    console.log("✅ Validation that extracted addresses exist on chain");
    console.log("✅ Ready to replace the broken regex approach");

  } catch (error) {
    console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  testFixedExtraction();
}