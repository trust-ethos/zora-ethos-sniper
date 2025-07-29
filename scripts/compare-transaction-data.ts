#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Compare Transaction Data
 * Compare our failed transaction with the successful one to find the issue
 */

import { load } from "@std/dotenv";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Transaction data comparison
const SUCCESSFUL_TX = "0xe65b8bb9869725807654ef47b2960131a1144a551be2f8f7669f6760b6f7a2c7";
const OUR_FAILED_DATA = "0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000006888726500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000100000000000000000000000000a78c515197715215829a79d6cb3988fdaed2432900000000000000000000000000000000000000000000000000038d7ea4c68000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b4200000000000000000000000000000000000006000bb81ffdd7a3ca67a8bc50a3db8d4ca4c3c790e70e17000000000000000000000000000000000000000000";

async function compareTransactionData() {
  try {
    console.log("🔍 COMPARING TRANSACTION DATA");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Successful TX: ${SUCCESSFUL_TX}`);
    console.log(`❌ Our Failed Data: ${OUR_FAILED_DATA.slice(0, 50)}...`);
    console.log("");

    await load({ export: true });
    
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    // 1. Get the successful transaction details
    console.log("📋 1. SUCCESSFUL TRANSACTION ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const successfulTx = await publicClient.getTransaction({ hash: SUCCESSFUL_TX as `0x${string}` });
    
    console.log(`   From: ${successfulTx.from}`);
    console.log(`   To: ${successfulTx.to}`);
    console.log(`   Value: ${successfulTx.value} wei (${Number(successfulTx.value) / 1e18} ETH)`);
    console.log(`   Function: ${successfulTx.input.slice(0, 10)}`);
    console.log(`   Data Length: ${successfulTx.input.length} chars`);
    console.log(`   Full Data: ${successfulTx.input.slice(0, 100)}...`);

    // 2. Compare function signatures
    console.log("\n📋 2. FUNCTION SIGNATURE COMPARISON:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const successfulSig = successfulTx.input.slice(0, 10);
    const ourSig = OUR_FAILED_DATA.slice(0, 10);
    
    console.log(`   Successful: ${successfulSig} ${successfulSig === '0x3593564c' ? '✅' : '❌'}`);
    console.log(`   Our Failed: ${ourSig} ${ourSig === '0x3593564c' ? '✅' : '❌'}`);
    console.log(`   Match: ${successfulSig === ourSig ? '✅ Same function' : '❌ Different functions'}`);

    // 3. Compare data lengths
    console.log("\n📋 3. DATA LENGTH COMPARISON:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    console.log(`   Successful: ${successfulTx.input.length} characters`);
    console.log(`   Our Failed: ${OUR_FAILED_DATA.length} characters`);
    console.log(`   Difference: ${Math.abs(successfulTx.input.length - OUR_FAILED_DATA.length)} characters`);

    // 4. Decode the successful transaction parameters
    console.log("\n📋 4. SUCCESSFUL TRANSACTION BREAKDOWN:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const successfulData = successfulTx.input.slice(10); // Remove function selector
    console.log(`   Parameters: ${successfulData.slice(0, 100)}...`);
    
    // Extract first few parameters (rough decode)
    const param1Offset = successfulData.slice(0, 64);
    const param2Offset = successfulData.slice(64, 128);
    const param3 = successfulData.slice(128, 192);
    
    console.log(`   Param 1 Offset: 0x${param1Offset}`);
    console.log(`   Param 2 Offset: 0x${param2Offset}`);
    console.log(`   Param 3 (deadline?): 0x${param3}`);

    // 5. Compare value amounts
    console.log("\n📋 5. VALUE COMPARISON:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const successfulETH = Number(successfulTx.value) / 1e18;
    const ourETH = 0.001;
    
    console.log(`   Successful: ${successfulETH} ETH`);
    console.log(`   Our Failed: ${ourETH} ETH`);
    console.log(`   Ratio: ${successfulETH / ourETH}x`);

    // 6. Hypothesis about the issue
    console.log("\n🤔 POTENTIAL ISSUES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   1. 📊 Different parameter encoding`);
    console.log(`   2. 🔄 Wrong command byte (we used 0x00)`);
    console.log(`   3. 🛣️  Wrong path structure`);
    console.log(`   4. 💰 Minimum amount requirements`);
    console.log(`   5. 🎯 Pool doesn't exist for this path`);
    console.log(`   6. 🔑 Authorization/approval needed`);

    // 7. Next steps
    console.log("\n🎯 NEXT STEPS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   1. 🔍 Extract exact parameters from successful TX`);
    console.log(`   2. 🧪 Try different command bytes`);
    console.log(`   3. 📋 Check if we need different ABI`);
    console.log(`   4. 💱 Test with larger amount (0.03 ETH like successful)`);
    console.log(`   5. 🎯 Investigate router interface differences`);

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  compareTransactionData();
} 