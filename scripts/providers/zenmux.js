"use strict";

const {
  HTML_ENTITIES,
  CNY_CURRENCY_HINT,
  USD_CURRENCY_HINT,
  COMMON_HEADERS,
  REQUEST_CONTEXT,
  REQUEST_TIMEOUT_MS,
  PROVIDER_IDS,
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
  const pageUrl = "https://zenmux.ai/pricing/subscription";
  // Prices in USD, last verified 2026-03:
  // Pro $20/月, Max $100/月, Ultra $200/月
  return {
    provider: PROVIDER_IDS.ZENMUX,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Pro",
        currentPriceText: "$20/月",
        currentPrice: 20,
        unit: "月",
        serviceDetails: [
          "50 Flows/5h",
          "100+ Coding | ImageGen | LLM 模型",
          "Studio Chat + API Request",
          "优先技术支持",
        ],
      }),
      asPlan({
        name: "Max",
        currentPriceText: "$100/月",
        currentPrice: 100,
        unit: "月",
        serviceDetails: [
          "300 Flows/5h（6x Pro 用量）",
          "GPT-5.2 Pro 及视频模型",
          "优先体验新功能",
        ],
      }),
      asPlan({
        name: "Ultra",
        currentPriceText: "$200/月",
        currentPrice: 200,
        unit: "月",
        serviceDetails: [
          "800 Flows/5h（16x Pro 用量）",
          "所有模型支持",
          "专为高强度 Vibe Coding 和专业开发打造",
        ],
      }),
    ],
  };
}

module.exports = parseZenmuxCodingPlans;
