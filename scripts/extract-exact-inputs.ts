#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Extract Exact Input Parameters
 * Decode the exact inputs from the successful transaction for replication
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, decodeAbiParameters, parseAbiParameters } from "viem";
import { base } from "viem/chains";

const SUCCESSFUL_TX = "0xe65b8bb9869725807654ef47b2960131a1144a551be2f8f7669f6760b6f7a2c7";

async function extractExactInputs() {
  try {
    console.log("🔍 EXTRACTING EXACT INPUT PARAMETERS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎯 Transaction: ${SUCCESSFUL_TX}`);
    console.log("");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    // Get transaction data
    const tx = await publicClient.getTransaction({ hash: SUCCESSFUL_TX as `0x${string}` });
    
    // Remove function selector
    const inputData = tx.input.slice(10);
    
    // Decode parameters
    const decoded = decodeAbiParameters(
      parseAbiParameters('bytes commands, bytes[] inputs, uint256 deadline'),
      `0x${inputData}` as `0x${string}`
    );
    
    const commands = decoded[0];
    const inputs = decoded[1];
    const deadline = decoded[2];
    
    console.log("📋 SUCCESSFUL TRANSACTION STRUCTURE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Value: ${Number(tx.value) / 1e18} ETH`);
    console.log(`   Commands: ${commands}`);
    console.log(`   Deadline: ${deadline}`);
    console.log(`   Inputs Count: ${inputs.length}`);

    console.log("\n📋 EXACT INPUT BREAKDOWN:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    inputs.forEach((input, index) => {
      console.log(`\n--- INPUT ${index + 1} (${getCommandName(index)}) ---`);
      console.log(`Length: ${input.length} chars`);
      console.log(`Raw: ${input}`);
      
      // Try to decode based on command type
      try {
        switch(index) {
          case 0: // WRAP_ETH
            console.log("🔄 WRAP_ETH Parameters:");
            const wrapParams = decodeAbiParameters(
              parseAbiParameters('address recipient, uint256 amount'),
              input as `0x${string}`
            );
            console.log(`   Recipient: ${wrapParams[0]}`);
            console.log(`   Amount: ${wrapParams[1]} wei (${Number(wrapParams[1]) / 1e18} ETH)`);
            break;
            
          case 1: // V3_SWAP_EXACT_IN
            console.log("🔄 V3_SWAP_EXACT_IN Parameters:");
            const v3Params = decodeAbiParameters(
              parseAbiParameters('address recipient, uint256 amountIn, uint256 amountOutMin, bytes path, bool payerIsUser'),
              input as `0x${string}`
            );
            console.log(`   Recipient: ${v3Params[0]}`);
            console.log(`   Amount In: ${v3Params[1]} wei (${Number(v3Params[1]) / 1e18} ETH)`);
            console.log(`   Amount Out Min: ${v3Params[2]}`);
            console.log(`   Path: ${v3Params[3]}`);
            console.log(`   Payer Is User: ${v3Params[4]}`);
            
            // Decode path
            console.log("🛣️  Path Breakdown:");
            const pathData = v3Params[3].slice(2); // Remove 0x
            const token0 = `0x${pathData.slice(0, 40)}`;
            const fee = parseInt(pathData.slice(40, 46), 16);
            const token1 = `0x${pathData.slice(46, 86)}`;
            console.log(`     Token 0: ${token0}`);
            console.log(`     Fee: ${fee} (${fee / 10000}%)`);
            console.log(`     Token 1: ${token1}`);
            break;
            
          case 2: // V4_SWAP
            console.log("🔄 V4_SWAP Parameters:");
            console.log(`   Raw Data: ${input.slice(0, 100)}...`);
            // V4 parameters are complex, just show raw for now
            break;
            
          case 3: // SWEEP
            console.log("🔄 SWEEP Parameters:");
            const sweepParams = decodeAbiParameters(
              parseAbiParameters('address token, address recipient, uint256 amountMin'),
              input as `0x${string}`
            );
            console.log(`   Token: ${sweepParams[0]}`);
            console.log(`   Recipient: ${sweepParams[1]}`);
            console.log(`   Amount Min: ${sweepParams[2]}`);
            break;
        }
      } catch (decodeError) {
        console.log(`   ❌ Decode failed: ${decodeError}`);
        console.log(`   Raw hex: ${input.slice(0, 100)}...`);
      }
    });

    // Show exactly what we need to replicate
    console.log("\n🎯 REPLICATION TEMPLATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`commands = "${commands}"`);
    console.log(`deadline = ${deadline}`);
    inputs.forEach((input, index) => {
      console.log(`input${index + 1} = "${input}"`);
    });

    console.log("\n💡 KEY INSIGHTS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. 🎯 Copy the EXACT input parameters");
    console.log("2. 🔄 Modify only the recipient address to yours");
    console.log("3. 💰 Scale the amounts proportionally (0.001 ETH vs 0.03 ETH)");
    console.log("4. ⏰ Update the deadline to current time + buffer");

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getCommandName(index: number): string {
  const commands = ['WRAP_ETH', 'V3_SWAP_EXACT_IN', 'V4_SWAP', 'SWEEP'];
  return commands[index] || `UNKNOWN_${index}`;
}

if (import.meta.main) {
  extractExactInputs();
} 