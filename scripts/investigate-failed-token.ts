#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";

async function investigateFailedToken() {
  try {
    console.log("🔍 INVESTIGATING FAILED TOKEN");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });
    
    const problematicToken = "0x00000000000000000000000006819530aa29e799";
    
    console.log("📊 TOKEN ANALYSIS:");
    console.log(`   Address: ${problematicToken}`);
    console.log(`   Length: ${problematicToken.length} characters`);
    console.log(`   Valid format: ${isAddress(problematicToken) ? '✅ YES' : '❌ NO'}`);
    console.log("");

    // Check if it's a valid Ethereum address
    if (!isAddress(problematicToken)) {
      console.log("❌ INVALID ADDRESS FORMAT");
      return;
    }

    // Create Base network client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
    });

    console.log("🔍 BLOCKCHAIN VERIFICATION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
      // Check if contract exists
      const code = await publicClient.getBytecode({ address: problematicToken as `0x${string}` });
      console.log(`   Contract exists: ${code && code !== '0x' ? '✅ YES' : '❌ NO'}`);
      
      if (code && code !== '0x') {
        console.log(`   Bytecode length: ${code.length} characters`);
        
        // Try to get basic token info (this will fail if it's not a token)
        try {
          // Try ERC20 name() call
          const nameData = await publicClient.readContract({
            address: problematicToken as `0x${string}`,
            abi: [
              {
                name: 'name',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: '', type: 'string' }],
              },
            ],
            functionName: 'name',
          });
          console.log(`   Token name: ${nameData}`);
        } catch (error) {
          console.log(`   Token name: ❌ Failed (${error instanceof Error ? error.message : 'Unknown error'})`);
        }

        try {
          // Try ERC20 symbol() call
          const symbolData = await publicClient.readContract({
            address: problematicToken as `0x${string}`,
            abi: [
              {
                name: 'symbol',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: '', type: 'string' }],
              },
            ],
            functionName: 'symbol',
          });
          console.log(`   Token symbol: ${symbolData}`);
        } catch (error) {
          console.log(`   Token symbol: ❌ Failed (${error instanceof Error ? error.message : 'Unknown error'})`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Blockchain check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("");
    console.log("🌐 ZORA API TEST:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Test Zora API directly
    try {
      const response = await fetch("https://api-sdk.zora.engineering/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sell: { type: "eth" },
          buy: { type: "erc20", address: problematicToken },
          amountIn: "1000000000000000", // 0.001 ETH in wei
          slippage: 0.05,
          sender: "0x0000000000000000000000000000000000000000",
        }),
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   OK: ${response.ok ? '✅ YES' : '❌ NO'}`);

      const responseText = await response.text();
      console.log(`   Response: ${responseText}`);

    } catch (error) {
      console.log(`   ❌ Zora API test failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("");
    console.log("💡 ANALYSIS & SOLUTIONS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 POSSIBLE CAUSES:");
    console.log("   1. Token address has unusual format (mostly zeros)");
    console.log("   2. Token is too new for Zora's indexing system");
    console.log("   3. Token is not tradeable on Zora's protocol");
    console.log("   4. Zora API server having temporary issues");
    console.log("   5. Token might be a creator coin but not properly supported");
    console.log("");
    console.log("🔧 SOLUTIONS:");
    console.log("   1. Add retry logic with exponential backoff");
    console.log("   2. Skip tokens that fail quotes after retries");
    console.log("   3. Add token address validation before trading");
    console.log("   4. Implement fallback trading methods");
    console.log("   5. Add delay for newly created tokens");

  } catch (error) {
    console.error(`❌ Investigation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  investigateFailedToken();
}