#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * Test Ethos score validation with high values
 */

import { Config } from "../src/config/config.ts";

function testEthosValidation() {
  console.log("🧪 Testing Ethos Score Validation...\n");

  const testCases = [
    { value: "750", description: "Default (moderate)" },
    { value: "1500", description: "High reputation" },
    { value: "2500", description: "Elite reputation" },
    { value: "2800", description: "Ultra-elite (user example)" },
    { value: "3500", description: "Too high (should fail)" },
    { value: "-100", description: "Negative (should fail)" },
  ];

  for (const testCase of testCases) {
    try {
      // Set the env var
      Deno.env.set("MIN_ETHOS_SCORE", testCase.value);
      
      // Try to load config
      const config = Config.load();
      
      console.log(`✅ ${testCase.value}: ${testCase.description} - PASSED`);
      console.log(`   Loaded value: ${config.minEthosScore}`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${testCase.value}: ${testCase.description} - FAILED`);
      console.log(`   Error: ${message}`);
    }
    console.log("");
  }

  // Reset to default
  Deno.env.set("MIN_ETHOS_SCORE", "750");
  
  console.log("💡 SUMMARY:");
  console.log("   ✅ Values 0-3000 should be accepted");
  console.log("   ❌ Values outside this range should be rejected");
  console.log("   🎯 The user's 2800 value should now work!");
}

if (import.meta.main) {
  testEthosValidation();
} 