#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { createPublicClient, http, getContract } from "viem";
import { base } from "viem/chains";

const TARGET_COIN = "0x2e40d958471ffca6dbd1954a78d1d7cc0d34dfd4";

async function debugCreatorCoin() {
  try {
    await load({ export: true });
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
    });

    console.log(`🔍 DEBUGGING CREATOR COIN: ${TARGET_COIN}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Check if it's an ERC20 token
    const erc20Abi = [
      {
        "inputs": [],
        "name": "name",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "symbol", 
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ] as const;

    try {
      const token = getContract({
        address: TARGET_COIN as `0x${string}`,
        abi: erc20Abi,
        client: publicClient
      });

      const [name, symbol, totalSupply] = await Promise.all([
        token.read.name(),
        token.read.symbol(), 
        token.read.totalSupply()
      ]);

      console.log(`✅ ERC20 Token Found:`);
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Total Supply: ${totalSupply.toString()}`);

    } catch (error) {
      console.log(`❌ Not a valid ERC20 token: ${error}`);
      return;
    }

    // Check recent transactions
    console.log(`\n🔄 Checking recent activity...`);
    
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = latestBlock - 1000n; // Last ~1000 blocks (~50 minutes)
    
    try {
      const logs = await publicClient.getLogs({
        address: TARGET_COIN as `0x${string}`,
        fromBlock,
        toBlock: latestBlock
      });

      console.log(`📊 Found ${logs.length} events in last 1000 blocks`);
      
      if (logs.length > 0) {
        console.log(`   Most recent: Block ${logs[logs.length - 1].blockNumber}`);
        console.log(`   Oldest: Block ${logs[0].blockNumber}`);
      } else {
        console.log(`⚠️  No recent activity - token might be inactive`);
      }

    } catch (error) {
      console.log(`❌ Failed to get logs: ${error}`);
    }

    // Check ETH balance at this address (should be 0 for tokens)
    const balance = await publicClient.getBalance({ 
      address: TARGET_COIN as `0x${string}` 
    });
    console.log(`💰 ETH Balance at token address: ${balance} (should be 0)`);

    // Get contract code 
    const code = await publicClient.getCode({ 
      address: TARGET_COIN as `0x${string}` 
    });
    console.log(`📝 Contract code size: ${code ? code.length : 0} bytes`);

  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

debugCreatorCoin();