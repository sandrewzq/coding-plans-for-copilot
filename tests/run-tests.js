#!/usr/bin/env node

"use strict";

/**
 * Test runner for all tests
 * Runs all test files and reports results
 */

const path = require("node:path");
const fs = require("node:fs");

const TEST_DIR = __dirname;

// Colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Find all test files
function findTestFiles() {
  const files = fs.readdirSync(TEST_DIR);
  return files.filter((file) => file.endsWith(".test.js")).map((file) => path.join(TEST_DIR, file));
}

// Run a single test file
async function runTestFile(filePath) {
  const testName = path.basename(filePath, ".test.js");
  console.log(colorize("cyan", `\n${"=".repeat(50)}`));
  console.log(colorize("cyan", `Running: ${testName}`));
  console.log(colorize("cyan", "=".repeat(50)));

  try {
    // Clear require cache to allow re-running
    delete require.cache[require.resolve(filePath)];

    const testModule = require(filePath);

    // If module exports runTests function, use it
    if (typeof testModule.runTests === "function") {
      const exitCode = testModule.runTests();
      return { name: testName, passed: exitCode === 0, exitCode };
    }

    // Otherwise assume the test runs on require
    return { name: testName, passed: true, exitCode: 0 };
  } catch (error) {
    console.error(colorize("red", `Error running ${testName}:`));
    console.error(error.message);
    return { name: testName, passed: false, exitCode: 1 };
  }
}

// Run lint check
async function runLint() {
  console.log(colorize("cyan", `\n${"=".repeat(50)}`));
  console.log(colorize("cyan", "Running: ESLint"));
  console.log(colorize("cyan", "=".repeat(50)));

  const { execSync } = require("node:child_process");
  const path = require("node:path");
  const fs = require("node:fs");

  // Check if eslint is installed
  const eslintPath = path.resolve(__dirname, "..", "node_modules", ".bin", "eslint");
  const eslintPathWin = path.resolve(__dirname, "..", "node_modules", ".bin", "eslint.cmd");
  const hasEslint = fs.existsSync(eslintPath) || fs.existsSync(eslintPathWin);

  if (!hasEslint) {
    console.log(colorize("yellow", "\n⚠️  ESLint not installed, skipping lint check"));
    console.log(colorize("yellow", "   Run 'npm install' to install ESLint"));
    return { name: "lint", passed: true, exitCode: 0, skipped: true };
  }

  try {
    execSync("npm run lint", { stdio: "inherit", cwd: path.resolve(__dirname, "..") });
    console.log(colorize("green", "\n✅ Lint passed!"));
    return { name: "lint", passed: true, exitCode: 0 };
  } catch (error) {
    console.log(colorize("red", "\n❌ Lint failed!"));
    return { name: "lint", passed: false, exitCode: 1 };
  }
}

// Validate pricing data
async function validatePricingData() {
  console.log(colorize("cyan", `\n${"=".repeat(50)}`));
  console.log(colorize("cyan", "Running: Pricing Data Validation"));
  console.log(colorize("cyan", "=".repeat(50)));

  try {
    const { execSync } = require("node:child_process");
    execSync("node scripts/schema-validator.js", {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
    });
    console.log(colorize("green", "\n✅ Pricing data validation passed!"));
    return { name: "validate-pricing", passed: true, exitCode: 0 };
  } catch (error) {
    console.log(colorize("red", "\n❌ Pricing data validation failed!"));
    return { name: "validate-pricing", passed: false, exitCode: 1 };
  }
}

// Main test runner
async function runAllTests() {
  console.log(colorize("cyan", "\n" + "=".repeat(50)));
  console.log(colorize("cyan", "  TEST SUITE"));
  console.log(colorize("cyan", "=".repeat(50)));

  const results = [];

  // Run lint first
  results.push(await runLint());

  // Run unit tests
  const testFiles = findTestFiles();
  for (const testFile of testFiles) {
    const result = await runTestFile(testFile);
    results.push(result);
  }

  // Validate pricing data if it exists
  const pricingDataPath = path.resolve(__dirname, "..", "docs", "provider-pricing.json");
  if (fs.existsSync(pricingDataPath)) {
    results.push(await validatePricingData());
  } else {
    console.log(colorize("yellow", "\n⚠️  No pricing data found, skipping validation"));
  }

  // Print summary
  console.log(colorize("cyan", "\n" + "=".repeat(50)));
  console.log(colorize("cyan", "  TEST SUMMARY"));
  console.log(colorize("cyan", "=".repeat(50)));

  let passedCount = 0;
  let failedCount = 0;

  for (const result of results) {
    const status = result.passed ? colorize("green", "✅ PASS") : colorize("red", "❌ FAIL");
    console.log(`${status} ${result.name}`);
    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  console.log(colorize("cyan", "-".repeat(50)));
  console.log(`Total: ${results.length} | ${colorize("green", `Passed: ${passedCount}`)} | ${colorize("red", `Failed: ${failedCount}`)}`);
  console.log(colorize("cyan", "=".repeat(50) + "\n"));

  return failedCount === 0 ? 0 : 1;
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error(colorize("red", "\nTest runner error:"));
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
