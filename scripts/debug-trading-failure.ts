#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { DexService } from "../src/services/dex-service.ts";
import { parseEther, formatEther } from "viem";
import { createTradeCall, type TradeParameters } from "@zoralabs/coins-sdk";

async function debugTradingFailure() {
  try {
    console.log("🔍 DEBUGGING TRADING FAILURE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });
    const config = Config.load();

    // Test with a known creator coin that should work
    const testTokens = [
      "0x0e2be91d4ca447eac82022d248eae98f034a6840", // NonbinaryJolteon (worked before)
      "0x2e40d958471ffca6dbd1954a78d1d7cc0d34dfd4", // skibillyy (tested before)
    ];

    console.log("📊 STEP 1: DEXSERVICE STATUS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const dexService = new DexService(config);
    const tradingStatus = dexService.getTradingStatus();
    
    console.log(`   Trading Ready: ${tradingStatus.ready ? '✅ YES' : '❌ NO'}`);
    if (!tradingStatus.ready) {
      console.log("   Issues:");
      tradingStatus.issues.forEach(issue => console.log(`      • ${issue}`));
    }
    console.log("");

    console.log("📊 STEP 2: TEST ZORA SDK DIRECTLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for (const tokenAddress of testTokens) {
      console.log(`\n🎯 Testing token: ${tokenAddress}`);
      console.log("   (This is a known working token from previous tests)");
      
      try {
        // Test createTradeCall first (this is what's likely failing)
        console.log("   🔄 Testing createTradeCall...");
        
        const tradeParameters: TradeParameters = {
          sell: { type: "eth" },
          buy: {
            type: "erc20",
            address: tokenAddress as `0x${string}`,
          },
          amountIn: parseEther("0.001"), // Small test amount
          slippage: 0.05,
          sender: "0x0000000000000000000000000000000000000000" as `0x${string}`, // Dummy for quote
        };

        const quote = await createTradeCall(tradeParameters);
        
        console.log("   ✅ createTradeCall successful!");
        console.log(`      Target: ${quote.call.target}`);
        console.log(`      Value: ${formatEther(BigInt(quote.call.value))} ETH`);
        console.log(`      Data length: ${quote.call.data.length} bytes`);

      } catch (error) {
        console.log("   ❌ createTradeCall failed!");
        console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
        
        // If it's a network error, show more details
        if (error instanceof Error) {
          console.log(`      Error type: ${error.constructor.name}`);
          if (error.cause) {
            console.log(`      Cause: ${error.cause}`);
          }
          if (error.stack) {
            console.log(`      Stack (first 3 lines):`);
            error.stack.split('\n').slice(0, 3).forEach(line => {
              console.log(`        ${line}`);
            });
          }
        }
      }
    }

    console.log("");
    console.log("📊 STEP 3: TEST ACTUAL DEXSERVICE BUY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Test the DexService.buyToken method in DRY_RUN mode
    console.log("🧪 Testing DexService.buyToken in DRY_RUN mode...");
    
    // Temporarily enable dry run for testing
    const originalDryRun = config.dryRunMode;
    config.dryRunMode = true;
    
    try {
      const testToken = testTokens[0] as `0x${string}`;
      const buyResult = await dexService.buyToken(testToken, 0.001);
      
      console.log(`   ✅ DexService.buyToken result:`);
      console.log(`      Success: ${buyResult.success}`);
      console.log(`      AmountIn: ${buyResult.amountIn}`);
      console.log(`      AmountOut: ${buyResult.amountOut}`);
      console.log(`      TxHash: ${buyResult.transactionHash}`);
      if (buyResult.error) {
        console.log(`      Error: ${buyResult.error}`);
      }

    } catch (error) {
      console.log("   ❌ DexService.buyToken failed!");
      console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Restore original dry run setting
      config.dryRunMode = originalDryRun;
    }

    console.log("");
    console.log("📊 STEP 4: NETWORK CONNECTIVITY TEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      console.log("   🔄 Testing network connectivity to Zora API...");
      const response = await fetch("https://api-sdk.zora.engineering/quote", {
        method: "HEAD", // Just check if endpoint is reachable
      });
      console.log(`   ✅ Zora API reachable: Status ${response.status}`);
    } catch (error) {
      console.log("   ❌ Network connectivity issue!");
      console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log("");
    console.log("💡 COMMON CAUSES OF QUOTE FAILURES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. Network connectivity issues");
    console.log("   2. Invalid token address");
    console.log("   3. Insufficient liquidity for the token");
    console.log("   4. API rate limiting");
    console.log("   5. Temporary Zora SDK service issues");
    console.log("   6. Invalid trade parameters (amount too small/large)");
    console.log("   7. Token not tradeable on Zora");

    console.log("");
    console.log("🔧 TROUBLESHOOTING STEPS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. Check the exact error message from the bot logs");
    console.log("   2. Verify network connectivity");
    console.log("   3. Test with known working tokens");
    console.log("   4. Check if the failing token has sufficient liquidity");
    console.log("   5. Try with different trade amounts");

  } catch (error) {
    console.error(`❌ Debug failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  debugTradingFailure();
}