#!/usr/bin/env node

"use strict";

/**
 * Tests for utils/index.js
 */

const {
  decodeHtml,
  stripTags,
  normalizeText,
  decodeUnicodeLiteral,
  isPriceLike,
  parsePriceText,
  compactInlineText,
  detectCurrencyFromText,
  normalizeMoneyTextByCurrency,
  formatAmount,
  normalizeServiceDetails,
  asPlan,
  unique,
  isMonthlyUnit,
  isMonthlyPriceText,
  isStandardMonthlyPlan,
  keepStandardMonthlyPlans,
  PROVIDER_IDS,
} = require("../scripts/utils");

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

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`Assertion failed: ${message}\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`);
  }
}

// Test cases
function testDecodeHtml() {
  console.log("  Testing decodeHtml...");

  assertEqual(decodeHtml("&lt;div&gt;"), "<div>", "Should decode HTML entities");
  assertEqual(decodeHtml("&amp;&quot;"), "&\"", "Should decode &amp; and &quot;");
  assertEqual(decodeHtml("  hello   world  "), "hello world", "Should normalize whitespace");
  assertEqual(decodeHtml(null), "", "Should handle null");
  assertEqual(decodeHtml(123), "", "Should handle non-string");

  console.log("  ✓ decodeHtml tests passed");
}

function testStripTags() {
  console.log("  Testing stripTags...");

  assertEqual(stripTags("<p>Hello</p>"), "Hello", "Should strip HTML tags");
  assertEqual(stripTags("<p>Hello <b>World</b></p>"), "Hello World", "Should strip nested tags");
  assertEqual(stripTags("No tags here"), "No tags here", "Should handle plain text");

  console.log("  ✓ stripTags tests passed");
}

function testNormalizeText() {
  console.log("  Testing normalizeText...");

  assertEqual(normalizeText("  hello   world  "), "hello world", "Should normalize whitespace");
  assertEqual(normalizeText("\\u4e2d\\u6587"), "中文", "Should decode unicode");
  assertEqual(normalizeText("&lt;test&gt;"), "<test>", "Should decode HTML");

  console.log("  ✓ normalizeText tests passed");
}

function testDecodeUnicodeLiteral() {
  console.log("  Testing decodeUnicodeLiteral...");

  assertEqual(decodeUnicodeLiteral("\\u4e2d\\u6587"), "中文", "Should decode unicode");
  assertEqual(decodeUnicodeLiteral("\\u0048\\u0065\\u006c\\u006c\\u006f"), "Hello", "Should decode ASCII unicode");
  assertEqual(decodeUnicodeLiteral("No unicode"), "No unicode", "Should handle plain text");

  console.log("  ✓ decodeUnicodeLiteral tests passed");
}

function testIsPriceLike() {
  console.log("  Testing isPriceLike...");

  assertEqual(isPriceLike("¥99/月"), true, "Should recognize CNY price");
  assertEqual(isPriceLike("免费"), true, "Should recognize free");
  assertEqual(isPriceLike("$10/month"), false, "Should not recognize USD price without CNY markers");
  assertEqual(isPriceLike("Just text"), false, "Should reject non-price text");
  assertEqual(isPriceLike(""), false, "Should reject empty string");

  console.log("  ✓ isPriceLike tests passed");
}

function testParsePriceText() {
  console.log("  Testing parsePriceText...");

  const result1 = parsePriceText("¥99/月");
  assertEqual(result1.amount, 99, "Should parse amount");
  assertEqual(result1.text, "¥99/月", "Should preserve text");
  assertEqual(result1.unit, "月", "Should parse unit");

  const result2 = parsePriceText("免费");
  assertEqual(result2.amount, 0, "Should parse free as 0");

  const result3 = parsePriceText("");
  assertEqual(result3.amount, null, "Should return null for empty");

  const result4 = parsePriceText("$199/year");
  assertEqual(result4.amount, 199, "Should parse USD amount");
  assertEqual(result4.unit, "year", "Should parse year unit");

  console.log("  ✓ parsePriceText tests passed");
}

