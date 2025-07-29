#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Analyze Actual Creator Coin Trade
 * Decode how the user's creator coin is actually being traded
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

// The actual trade transaction the user provided
const TRADE_TX = "0xe65b8bb9869725807654ef47b2960131a1144a551be2f8f7669f6760b6f7a2c7";
const CREATOR_COIN = "0x1ffdd7a3ca67a8bc50a3db8d4ca4c3c790e70e17";

async function analyzeTrade() {
  try {
    console.log("🔍 ANALYZING ACTUAL CREATOR COIN TRADE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📊 Transaction: ${TRADE_TX}`);
    console.log(`🎯 Creator Coin: ${CREATOR_COIN}`);
    console.log("");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    // 1. Get transaction details
    console.log("📋 1. TRANSACTION DETAILS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const tx = await publicClient.getTransaction({ hash: TRADE_TX as `0x${string}` });
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Value: ${tx.value} ETH`);
    console.log(`   Gas Used: ${tx.gas}`);
    console.log(`   Gas Price: ${tx.gasPrice}`);
    console.log(`   Data Length: ${tx.input.length} bytes`);
    console.log(`   Function Signature: ${tx.input.slice(0, 10)}`);

    // 2. Get transaction receipt and events
    console.log("\n📋 2. TRANSACTION RECEIPT & EVENTS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const receipt = await publicClient.getTransactionReceipt({ hash: TRADE_TX as `0x${string}` });
    console.log(`   Status: ${receipt.status}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed}`);
    console.log(`   Events: ${receipt.logs.length}`);

    // 3. Analyze each event
    console.log("\n📋 3. EVENT ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`\n   Event ${i + 1}:`);
      console.log(`     Contract: ${log.address}`);
      console.log(`     Topic 0: ${log.topics[0]}`);
      console.log(`     Topic 1: ${log.topics[1] || 'N/A'}`);
      console.log(`     Topic 2: ${log.topics[2] || 'N/A'}`);
      console.log(`     Data: ${log.data.slice(0, 20)}...`);
      
      // Try to identify known event signatures
      const topic0 = log.topics[0];
      if (topic0 === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
        console.log(`     ✅ Transfer Event`);
      } else if (topic0 === '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822') {
        console.log(`     ✅ Swap Event`);
      } else if (topic0?.includes('2de436107c2096e0')) {
        console.log(`     ✅ Possible CoinCreated Event`);
      } else {
        console.log(`     ❓ Unknown Event`);
      }
      
      // Check if this event is from our creator coin
      if (log.address.toLowerCase() === CREATOR_COIN.toLowerCase()) {
        console.log(`     🎯 FROM OUR CREATOR COIN!`);
      }
    }

    // 4. Look for the trading contract
    console.log("\n📋 4. TRADING CONTRACT IDENTIFICATION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const uniqueContracts = [...new Set(receipt.logs.map(log => log.address))];
    console.log(`   Contracts Involved: ${uniqueContracts.length}`);
    
    for (const contract of uniqueContracts) {
      console.log(`     ${contract}`);
      if (contract.toLowerCase() === CREATOR_COIN.toLowerCase()) {
        console.log(`       ✅ Our Creator Coin`);
      } else if (contract.toLowerCase() === tx.to?.toLowerCase()) {
        console.log(`       🎯 MAIN TRADING CONTRACT (tx.to)`);
      } else {
        console.log(`       📝 Other Contract`);
      }
    }

    // 5. Analyze the function call
    console.log("\n📋 5. FUNCTION CALL ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const functionSig = tx.input.slice(0, 10);
    console.log(`   Function Signature: ${functionSig}`);
    console.log(`   Input Data Length: ${tx.input.length}`);
    console.log(`   Raw Input: ${tx.input.slice(0, 100)}...`);
    
    // Check for common function signatures
    const knownSigs: { [key: string]: string } = {
      '0xa9059cbb': 'transfer(address,uint256)',
      '0x23b872dd': 'transferFrom(address,address,uint256)',
      '0x095ea7b3': 'approve(address,uint256)',
      '0x7ff36ab5': 'swapExactETHForTokens(...)',
      '0x18cbafe5': 'swapExactTokensForETH(...)',
      '0x3593564c': 'execute(bytes,bytes[])', // Universal Router
      '0x414bf389': 'exactInputSingle(...)', // Uniswap V3
      '0xd0e30db0': 'deposit()',
      '0x2e1a7d4d': 'withdraw(uint256)',
    };
    
    if (knownSigs[functionSig]) {
      console.log(`   ✅ Known Function: ${knownSigs[functionSig]}`);
    } else {
      console.log(`   ❓ Unknown Function Signature`);
    }

    // 6. Trading pattern conclusion
    console.log("\n🔍 TRADING PATTERN CONCLUSION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   ✅ Creator coin IS tradeable`);
    console.log(`   📊 Trading Contract: ${tx.to}`);
    console.log(`   🔧 Function Used: ${functionSig}`);
    console.log(`   💰 ETH Value: ${tx.value} wei`);
    
    if (tx.to && tx.to !== CREATOR_COIN) {
      console.log(`\n🎯 NEXT STEPS:`);
      console.log(`   1. 🔍 Investigate contract: ${tx.to}`);
      console.log(`   2. 📋 Get ABI for function: ${functionSig}`);
      console.log(`   3. 🧪 Implement trading logic`);
      console.log(`   4. ⚡ Update our DexService`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  analyzeTrade();
} 