#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test V4 Buy - One-off purchase test
 * Tests buying your creator coin using UniversalRouter V4
 */

import { load } from "@std/dotenv";
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseEther, 
  formatEther,
  getContract,
  encodePacked,
  encodeAbiParameters,
  parseAbiParameters
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Your creator coin for testing
const YOUR_CREATOR_COIN = "0x1ffdd7a3ca67a8bc50a3db8d4ca4c3c790e70e17";

// UniversalRouter on Base (VERIFIED!)
const UNIVERSAL_ROUTER = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

// UniversalRouter ABI (from BaseScan)
const UNIVERSAL_ROUTER_ABI = [
  {
    "inputs": [
      {"internalType": "bytes", "name": "commands", "type": "bytes"},
      {"internalType": "bytes[]", "name": "inputs", "type": "bytes[]"}
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
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

async function testV4Buy() {
  try {
    console.log("🧪 TESTING V4 BUY - ONE-OFF PURCHASE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    const privateKey = Deno.env.get("PRIVATE_KEY");
    const dryRun = Deno.env.get("DRY_RUN_MODE") === "true";
    
    // Amount to test with (very small!)
    const TEST_AMOUNT_ETH = "0.001"; // $3-4 USD
    
    console.log(`🎯 Target Token: ${YOUR_CREATOR_COIN}`);
    console.log(`💰 Test Amount: ${TEST_AMOUNT_ETH} ETH`);
    console.log(`🦄 Router: ${UNIVERSAL_ROUTER}`);
    console.log(`🧪 Dry Run: ${dryRun}`);
    console.log("");

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    if (!privateKey) {
      console.log("❌ No PRIVATE_KEY found in .env");
      console.log("   Add your private key to test live trading");
      return;
    }

    // Setup wallet
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const account = privateKeyToAccount(`0x${cleanKey}` as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrl),
    });

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`👛 Wallet: ${account.address}`);
    console.log(`💳 Balance: ${formatEther(balance)} ETH`);
    console.log("");

    // Check if we have enough balance
    const testAmount = parseEther(TEST_AMOUNT_ETH);
    if (balance < testAmount) {
      console.log(`❌ Insufficient balance for test`);
      console.log(`   Need: ${TEST_AMOUNT_ETH} ETH`);
      console.log(`   Have: ${formatEther(balance)} ETH`);
      return;
    }

    if (dryRun) {
      console.log("🧪 DRY RUN MODE - No real transaction will be made");
      console.log("✅ Would buy creator coins with UniversalRouter V4");
      console.log(`   Amount: ${TEST_AMOUNT_ETH} ETH`);
      console.log(`   Token: ${YOUR_CREATOR_COIN}`);
      console.log("");
      console.log("💡 To test for real, set DRY_RUN_MODE=false in .env");
      return;
    }

    // REAL TRADING WARNING
    console.log("⚠️  LIVE TRADING MODE - REAL MONEY WILL BE SPENT!");
    console.log("⚠️  This will use real ETH to buy real tokens!");
    console.log("");
    console.log("Press Ctrl+C within 5 seconds to cancel...");
    
    // 5 second countdown
    for (let i = 5; i > 0; i--) {
      console.log(`   ${i}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("🚀 EXECUTING TRADE!");
    console.log("");

    // Create router contract
    const router = getContract({
      address: UNIVERSAL_ROUTER as `0x${string}`,
      abi: UNIVERSAL_ROUTER_ABI,
      client: { public: publicClient, wallet: walletClient }
    });

    // Prepare trade parameters
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
    const amountIn = parseEther(TEST_AMOUNT_ETH);
    const amountOutMin = 0n; // Accept any amount for test
    
    // Encode V3/V4 swap command
    const commands = encodePacked(['uint8'], [0x00]); // V3_SWAP_EXACT_IN
    
    // Create path: WETH -> Your Creator Coin (0.3% fee)
    const path = encodePacked(['address', 'uint24', 'address'], [
      WETH_ADDRESS as `0x${string}`,
      3000, // 0.3% fee
      YOUR_CREATOR_COIN as `0x${string}`
    ]);

    const swapParams = encodeAbiParameters(
      parseAbiParameters('address, uint256, uint256, bytes, bool'),
      [
        account.address,
        amountIn,
        amountOutMin,
        path,
        false // not exactOutput
      ]
    );

    console.log("📋 Trade Details:");
    console.log(`   From: WETH (${WETH_ADDRESS})`);
    console.log(`   To: Your Creator Coin (${YOUR_CREATOR_COIN})`);
    console.log(`   Amount In: ${TEST_AMOUNT_ETH} ETH`);
    console.log(`   Min Out: Any amount (test mode)`);
    console.log(`   Deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
    console.log("");

    try {
      // Execute the trade
      console.log("⏳ Submitting transaction...");
      const txHash = await (router as any).write.execute([
        commands,
        [swapParams],
        deadline
      ], {
        value: amountIn // Send ETH
      });

      console.log(`✅ Transaction submitted!`);
      console.log(`📝 Hash: ${txHash}`);
      console.log(`🔗 BaseScan: https://basescan.org/tx/${txHash}`);
      console.log("");

      // Wait for confirmation
      console.log("⏳ Waiting for confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        timeout: 60_000 // 1 minute timeout
      });

      console.log("🎉 TRANSACTION CONFIRMED!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Status: ${receipt.status}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed}`);
      console.log(`   Gas Price: ${receipt.effectiveGasPrice}`);
      
      if (receipt.status === 'success') {
        console.log("✅ SUCCESS! You now own creator coins!");
        console.log(`🔗 View on BaseScan: https://basescan.org/tx/${txHash}`);
        
        // Check new balance
        const newBalance = await publicClient.getBalance({ address: account.address });
        const spent = balance - newBalance;
        console.log(`💳 ETH Spent: ${formatEther(spent)} ETH`);
        console.log(`💳 New Balance: ${formatEther(newBalance)} ETH`);
        
      } else {
        console.log("❌ Transaction failed");
      }

    } catch (error) {
      console.log(`❌ Trade failed: ${error}`);
      
      if (error instanceof Error) {
        console.log(`   Error: ${error.message}`);
        
        // Common error explanations
        if (error.message.includes('insufficient funds')) {
          console.log("💡 Try with a smaller amount or add more ETH");
        } else if (error.message.includes('slippage')) {
          console.log("💡 Try with higher slippage tolerance");
        } else if (error.message.includes('pool')) {
          console.log("💡 Pool might not exist - creator coin may not be tradeable yet");
        }
      }
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  testV4Buy();
} 