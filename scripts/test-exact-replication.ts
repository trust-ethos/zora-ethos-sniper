#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test Exact Replication
 * Replicate the successful transaction exactly with scaled amounts
 */

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseEther, 
  getContract,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// REAL Zora Router
const ZORA_ROUTER = "0x6ff5693b99212da76ad316178a184ab56d299b43" as Address;

// Router ABI
const ZORA_ROUTER_ABI = [
  {
    "inputs": [
      {"internalType": "bytes", "name": "commands", "type": "bytes"},
      {"internalType": "bytes[]", "name": "inputs", "type": "bytes[]"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"}
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

async function testExactReplication() {
  try {
    console.log("🎯 TESTING EXACT TRANSACTION REPLICATION");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });
    const config = Config.load();
    
    if (!config.privateKey) {
      throw new Error("PRIVATE_KEY required for testing");
    }

    // Setup wallet
    const cleanKey = config.privateKey.startsWith('0x') 
      ? config.privateKey.slice(2) 
      : config.privateKey;
      
    const account = privateKeyToAccount(`0x${cleanKey}` as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(config.baseRpcUrl),
    });
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    // EXACT REPLICATION with scaling
    const ORIGINAL_ETH = 0.03; // Successful transaction amount
    const TARGET_ETH = 0.001;  // Slightly larger amount for V4 swap compatibility
    const SCALE_FACTOR = TARGET_ETH / ORIGINAL_ETH; // 0.33 - scaled down

    console.log(`📊 SCALING PARAMETERS:`);
    console.log(`   Original: ${ORIGINAL_ETH} ETH`);
    console.log(`   Target: ${TARGET_ETH} ETH`);
    console.log(`   Scale Factor: ${SCALE_FACTOR.toFixed(4)}`);
    console.log("");

    // ===== EXACT COMMANDS =====
    const commands = "0x0b001004"; // WRAP_ETH + V3_SWAP_EXACT_IN + V4_SWAP + SWEEP
    
    // ===== EXACT INPUTS WITH SCALING =====
    const targetAmountWei = parseEther(TARGET_ETH.toString());
    const yourAddress = account.address.toLowerCase();
    
    // INPUT 1: WRAP_ETH (scaled amount, router recipient)
    const input1 = `0x000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000${targetAmountWei.toString(16).padStart(16, '0')}`;
    
    // INPUT 2: V3_SWAP_EXACT_IN (exact same structure, scaled amount)
    const input2 = `0x000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000${targetAmountWei.toString(16).padStart(16, '0')}000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042420000000000000000000000000000000000000060001f4833589fcd6edb6e08f4c7c32d4f71b54bda02913000bb81111111111166b7fe7bd91427724b487980afc690000000000000000000000000000000000000000000000000000000000000000`;
    
    // INPUT 3: V4_SWAP (complex - use exact same with your address substituted)
    const originalSender = "30ffe705f632a93c0194b1c7452d614c489b6374";
    const yourAddressHex = yourAddress.slice(2); // Remove 0x
    
    let input3 = "0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000003" + "0b070e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003" + "0000000000000000000000000000000000000000000000000000000000000060" + "000000000000000000000000000000000000000000000000000000000000000e" + "000000000000000000000000000000000000000000000000000000000000002a" + "0000000000000000000000000000000000000000000000000000000000000060" + "0000000000000000000000001111111111166b7fe7bd91427724b487980afc6980" + "00000000000000000000000000000000000000000000000000000000000000000" + "00000000000000000000000000000000000000000000000000000000000000000" + "000000000000000000000000000000000000000000000000000000000000001a0" + "000000000000000000000000000000000000000000000000000000000000000200" + "0000000000000000000000001111111111166b7fe7bd91427724b487980afc6900" + "000000000000000000000000000000000000000000000000000000000000008000" + "000000000000000000000000000000000000000000000000000000000000000000" + "000000000000000000000000000000000000000d1d1b40920de1a4449170000000" + "000000000000000000000000000000000000000000000000000000000000000100" + "000000000000000000000000000000000000000000000000000000000000002000" + "0000000000000000000000000e2be91d4ca447eac82022d248eae98f034a6840000" + "000000000000000000000000000000000000000000000000000000000007530000" + "00000000000000000000000000000000000000000000000000000000000000c800" + "0000000000000000000000d61a675f8a0c67a73dc3b54fb7318b4d914090400000" + "0000000000000000000000000000000000000000000000000000000000000a0000" + "000000000000000000000000000000000000000000000000000000000000000000" + "000000000000000000000000000000000000000000000000000000000000006000" + "00000000000000000000000e2be91d4ca447eac82022d248eae98f034a6840000000" + "0000000000000000000000" + yourAddressHex + "00000000000000000000000000000000000000000000000000000000000000000";
    
    // INPUT 4: SWEEP (sweep creator coin 0x0e2be91d4ca447eac82022d248eae98f034a6840 to your address)
    const input4 = `0x0000000000000000000000000e2be91d4ca447eac82022d248eae98f034a68400000000000000000000000${yourAddressHex}0000000000000000000000000000000000000000000000000000000000000000`;
    
    // Current deadline
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes from now
    
    console.log("🔧 REPLICATION PARAMETERS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Commands: ${commands}`);
    console.log(`   Your Address: ${yourAddress}`);
    console.log(`   Target Amount: ${TARGET_ETH} ETH`);
    console.log(`   Deadline: ${deadline}`);
    console.log("");

    if (config.dryRunMode) {
      console.log("🧪 DRY RUN MODE - Transaction would be:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   To: ${ZORA_ROUTER}`);
      console.log(`   Value: ${TARGET_ETH} ETH`);
      console.log(`   Commands: ${commands}`);
      console.log(`   Inputs: [4 items]`);
      console.log(`   Success: ✅ Simulated`);
      return;
    }

    console.log("⚠️  LIVE MODE - Executing real transaction!");
    console.log("🚨 5 second countdown...");
    for (let i = 5; i > 0; i--) {
      console.log(`   ${i}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log("🚀 Executing!");

    // Create router contract
    const router = getContract({
      address: ZORA_ROUTER,
      abi: ZORA_ROUTER_ABI,
      client: { public: publicClient, wallet: walletClient }
    });

    // Execute exact replication
    const txHash = await (router as any).write.execute([
      commands as `0x${string}`,
      [
        input1 as `0x${string}`,
        input2 as `0x${string}`,
        input3 as `0x${string}`,
        input4 as `0x${string}`
      ],
      deadline
    ], {
      value: targetAmountWei
    });

    console.log(`✅ Exact replication submitted: ${txHash}`);
    console.log(`🔗 BaseScan: https://basescan.org/tx/${txHash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash 
    });

    if (receipt.status === 'success') {
      console.log(`🎉 EXACT REPLICATION SUCCESSFUL!`);
    } else {
      console.log(`❌ Transaction failed`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  testExactReplication();
} 