#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { createPublicClient, http, decodeEventLog } from "viem";
import { base } from "viem/chains";

async function investigateEventStructure() {
  try {
    console.log("🔍 INVESTIGATING ZORA FACTORY EVENT STRUCTURE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
    });

    // Get the actual Zora Factory ABI for CoinCreated event
    const ZORA_FACTORY_ABI = [
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "caller",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "payoutRecipient",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "platformReferrer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "currency",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "uri",
            "type": "string"
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
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "coin",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "version",
            "type": "string"
          }
        ],
        "name": "CoinCreated",
        "type": "event"
      }
    ];

    const ZORA_FACTORY_ADDRESS = "0x777777751622c0d3258f214F9DF38E35BF45baF3";

    console.log("📊 FETCHING RECENT ZORA FACTORY EVENTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Get recent events
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 100n; // Last 100 blocks

    console.log(`   From Block: ${fromBlock}`);
    console.log(`   To Block: ${currentBlock}`);
    console.log(`   Factory: ${ZORA_FACTORY_ADDRESS}`);
    console.log("");

    const logs = await publicClient.getLogs({
      address: ZORA_FACTORY_ADDRESS as `0x${string}`,
      fromBlock: fromBlock,
      toBlock: currentBlock,
    });

    console.log(`📋 FOUND ${logs.length} EVENTS IN LAST 100 BLOCKS`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (logs.length === 0) {
      console.log("❌ No events found in recent blocks");
      console.log("   Try expanding the block range or check if factory is active");
      return;
    }

    // Analyze first few events
    for (let i = 0; i < Math.min(3, logs.length); i++) {
      const log = logs[i];
      console.log(`\n🔍 EVENT ${i + 1}:`);
      console.log(`   Block: ${log.blockNumber}`);
      console.log(`   TX: ${log.transactionHash}`);
      console.log(`   Topics: ${log.topics.length}`);
      
      try {
        // Try to decode with proper ABI
        const decodedEvent = decodeEventLog({
          abi: ZORA_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });

        console.log(`   ✅ PROPERLY DECODED EVENT:`);
        console.log(`      Event Name: ${decodedEvent.eventName}`);
        console.log(`      Caller: ${decodedEvent.args.caller}`);
        console.log(`      Name: ${decodedEvent.args.name}`);
        console.log(`      Symbol: ${decodedEvent.args.symbol}`);
        console.log(`      🎯 COIN ADDRESS: ${decodedEvent.args.coin}`);
        console.log(`      Currency: ${decodedEvent.args.currency}`);
        console.log(`      Version: ${decodedEvent.args.version}`);

        // Verify the coin address exists
        const coinAddress = decodedEvent.args.coin as `0x${string}`;
        try {
          const code = await publicClient.getBytecode({ address: coinAddress });
          console.log(`      🔍 Coin Contract: ${code && code !== '0x' ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        } catch (error) {
          console.log(`      🔍 Coin Contract: ❌ ERROR (${error instanceof Error ? error.message : 'Unknown'})`);
        }

      } catch (decodeError) {
        console.log(`   ❌ DECODE FAILED: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
        
        // Show raw data for debugging
        console.log(`   📜 Raw Topics:`);
        log.topics.forEach((topic, i) => {
          console.log(`      [${i}]: ${topic}`);
        });
        console.log(`   📜 Raw Data: ${log.data.slice(0, 100)}...`);
      }
    }

    console.log("");
    console.log("💡 SOLUTION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Use proper ABI decoding instead of manual hex parsing");
    console.log("✅ The coin address is in decodedEvent.args.coin");
    console.log("✅ This will give us the correct token contract addresses");

  } catch (error) {
    console.error(`❌ Investigation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  investigateEventStructure();
}