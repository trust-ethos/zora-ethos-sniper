#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { load } from "@std/dotenv";
import { Config } from "../src/config/config.ts";
import { DexService } from "../src/services/dex-service.ts";

async function testDexTradingStatus() {
  try {
    console.log("🔧 TESTING DEX TRADING STATUS FIX");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    await load({ export: true });
    const config = Config.load();

    console.log("📊 TESTING DEX SERVICE INITIALIZATION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const dexService = new DexService(config);
    console.log("   ✅ DexService created successfully");

    console.log("");
    console.log("📊 TESTING getTradingStatus METHOD:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const tradingStatus = dexService.getTradingStatus();
    console.log("   ✅ getTradingStatus() method exists and works!");
    console.log("");
    console.log("   📊 Trading Status:");
    console.log(`      Ready: ${tradingStatus.ready ? '✅ YES' : '❌ NO'}`);
    console.log(`      Issues: ${tradingStatus.issues.length}`);
    
    if (tradingStatus.issues.length > 0) {
      console.log("      📋 Issues:");
      tradingStatus.issues.forEach((issue, i) => {
        console.log(`         ${i + 1}. ${issue}`);
      });
    }

    console.log("");
    console.log("🎯 EXPECTED BEHAVIOR:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   • If PRIVATE_KEY set & valid → Should be ready");
    console.log("   • If no PRIVATE_KEY → Should show wallet issue");
    console.log("   • If DRY_RUN_MODE=true → Should show dry run issue");
    console.log("   • If ENABLE_BUYING=false & ENABLE_SELLING=false → Should show trading disabled issue");

    console.log("");
    console.log("🔧 ORIGINAL ERROR WAS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   ERROR Failed to evaluate trade: this.dexService.getTradingStatus is not a function");
    console.log("");
    console.log("✅ NOW FIXED:");
    console.log("   • Added getTradingStatus() method to DexService");
    console.log("   • Returns { ready: boolean, issues: string[] }");
    console.log("   • Trading bot can now check if DEX is ready before trading");

    console.log("");
    console.log("🚀 NEXT STEPS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   1. The bot should now work without the error");
    console.log("   2. Start the bot again: deno task start --strategy=degen");
    console.log("   3. Wait for qualifying creators (Ethos ≥ 1226)");
    console.log("   4. Should see successful trading attempts");

  } catch (error) {
    console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (import.meta.main) {
  testDexTradingStatus();
}