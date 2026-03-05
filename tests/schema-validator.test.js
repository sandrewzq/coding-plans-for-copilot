#!/usr/bin/env node

"use strict";

/**
 * Tests for schema-validator.js
 */

const { validatePricingData, validateProvider, validatePlan, PROVIDER_IDS } = require("../scripts/schema-validator");

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertArrayIncludes(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(`Assertion failed: ${message}\n  Array does not include: ${item}\n  Array: ${JSON.stringify(array)}`);
  }
}

// Test cases
function testValidatePlan() {
  console.log("  Testing validatePlan...");

  // Valid plan
  const validPlan = {
    name: "Basic Plan",
    currentPrice: 99,
    currentPriceText: "¥99/月",
    originalPrice: null,
    originalPriceText: null,
    unit: "月",
    notes: "Some notes",
    serviceDetails: ["Feature 1", "Feature 2"],
  };
  let errors = validatePlan(validPlan, 0);
  assertEqual(errors.length, 0, "Valid plan should have no errors");

  // Invalid plan - missing name
  const noNamePlan = { currentPriceText: "¥99/月" };
  errors = validatePlan(noNamePlan, 0);
  assertArrayIncludes(errors, "Plan[0].name: required string field", "Should detect missing name");

  // Invalid plan - wrong type for currentPrice
  const badPricePlan = {
    name: "Test",
    currentPrice: "not a number",
  };
  errors = validatePlan(badPricePlan, 0);
  assertArrayIncludes(errors, "Plan[0].currentPrice: must be a finite number or null", "Should detect invalid currentPrice type");

  // Invalid plan - no price info
  const noPricePlan = { name: "Test" };
  errors = validatePlan(noPricePlan, 0);
  assertArrayIncludes(errors, "Plan[0]: must have at least one of currentPriceText, currentPrice, or notes", "Should detect missing price info");

  // Invalid plan - wrong serviceDetails type
  const badServiceDetailsPlan = {
    name: "Test",
    currentPriceText: "¥99/月",
    serviceDetails: "not an array",
  };
  errors = validatePlan(badServiceDetailsPlan, 0);
  assertArrayIncludes(errors, "Plan[0].serviceDetails: must be an array or null", "Should detect invalid serviceDetails type");

  console.log("  ✓ validatePlan tests passed");
}

function testValidateProvider() {
  console.log("  Testing validateProvider...");

  // Valid provider
  const validProvider = {
    provider: PROVIDER_IDS[0],
    sourceUrls: ["https://example.com/pricing"],
    fetchedAt: new Date().toISOString(),
    plans: [
      {
        name: "Basic",
        currentPriceText: "¥99/月",
      },
    ],
  };
  let errors = validateProvider(validProvider, 0);
  assertEqual(errors.length, 0, "Valid provider should have no errors");

  // Invalid provider - unknown provider ID
  const badProviderId = {
    provider: "unknown-provider",
    sourceUrls: ["https://example.com"],
    fetchedAt: new Date().toISOString(),
    plans: [{ name: "Test", currentPriceText: "¥99/月" }],
  };
  errors = validateProvider(badProviderId, 0);
  assert(errors.some((e) => e.includes("must be one of")), "Should detect invalid provider ID");

  // Invalid provider - empty plans
  const emptyPlansProvider = {
    provider: PROVIDER_IDS[0],
    sourceUrls: ["https://example.com"],
    fetchedAt: new Date().toISOString(),
    plans: [],
  };
  errors = validateProvider(emptyPlansProvider, 0);
  assertArrayIncludes(errors, "Provider[0].plans: must contain at least one plan", "Should detect empty plans");

  // Invalid provider - invalid sourceUrls
  const badUrlsProvider = {
    provider: PROVIDER_IDS[0],
    sourceUrls: "not an array",
    fetchedAt: new Date().toISOString(),
    plans: [{ name: "Test", currentPriceText: "¥99/月" }],
  };
  errors = validateProvider(badUrlsProvider, 0);
  assertArrayIncludes(errors, "Provider[0].sourceUrls: must be an array", "Should detect invalid sourceUrls");

  // Invalid provider - invalid URL format
  const badUrlFormatProvider = {
    provider: PROVIDER_IDS[0],
    sourceUrls: ["not-a-url"],
    fetchedAt: new Date().toISOString(),
    plans: [{ name: "Test", currentPriceText: "¥99/月" }],
  };
  errors = validateProvider(badUrlFormatProvider, 0);
  assertArrayIncludes(errors, "Provider[0].sourceUrls[0]: must be a valid URL string", "Should detect invalid URL format");

  console.log("  ✓ validateProvider tests passed");
}

