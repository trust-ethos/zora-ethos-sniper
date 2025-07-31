#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { DexService } from "../src/services/dex-service.ts";

async function testSpecificBuy() {
  try {
    console.log("🔍 TESTING SPECIFIC TOKEN BUY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });
    const config = Config.load();

    // Get token address from command line args or use default
    const args = Deno.args;
    let tokenAddress: string;
    let buyAmount: number;

    if (args.length >= 1) {
      tokenAddress = args[0];
      buyAmount = args.length >= 2 ? parseFloat(args[1]) : 0.001;
    } else {
      // Default to a known working token for testing
      tokenAddress = "0x0e2be91d4ca447eac82022d248eae98f034a6840"; // NonbinaryJolteon
      buyAmount = 0.001;
      
      console.log("ℹ️  No token specified, using default test token");
      console.log("   Usage: deno task test-buy <token_address> [amount_in_eth]");
      console.log("");
    }

    console.log("🎯 TEST PARAMETERS:");
    console.log(`   Token: ${tokenAddress}`);
    console.log(`   Amount: ${buyAmount} ETH`);
    console.log(`   Dry Run: ${config.dryRunMode ? 'YES' : 'NO - REAL MONEY!'}`);
    console.log(`   Simulation: ${config.simulationMode ? 'YES' : 'NO'}`);
    console.log("");

    // Validate token address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      throw new Error(`Invalid token address format: ${tokenAddress}`);
    }

    // Validate buy amount
    if (buyAmount <= 0 || buyAmount > 1) {
      throw new Error(`Invalid buy amount: ${buyAmount} (must be > 0 and <= 1 ETH)`);
    }

    console.log("🔧 INITIALIZING DEX SERVICE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const dexService = new DexService(config);
    const tradingStatus = dexService.getTradingStatus();
    
    console.log(`   Trading Ready: ${tradingStatus.ready ? '✅ YES' : '❌ NO'}`);
    if (!tradingStatus.ready) {
      console.log("   Issues:");
      tradingStatus.issues.forEach(issue => console.log(`      • ${issue}`));
      
      if (!config.dryRunMode && !config.simulationMode) {
        throw new Error("Trading not ready and not in dry run mode");
      }
    }
    console.log("");

    console.log("💰 EXECUTING BUY ORDER");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    if (!config.dryRunMode && !config.simulationMode) {
      console.log("⚠️  WARNING: This will execute a REAL transaction with REAL money!");
      console.log("⚠️  Press Ctrl+C within 5 seconds to cancel...");
      console.log("");
      
      // 5 second countdown
      for (let i = 5; i > 0; i--) {
        console.log(`   Executing in ${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log("");
    }

    const startTime = Date.now();
    const result = await dexService.buyToken(tokenAddress as `0x${string}`, buyAmount);
    const endTime = Date.now();

    console.log("📊 RESULTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Success: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Duration: ${endTime - startTime}ms`);
    console.log(`   Amount In: ${result.amountIn} ETH`);
    
    if (result.success) {
      console.log(`   Amount Out: ${result.amountOut || 'N/A'}`);
      console.log(`   Transaction: ${result.transactionHash || 'N/A'}`);
      console.log(`   Gas Used: ${result.gasUsed || 'N/A'}`);
      
      if (result.transactionHash && !config.dryRunMode && !config.simulationMode) {
        console.log(`   🔗 BaseScan: https://basescan.org/tx/${result.transactionHash}`);
      }
    } else {
      console.log(`   Error: ${result.error}`);
    }

    console.log("");

    if (result.success) {
      console.log("🎉 BUY TEST SUCCESSFUL!");
    } else {
      console.log("❌ BUY TEST FAILED!");
      console.log("");
      console.log("🔍 TROUBLESHOOTING SUGGESTIONS:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      if (result.error?.includes('quote') || result.error?.includes('Quote')) {
        console.log("   💡 This appears to be a quote/pricing issue:");
        console.log("      • Check if token has sufficient liquidity");
        console.log("      • Try a different amount (larger or smaller)");
        console.log("      • Verify token is tradeable on Zora");
        console.log("      • Check network connectivity");
      } else {
        console.log("   💡 General troubleshooting:");
        console.log("      • Check wallet balance");
        console.log("      • Verify token address is correct");
        console.log("      • Try again in a few minutes");
        console.log("      • Check if token contract is verified");
      }
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  testSpecificBuy();
}