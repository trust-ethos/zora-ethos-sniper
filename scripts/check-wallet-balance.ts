#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { createPublicClient, http, formatEther } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

async function checkBalance() {
  try {
    await load({ export: true });
    
    const privateKey = Deno.env.get("PRIVATE_KEY");
    if (!privateKey) {
      throw new Error("PRIVATE_KEY not found");
    }

    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const account = privateKeyToAccount(`0x${cleanKey}` as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
    });

    const balance = await publicClient.getBalance({ 
      address: account.address 
    });

    console.log(`💰 Wallet Balance: ${formatEther(balance)} ETH`);
    console.log(`📍 Address: ${account.address}`);
    
    const needed = 0.03 + 0.005; // 0.03 ETH + estimated gas
    const hasEnough = Number(formatEther(balance)) >= needed;
    
    console.log(`🎯 Needed: ~${needed} ETH (0.03 + gas)`);
    console.log(`✅ Status: ${hasEnough ? 'Sufficient funds' : 'Insufficient funds'}`);
    
    if (!hasEnough) {
      console.log(`💸 Need to add: ~${(needed - Number(formatEther(balance))).toFixed(4)} ETH`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

checkBalance(); 