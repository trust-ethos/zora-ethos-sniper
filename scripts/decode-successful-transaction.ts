#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Decode Successful Transaction
 * Fully decode the working transaction to understand the command structure
 */

import { load } from "@std/dotenv";
import { createPublicClient, http, decodeAbiParameters, parseAbiParameters } from "viem";
import { base } from "viem/chains";

const SUCCESSFUL_TX = "0xe65b8bb9869725807654ef47b2960131a1144a551be2f8f7669f6760b6f7a2c7";

async function decodeSuccessfulTransaction() {
  try {
    console.log("🔍 DECODING SUCCESSFUL TRANSACTION");
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
    
    console.log("📋 TRANSACTION OVERVIEW:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Value: ${Number(tx.value) / 1e18} ETH`);
    console.log(`   Function: ${tx.input.slice(0, 10)}`);
    console.log(`   Data Size: ${tx.input.length} chars`);

    // Remove function selector
    const inputData = tx.input.slice(10);
    
    console.log("\n📋 PARAMETER DECODING:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      // Try to decode as execute(bytes, bytes[], uint256)
      const decoded = decodeAbiParameters(
        parseAbiParameters('bytes commands, bytes[] inputs, uint256 deadline'),
        `0x${inputData}` as `0x${string}`
      );
      
      console.log(`   Commands: ${decoded[0]}`);
      console.log(`   Commands Length: ${decoded[0].length} bytes`);
      console.log(`   Inputs Array Length: ${decoded[1].length} items`);
      console.log(`   Deadline: ${decoded[2]}`);
      
      // Decode commands bytes
      console.log("\n📋 COMMANDS BREAKDOWN:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      const commands = decoded[0].slice(2); // Remove 0x
      const commandCount = commands.length / 2; // Each command is 1 byte
      
      console.log(`   Total Commands: ${commandCount}`);
      
      for (let i = 0; i < commandCount; i++) {
        const commandByte = commands.slice(i * 2, (i + 1) * 2);
        const commandNum = parseInt(commandByte, 16);
        
        const commandNames: { [key: number]: string } = {
          0x00: 'V3_SWAP_EXACT_IN',
          0x01: 'V3_SWAP_EXACT_OUT', 
          0x02: 'PERMIT2_TRANSFER_FROM',
          0x03: 'PERMIT2_PERMIT_BATCH',
          0x04: 'SWEEP',
          0x05: 'TRANSFER',
          0x06: 'PAY_PORTION',
          0x08: 'V2_SWAP_EXACT_IN',
          0x09: 'V2_SWAP_EXACT_OUT',
          0x0a: 'PERMIT2_PERMIT',
          0x0b: 'WRAP_ETH',
          0x0c: 'UNWRAP_WETH',
          0x0d: 'PERMIT2_TRANSFER_FROM_BATCH',
          0x10: 'V4_SWAP',
          0x11: 'V4_POSITION_MANAGER_CALL',
          0x12: 'V4_POSITION_MANAGER_CALL_ENCODED',
        };
        
        const commandName = commandNames[commandNum] || `UNKNOWN_${commandByte}`;
        console.log(`     Command ${i + 1}: 0x${commandByte} = ${commandName}`);
      }
      
      // Decode inputs
      console.log("\n📋 INPUTS BREAKDOWN:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      decoded[1].forEach((input, index) => {
        console.log(`   Input ${index + 1}: ${input.slice(0, 50)}...`);
        console.log(`   Input ${index + 1} Length: ${input.length} chars`);
      });
      
      // If there are multiple commands, this explains the complexity!
      if (commandCount > 1) {
        console.log("\n🎯 KEY INSIGHT:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`   ✅ This is a MULTI-COMMAND transaction!`);
        console.log(`   🔄 ${commandCount} commands executed in sequence`);
        console.log(`   💡 We were only doing 1 command (V3_SWAP_EXACT_IN)`);
        console.log(`   🎯 We need to replicate the FULL command sequence`);
      }
      
    } catch (decodeError) {
      console.log(`   ❌ Failed to decode parameters: ${decodeError}`);
      
      // Try manual hex parsing
      console.log("\n📋 MANUAL HEX ANALYSIS:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // First 32 bytes should be offset to commands
      const commandsOffset = inputData.slice(0, 64);
      console.log(`   Commands Offset: 0x${commandsOffset}`);
      
      // Next 32 bytes should be offset to inputs array
      const inputsOffset = inputData.slice(64, 128);
      console.log(`   Inputs Offset: 0x${inputsOffset}`);
      
      // Next 32 bytes should be deadline
      const deadline = inputData.slice(128, 192);
      console.log(`   Deadline: 0x${deadline}`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  decodeSuccessfulTransaction();
} 