#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Analyze a Uniswap V4 transaction to extract contract addresses
 */

import { load } from "@std/dotenv";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

async function analyzeV4Transaction() {
  try {
    console.log("🔍 ANALYZING UNISWAP V4 TRANSACTION\n");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    const txHash = "0x1f78a517522d6650b737e7a8c55d3e06dea1b19e14c1e6efbc52b83e1de98c27";
    
    console.log("📋 Transaction Details:");
    console.log(`   Hash: ${txHash}`);
    console.log(`   Network: Base (${base.id})`);
    
    // Get transaction details
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
    
    console.log(`\n💰 Transaction Info:`);
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Value: ${tx.value} wei`);
    console.log(`   Gas: ${tx.gas}`);
    console.log(`   Gas Price: ${tx.gasPrice} wei`);

    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    
    console.log(`\n📝 Transaction Receipt:`);
    console.log(`   Status: ${receipt.status}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed}`);
    console.log(`   Logs Count: ${receipt.logs.length}`);

    // Analyze logs to find contract addresses
    console.log(`\n🔍 Analyzing Logs for V4 Contracts:`);
    
    const contractAddresses = new Set<string>();
    const possiblePoolManager = new Set<string>();
    
    receipt.logs.forEach((log, index) => {
      console.log(`\n   Log ${index + 1}:`);
      console.log(`     Address: ${log.address}`);
      console.log(`     Topics: ${log.topics.length}`);
      
      contractAddresses.add(log.address);
      
      // Look for potential PoolManager by checking if it's called frequently
      if (log.topics.length > 0) {
        const topic0 = log.topics[0];
        
        // Common V4 events that might come from PoolManager
        if (topic0?.includes('0x') && topic0.length === 66) {
          possiblePoolManager.add(log.address);
          console.log(`     Topic[0]: ${topic0}`);
        }
      }
    });

    console.log(`\n📊 Contract Analysis:`);
    console.log(`   Unique Contracts Called: ${contractAddresses.size}`);
    
    console.log(`\n📋 All Contract Addresses Found:`);
    Array.from(contractAddresses).forEach((address, i) => {
      console.log(`   ${i + 1}. ${address}`);
    });

    // The main contract being called is likely a V4 contract
    if (tx.to) {
      console.log(`\n🎯 Primary Target Contract:`);
      console.log(`   Address: ${tx.to}`);
      console.log(`   This is likely a V4 PositionManager, Router, or PoolManager`);
      
      // Try to identify the contract type
      console.log(`\n🔍 Contract Identification:`);
      if (tx.to.toLowerCase().includes('pool')) {
        console.log(`   Likely: PoolManager (contains 'pool')`);
      } else if (contractAddresses.size > 1) {
        console.log(`   Likely: Position Manager or Router (calls multiple contracts)`);
        console.log(`   The PoolManager is probably one of the addresses in the logs`);
      }
    }

    // Look for the most frequently called contract in logs
    const addressCounts = new Map<string, number>();
    receipt.logs.forEach(log => {
      const count = addressCounts.get(log.address) || 0;
      addressCounts.set(log.address, count + 1);
    });

    console.log(`\n📈 Contract Call Frequency:`);
    Array.from(addressCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([address, count]) => {
        console.log(`   ${address}: ${count} events`);
        if (count >= 3) {
          console.log(`     ↳ Likely candidate for PoolManager (high activity)`);
        }
      });

    // Provide guidance on next steps
    console.log(`\n💡 Next Steps:`);
    console.log(`1. The contract with the most events is likely the PoolManager`);
    console.log(`2. Update UNISWAP_V4_POOL_MANAGER in src/services/dex-service.ts`);
    console.log(`3. Verify the address on BaseScan by checking:`);
    console.log(`   • Contract name should contain "PoolManager"`);
    console.log(`   • Should have V4-related functions like "swap", "unlock"`);
    console.log(`   • Should be verified and match Uniswap V4 patterns`);

    console.log(`\n🔗 Verification Links:`);
    Array.from(contractAddresses).slice(0, 3).forEach(address => {
      console.log(`   https://basescan.org/address/${address}`);
    });

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  analyzeV4Transaction();
} 