function testCompactInlineText() {
  console.log("  Testing compactInlineText...");

  assertEqual(compactInlineText("  hello   world  "), "hello world", "Should compact whitespace");
  assertEqual(compactInlineText("No extra space"), "No extra space", "Should handle normal text");

  console.log("  ✓ compactInlineText tests passed");
}

function testDetectCurrencyFromText() {
  console.log("  Testing detectCurrencyFromText...");

  assertEqual(detectCurrencyFromText("¥99"), "CNY", "Should detect CNY from ¥");
  assertEqual(detectCurrencyFromText("99元"), "CNY", "Should detect CNY from 元");
  assertEqual(detectCurrencyFromText("$10"), "USD", "Should detect USD from $");
  assertEqual(detectCurrencyFromText("10 USD"), "USD", "Should detect USD from USD");
  assertEqual(detectCurrencyFromText("100"), "USD", "Should use fallback");
  assertEqual(detectCurrencyFromText("100", "CNY"), "CNY", "Should use provided fallback");

  console.log("  ✓ detectCurrencyFromText tests passed");
}

function testNormalizeMoneyTextByCurrency() {
  console.log("  Testing normalizeMoneyTextByCurrency...");

  assertEqual(normalizeMoneyTextByCurrency("99元/月", "CNY"), "¥99/月", "Should normalize CNY");
  assertEqual(normalizeMoneyTextByCurrency("￥100", "CNY"), "¥100", "Should convert ￥ to ¥");
  assertEqual(normalizeMoneyTextByCurrency("免费"), "免费", "Should preserve free");
  assertEqual(normalizeMoneyTextByCurrency("$10/month"), "$10/month", "Should preserve USD");
  assertEqual(normalizeMoneyTextByCurrency(""), null, "Should return null for empty");

  console.log("  ✓ normalizeMoneyTextByCurrency tests passed");
}

function testFormatAmount() {
  console.log("  Testing formatAmount...");

  assertEqual(formatAmount(99), "99", "Should format integer");
  assertEqual(formatAmount(99.9), "99.9", "Should format decimal");
  assertEqual(formatAmount(99.99), "99.99", "Should format 2 decimal");
  assertEqual(formatAmount(99.00), "99", "Should remove trailing zeros");
  assertEqual(formatAmount(null), null, "Should return null for null");
  assertEqual(formatAmount(NaN), null, "Should return null for NaN");

  console.log("  ✓ formatAmount tests passed");
}

function testNormalizeServiceDetails() {
  console.log("  Testing normalizeServiceDetails...");

  assertDeepEqual(normalizeServiceDetails(["Feature 1", "Feature 2"]), ["Feature 1", "Feature 2"], "Should handle array");
  assertDeepEqual(normalizeServiceDetails("Feature 1; Feature 2"), ["Feature 1", "Feature 2"], "Should split by semicolon");
  assertDeepEqual(normalizeServiceDetails(null), null, "Should return null for null");
  assertDeepEqual(normalizeServiceDetails([]), null, "Should return null for empty array");

  console.log("  ✓ normalizeServiceDetails tests passed");
}

function testAsPlan() {
  console.log("  Testing asPlan...");

  const plan = asPlan({
    name: "Basic",
    currentPriceText: "¥99/月",
    originalPriceText: "¥199/月",
    notes: "Some notes",
  });

  assertEqual(plan.name, "Basic", "Should set name");
  assertEqual(plan.currentPrice, 99, "Should parse current price");
  assertEqual(plan.currentPriceText, "¥99/月", "Should set current price text");
  assertEqual(plan.originalPrice, 199, "Should parse original price");
  assertEqual(plan.unit, "月", "Should parse unit");

  console.log("  ✓ asPlan tests passed");
}

function testUnique() {
  console.log("  Testing unique...");

  assertDeepEqual(unique([1, 2, 2, 3, 3, 3]), [1, 2, 3], "Should remove duplicates");
  assertDeepEqual(unique(["a", "b", "a"]), ["a", "b"], "Should handle strings");
  assertDeepEqual(unique([null, 1, null, 2]), [1, 2], "Should filter nulls");

  console.log("  ✓ unique tests passed");
}

