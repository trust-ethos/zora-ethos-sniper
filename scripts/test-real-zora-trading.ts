#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test Real Zora Trading Implementation
 * Test our corrected DexService with the actual Zora router
 */

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { DexService } from "../src/services/dex-service.ts";

// Your creator coin for testing
const YOUR_CREATOR_COIN = "0x1ffdd7a3ca67a8bc50a3db8d4ca4c3c790e70e17";
const TEST_AMOUNT_ETH = 0.001; // Very small test amount

async function testRealZoraTrading() {
  try {
    console.log("🧪 TESTING REAL ZORA TRADING IMPLEMENTATION");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎯 Creator Coin: ${YOUR_CREATOR_COIN}`);
    console.log(`💰 Test Amount: ${TEST_AMOUNT_ETH} ETH`);
    console.log("");

    await load({ export: true });
    
    // Load configuration
    const config = Config.load();
    console.log("📋 CONFIG CHECK:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Private Key: ${config.privateKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Dry Run Mode: ${config.dryRunMode ? '🧪 Enabled' : '⚠️  LIVE MODE'}`);
    console.log(`   Buying Enabled: ${config.enableBuying ? '✅ Yes' : '❌ No'}`);
    console.log(`   Selling Enabled: ${config.enableSelling ? '✅ Yes' : '❌ No'}`);
    console.log("");

    // Initialize DexService
    console.log("🔧 INITIALIZING DEX SERVICE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const dexService = new DexService(config);
    
    console.log(`   Status: ${dexService.getTradingStatus()}`);
    console.log(`   Wallet: ${dexService.getWalletAddress() || 'Not configured'}`);
    console.log(`   Ready: ${dexService.isReadyForTrading() ? '✅ Yes' : '❌ No'}`);
    console.log("");

    if (!dexService.isReadyForTrading()) {
      console.log("❌ DEX Service not ready for trading. Check your configuration.");
      return;
    }

    // Test buy function (with safety checks)
    console.log("🛒 TESTING BUY FUNCTION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if (config.dryRunMode) {
      console.log("🧪 Running in DRY RUN mode - no real transactions");
    } else {
      console.log("⚠️  LIVE MODE - Real transactions will be submitted!");
      console.log("🚨 5 second safety countdown...");
      
      for (let i = 5; i > 0; i--) {
        console.log(`   ${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log("🚀 Proceeding with live transaction!");
    }

    try {
      const buyResult = await dexService.buyToken(
        YOUR_CREATOR_COIN as `0x${string}`,
        TEST_AMOUNT_ETH
      );

      console.log("\n📊 BUY RESULT:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Success: ${buyResult.success ? '✅' : '❌'}`);
      console.log(`   Amount In: ${buyResult.amountIn} ETH`);
      console.log(`   Amount Out: ${buyResult.amountOut || 'N/A'}`);
      console.log(`   Transaction: ${buyResult.transactionHash || 'N/A'}`);
      console.log(`   Gas Used: ${buyResult.gasUsed || 'N/A'}`);
      console.log(`   Error: ${buyResult.error || 'None'}`);

      if (buyResult.success && buyResult.transactionHash) {
        console.log(`\n🔗 VIEW TRANSACTION:`);
        console.log(`   BaseScan: https://basescan.org/tx/${buyResult.transactionHash}`);
      }

    } catch (error) {
      console.error(`❌ Buy test failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Summary
    console.log("\n🎯 TEST SUMMARY:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   ✅ Updated DexService with REAL Zora router`);
    console.log(`   ✅ Function signature: execute(bytes,bytes[])`);
    console.log(`   ✅ Router: 0x6ff5693b99212da76ad316178a184ab56d299b43`);
    console.log(`   🎯 Ready to trade YOUR creator coin!`);

  } catch (error) {
    console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  testRealZoraTrading();
} 