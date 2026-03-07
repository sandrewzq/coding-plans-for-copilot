"use strict";

const path = require("path");
const {
  HTML_ENTITIES,
  CNY_CURRENCY_HINT,
  USD_CURRENCY_HINT,
  COMMON_HEADERS,
  REQUEST_CONTEXT,
  REQUEST_TIMEOUT_MS,
  PROVIDER_IDS,
  getProviderUrl,
  decodeHtml,
  stripTags,
  normalizeText,
  decodeUnicodeLiteral,
  isPriceLike,
  parsePriceText,
  compactInlineText,
  detectCurrencyFromText,
  normalizeMoneyTextByCurrency,
  normalizePlanCurrencySymbols,
  normalizeProviderCurrencySymbols,
  dedupePlans,
  fetchText,
  fetchJson,
  extractRows,
  formatAmount,
  normalizeServiceDetails,
  buildServiceDetailsFromRows,
  asPlan,
  absoluteUrl,
  unique,
  timeUnitLabel,
  isMonthlyUnit,
  isMonthlyPriceText,
  isStandardMonthlyPlan,
  keepStandardMonthlyPlans,
  stripSimpleMarkdown
} = require("../utils");

async function parseZenmuxCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.ZENMUX, readmePath);
  // Prices in USD, last verified 2026-03 from https://zenmux.ai/pricing/subscription
  return {
    provider: PROVIDER_IDS.ZENMUX,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Free",
        currentPriceText: "$0",
        currentPrice: 0,
        unit: "月",
        notes: "Free for everyone",
        serviceDetails: [
          "Access to basic AI models and Claude Opus 4.6",
          "Studio Chat only",
          "~5 AI conversations/5h",
          "No API Request access",
        ],
        usageLimit: {
          "5hQuota": 5,
          "weekly": 50.4,
          "monthly": 216,
        }
      }),
      asPlan({
        name: "Pro",
        currentPriceText: "$20/月",
        currentPrice: 20,
        unit: "月",
        notes: "Leverage 2.73x",
        serviceDetails: [
          "Access to 100+ Coding | ImageGen | VideoGen | LLM models",
          "Studio Chat + API Request",
          "Priority technical support",
        ],
        usageLimit: {
          "5hQuota": 50,
          "weekly": 504,
          "monthly": 2160,
        }
      }),
      asPlan({
        name: "Max",
        currentPriceText: "$100/月",
        currentPrice: 100,
        unit: "月",
        notes: "Leverage 3.27x, 6x 5h usage than Pro",
        serviceDetails: [
          "GPT-5.2 Pro and Videos models",
          "6x 5h usage than Pro",
          "Early access to new features",
        ],
        usageLimit: {
          "5hQuota": 300,
          "weekly": 3024,
          "monthly": 12960,
        }
      }),
      asPlan({
        name: "Ultra",
        currentPriceText: "$200/月",
        currentPrice: 200,
        unit: "月",
        notes: "Leverage 4.36x, 16x 5h usage than Pro",
        serviceDetails: [
          "All models supported",
          "16x 5h usage than Pro",
          "Purpose-built for intensive Vibe Coding and professional-grade development",
        ],
        usageLimit: {
          "5hQuota": 800,
          "weekly": 8064,
          "monthly": 34560,
        }
      }),
    ],
  };
}

module.exports = parseZenmuxCodingPlans;