function testIsMonthlyUnit() {
  console.log("  Testing isMonthlyUnit...");

  assertEqual(isMonthlyUnit("月"), true, "Should recognize 月");
  assertEqual(isMonthlyUnit("month"), true, "Should recognize month");
  assertEqual(isMonthlyUnit("monthly"), true, "Should recognize monthly");
  assertEqual(isMonthlyUnit("年"), false, "Should reject 年");
  assertEqual(isMonthlyUnit(""), false, "Should reject empty");

  console.log("  ✓ isMonthlyUnit tests passed");
}

function testIsMonthlyPriceText() {
  console.log("  Testing isMonthlyPriceText...");

  assertEqual(isMonthlyPriceText("¥99/月"), true, "Should recognize monthly price");
  assertEqual(isMonthlyPriceText("$10/month"), true, "Should recognize English monthly");
  assertEqual(isMonthlyPriceText("首月免费"), false, "Should reject first month promo");
  assertEqual(isMonthlyPriceText("¥99/年"), false, "Should reject yearly price");

  console.log("  ✓ isMonthlyPriceText tests passed");
}

function testIsStandardMonthlyPlan() {
  console.log("  Testing isStandardMonthlyPlan...");

  assertEqual(isStandardMonthlyPlan({ currentPriceText: "¥99/月" }), true, "Should accept monthly plan");
  assertEqual(isStandardMonthlyPlan({ currentPriceText: "首月¥99" }), false, "Should reject first month promo");
  assertEqual(isStandardMonthlyPlan({ unit: "年" }), false, "Should reject yearly unit");
  assertEqual(isStandardMonthlyPlan({ currentPriceText: "¥99/季度" }), true, "Should accept quarterly");

  console.log("  ✓ isStandardMonthlyPlan tests passed");
}

function testKeepStandardMonthlyPlans() {
  console.log("  Testing keepStandardMonthlyPlans...");

  const plans = [
    { name: "Monthly", currentPriceText: "¥99/月" },
    { name: "Yearly", currentPriceText: "¥999/年" },
    { name: "First Month", currentPriceText: "首月¥9" },
    { name: "Quarterly", currentPriceText: "¥299/季度" },
  ];

  const result = keepStandardMonthlyPlans(plans);
  assertEqual(result.length, 2, "Should filter to 2 plans");
  assertEqual(result[0].name, "Monthly", "Should keep monthly");
  assertEqual(result[1].name, "Quarterly", "Should keep quarterly");

  console.log("  ✓ keepStandardMonthlyPlans tests passed");
}

function testProviderIds() {
  console.log("  Testing PROVIDER_IDS...");

  // PROVIDER_IDS is an object with provider constants
  const values = Object.values(PROVIDER_IDS);
  assert(values.length > 0, "PROVIDER_IDS should not be empty");
  assert(values.includes("zhipu-ai"), "Should include zhipu-ai");
  assert(values.includes("kimi-ai"), "Should include kimi-ai");
  assert(PROVIDER_IDS.ZHIPU === "zhipu-ai", "Should have ZHIPU constant");
  assert(PROVIDER_IDS.KIMI === "kimi-ai", "Should have KIMI constant");

  console.log("  ✓ PROVIDER_IDS tests passed");
}

// Run all tests
function runTests() {
  console.log("\nRunning utils tests...\n");

  try {
    testDecodeHtml();
    testStripTags();
    testNormalizeText();
    testDecodeUnicodeLiteral();
    testIsPriceLike();
    testParsePriceText();
    testCompactInlineText();
    testDetectCurrencyFromText();
    testNormalizeMoneyTextByCurrency();
    testFormatAmount();
    testNormalizeServiceDetails();
    testAsPlan();
    testUnique();
    testIsMonthlyUnit();
    testIsMonthlyPriceText();
    testIsStandardMonthlyPlan();
    testKeepStandardMonthlyPlans();
    testProviderIds();

    console.log("\n✅ All utils tests passed!\n");
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
