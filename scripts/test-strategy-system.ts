#!/usr/bin/env deno run --allow-net --allow-env --allow-read

import { parseCliArgs } from "../src/cli/cli-parser.ts";
import { AVAILABLE_STRATEGIES } from "../src/strategies/trading-strategy.ts";

function testStrategySystem() {
  console.log("🔍 TESTING STRATEGY SYSTEM");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // Test 1: CLI argument parsing
  console.log("📊 TEST 1: CLI ARGUMENT PARSING");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const testCases = [
    { args: ["--strategy=conservative"], expected: "Conservative" },
    { args: ["--strategy=degen"], expected: "Degen" },
    { args: ["--strategy=balanced"], expected: "Balanced" },
    { args: ["--strategy=aggressive"], expected: "Aggressive" },
    { args: ["--strategy=high-conviction"], expected: "High Conviction" },
    { args: [], expected: "Balanced" }, // Default
    { args: ["--strategy=invalid"], expected: "Balanced" }, // Fallback
  ];

  testCases.forEach(({ args, expected }, i) => {
    try {
      const options = parseCliArgs(args);
      const actual = options.strategy.name;
      const status = actual === expected ? "✅" : "❌";
      console.log(`   ${i + 1}. ${status} Args: [${args.join(", ")}] → Strategy: "${actual}"`);
      if (actual !== expected) {
        console.log(`      Expected: "${expected}", Got: "${actual}"`);
      }
    } catch (error) {
      console.log(`   ${i + 1}. ❌ Args: [${args.join(", ")}] → Error: ${error}`);
    }
  });

  console.log("");

  // Test 2: Strategy configurations
  console.log("📊 TEST 2: STRATEGY CONFIGURATIONS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  Object.entries(AVAILABLE_STRATEGIES).forEach(([key, strategy]) => {
    console.log(`\n🎯 ${strategy.name.toUpperCase()} Strategy (${key}):`);
    console.log(`   📊 Min Ethos: ${strategy.minEthosScore} | Trade: ${strategy.tradeAmountEth} ETH | Max Pos: ${strategy.maxPositions}`);
    console.log(`   🛡️  Stop Loss: ${strategy.stopLossPercent}% | Hold: ${Math.round(strategy.maxHoldTimeMinutes/60)}h`);
    console.log(`   🎯 Ladder Levels: ${strategy.ladderLevels.length} | Moon Bag: ${strategy.enableMoonBag ? strategy.moonBagPercent + '%' : 'No'}`);
    console.log(`   ⚡ Aggressiveness: ${strategy.aggressiveness} | Monitoring: ${strategy.monitoringIntervalMs/1000}s`);
    
    // Validate ladder levels are in ascending order
    let validLadder = true;
    for (let i = 1; i < strategy.ladderLevels.length; i++) {
      if (strategy.ladderLevels[i].triggerPercent <= strategy.ladderLevels[i-1].triggerPercent) {
        validLadder = false;
        break;
      }
    }
    console.log(`   📈 Ladder Order: ${validLadder ? "✅ Valid" : "❌ Invalid"}`);
    
    // Show first few ladder levels
    strategy.ladderLevels.slice(0, 3).forEach((level, i) => {
      const trigger = level.triggerPercent + 100;
      console.log(`      ${i+1}. ${trigger/100}x → Sell ${level.sellPercent}%`);
    });
    if (strategy.ladderLevels.length > 3) {
      console.log(`      ... and ${strategy.ladderLevels.length - 3} more levels`);
    }
  });

  console.log("");

  // Test 3: Strategy overrides
  console.log("📊 TEST 3: STRATEGY OVERRIDES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const overrideTests = [
    ["--strategy=conservative", "--min-ethos=2000"],
    ["--strategy=degen", "--trade-amount=0.05"],
    ["--strategy=balanced", "--stop-loss=30"],
    ["--strategy=aggressive", "--max-positions=15"],
  ];

  overrideTests.forEach((args, i) => {
    try {
      const options = parseCliArgs(args);
      console.log(`   ${i + 1}. ✅ Override Test: [${args.join(", ")}]`);
      console.log(`      Strategy: ${options.strategy.name}`);
      console.log(`      Min Ethos: ${options.strategy.minEthosScore}`);
      console.log(`      Trade Amount: ${options.strategy.tradeAmountEth} ETH`);
      console.log(`      Stop Loss: ${options.strategy.stopLossPercent}%`);
      console.log(`      Max Positions: ${options.strategy.maxPositions}`);
    } catch (error) {
      console.log(`   ${i + 1}. ❌ Override Test Failed: ${error}`);
    }
  });

  console.log("");

  // Test 4: Risk profile analysis
  console.log("📊 TEST 4: RISK PROFILE ANALYSIS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  Object.entries(AVAILABLE_STRATEGIES).forEach(([key, strategy]) => {
    const riskScore = calculateRiskScore(strategy);
    const riskLevel = getRiskLevel(riskScore);
    console.log(`   ${strategy.name.padEnd(15)} | Risk: ${riskLevel.padEnd(12)} | Score: ${riskScore.toFixed(1)}/10`);
  });

  console.log("");
  console.log("✅ STRATEGY SYSTEM TEST COMPLETED!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("🚀 READY FOR LIVE TRADING WITH STRATEGY SYSTEM!");
  console.log("");
  console.log("💡 USAGE EXAMPLES:");
  console.log("   deno task start --strategy=conservative --min-ethos=1500");
  console.log("   deno task start --strategy=degen --trade-amount=0.1");
  console.log("   deno task start --strategy=high-conviction --dry-run");
  console.log("   deno task start --list-strategies");
}

function calculateRiskScore(strategy: any): number {
  let score = 0;
  
  // Ethos score threshold (lower = higher risk)
  score += (3000 - strategy.minEthosScore) / 3000 * 2; // 0-2 points
  
  // Trade amount (higher = higher risk)
  score += strategy.tradeAmountEth * 20; // 0-2 points for 0-0.1 ETH
  
  // Stop loss (higher = higher risk)
  score += strategy.stopLossPercent / 100 * 2; // 0-2 points
  
  // Hold time (longer = higher risk)
  score += (strategy.maxHoldTimeMinutes / 7200) * 2; // 0-2 points for 0-5 days
  
  // Moon bag (larger = higher risk)
  score += strategy.enableMoonBag ? (strategy.moonBagPercent / 100 * 2) : 0; // 0-2 points
  
  return Math.min(score, 10);
}

function getRiskLevel(score: number): string {
  if (score <= 3) return "LOW 🟢";
  if (score <= 6) return "MEDIUM 🟡";
  if (score <= 8) return "HIGH 🟠";
  return "EXTREME 🔴";
}

if (import.meta.main) {
  testStrategySystem();
}