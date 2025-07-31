#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { DEGEN_STRATEGY, CONSERVATIVE_STRATEGY } from "../src/strategies/trading-strategy.ts";

function testStrategyThresholds() {
  console.log("🧪 TESTING STRATEGY THRESHOLD VALUES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  console.log("📊 STRATEGY COMPARISON:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Conservative Strategy: ${CONSERVATIVE_STRATEGY.minEthosScore}`);
  console.log(`Degen Strategy: ${DEGEN_STRATEGY.minEthosScore}`);
  console.log("");

  console.log("🔍 TEST CREATOR SCORES:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const testScores = [1341, 1275, 1600, 1800];
  
  testScores.forEach(score => {
    const qualifiesConservative = score >= CONSERVATIVE_STRATEGY.minEthosScore;
    const qualifiesDegen = score >= DEGEN_STRATEGY.minEthosScore;
    
    console.log(`Score ${score}:`);
    console.log(`   Conservative (≥${CONSERVATIVE_STRATEGY.minEthosScore}): ${qualifiesConservative ? '✅ QUALIFIES' : '❌ Too low'}`);
    console.log(`   Degen (≥${DEGEN_STRATEGY.minEthosScore}): ${qualifiesDegen ? '✅ QUALIFIES' : '❌ Too low'}`);
    console.log("");
  });

  console.log("🎯 EXPECTED BEHAVIOR AFTER FIX:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ With Degen strategy: Only scores ≥ 1600 should qualify");
  console.log("✅ No more 1341 and 1275 qualifying when running Degen strategy");
  console.log("✅ TradingBot now handles threshold check (not ZoraListener)");
}

if (import.meta.main) {
  testStrategyThresholds();
}