function testValidatePricingData() {
  console.log("  Testing validatePricingData...");

  // Valid data
  const validData = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    providers: [
      {
        provider: PROVIDER_IDS[0],
        sourceUrls: ["https://example.com"],
        fetchedAt: new Date().toISOString(),
        plans: [{ name: "Basic", currentPriceText: "¥99/月" }],
      },
    ],
    failures: [],
  };
  let result = validatePricingData(validData);
  assertEqual(result.isValid, true, "Valid data should be valid");
  assertEqual(result.errors.length, 0, "Valid data should have no errors");

  // Invalid data - wrong schemaVersion
  const badSchemaVersion = {
    ...validData,
    schemaVersion: 2,
  };
  result = validatePricingData(badSchemaVersion);
  assertEqual(result.isValid, false, "Wrong schemaVersion should be invalid");
  assertArrayIncludes(result.errors, "schemaVersion: expected 1, got 2", "Should detect wrong schemaVersion");

  // Invalid data - missing generatedAt
  const missingGeneratedAt = {
    schemaVersion: 1,
    providers: [],
  };
  result = validatePricingData(missingGeneratedAt);
  assertEqual(result.isValid, false, "Missing generatedAt should be invalid");
  assertArrayIncludes(result.errors, "generatedAt: must be an ISO date string", "Should detect missing generatedAt");

  // Invalid data - invalid date format
  const badDateFormat = {
    ...validData,
    generatedAt: "not-a-date",
  };
  result = validatePricingData(badDateFormat);
  assertEqual(result.isValid, false, "Invalid date format should be invalid");
  assertArrayIncludes(result.errors, "generatedAt: invalid date format", "Should detect invalid date format");

  // Invalid data - providers not an array
  const badProviders = {
    ...validData,
    providers: "not an array",
  };
  result = validatePricingData(badProviders);
  assertEqual(result.isValid, false, "Non-array providers should be invalid");
  assertArrayIncludes(result.errors, "providers: must be an array", "Should detect non-array providers");

  // Invalid data - failures not an array
  const badFailures = {
    ...validData,
    failures: "not an array",
  };
  result = validatePricingData(badFailures);
  assertEqual(result.isValid, false, "Non-array failures should be invalid");
  assertArrayIncludes(result.errors, "failures: must be an array", "Should detect non-array failures");

  console.log("  ✓ validatePricingData tests passed");
}

function testProviderIds() {
  console.log("  Testing PROVIDER_IDS...");

  assert(PROVIDER_IDS.length > 0, "PROVIDER_IDS should not be empty");
  assert(PROVIDER_IDS.includes("zhipu-ai"), "Should include zhipu-ai");
  assert(PROVIDER_IDS.includes("kimi-ai"), "Should include kimi-ai");
  assert(PROVIDER_IDS.includes("volcengine-ai"), "Should include volcengine-ai");

  // All IDs should be strings
  for (const id of PROVIDER_IDS) {
    assertEqual(typeof id, "string", `Provider ID ${id} should be a string`);
    assert(id.length > 0, `Provider ID ${id} should not be empty`);
  }

  console.log("  ✓ PROVIDER_IDS tests passed");
}

// Run all tests
function runTests() {
  console.log("\nRunning schema-validator tests...\n");

  try {
    testValidatePlan();
    testValidateProvider();
    testValidatePricingData();
    testProviderIds();

    console.log("\n✅ All schema-validator tests passed!\n");
    return 0;
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error.message);
    console.error("\n");
    return 1;
  }
}

// Run if called directly
if (require.main === module) {
  process.exit(runTests());
}

module.exports = { runTests };
