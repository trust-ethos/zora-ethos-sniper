#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { DexService } from "../src/services/dex-service.ts";

async function testDexService() {
  try {
    console.log("🎯 TESTING UPDATED DEX SERVICE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });
    const config = Config.load();

    // Initialize DexService
    const dexService = new DexService(config);

    // Target: NonbinaryJolteon creator coin
    const TARGET_CREATOR_COIN = "0x0e2be91d4ca447eac82022d248eae98f034a6840";
    const TRADE_AMOUNT = 0.001; // Small test amount

    console.log(`🎯 TEST PARAMETERS:`);
    console.log(`   Service: DexService with Zora SDK`);
    console.log(`   Token: ${TARGET_CREATOR_COIN} (NonbinaryJolteon)`);
    console.log(`   Amount: ${TRADE_AMOUNT} ETH`);
    console.log(`   Mode: ${config.dryRunMode ? 'DRY RUN' : 'LIVE'}`);
    console.log("");

    // Test buyToken method
    console.log("🚀 Testing buyToken method...");
    
    const result = await dexService.buyToken(
      TARGET_CREATOR_COIN as `0x${string}`,
      TRADE_AMOUNT
    );

    console.log("📊 RESULTS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Amount In: ${result.amountIn} ETH`);
    
    if (result.success) {
      console.log(`   Transaction Hash: ${result.transactionHash}`);
      if (result.transactionHash && !config.dryRunMode) {
        console.log(`   🔗 BaseScan: https://basescan.org/tx/${result.transactionHash}`);
      }
      if (result.gasUsed) {
        console.log(`   ⛽ Gas Used: ${result.gasUsed}`);
      }
      if (result.effectiveGasPrice) {
        console.log(`   💰 Gas Price: ${result.effectiveGasPrice}`);
      }
    } else {
      console.log(`   Error: ${result.error}`);
    }

    console.log("");
    console.log(`✅ DexService test completed successfully!`);

  } catch (error) {
    console.error(`❌ DexService test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  testDexService();
}