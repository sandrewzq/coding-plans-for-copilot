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

async function parseMthreadsCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.MTHREADS, readmePath);
  // Prices are hardcoded in the frontend JS bundle; use known verified values as the primary data.
  // Last verified 2026-03 from https://code.mthreads.com/:
  // Lite ¥120/季度, Pro ¥600/季度, Max ¥1200/季度
  return {
    provider: PROVIDER_IDS.MTHREADS,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Lite Plan",
        currentPriceText: "¥120/季度",
        currentPrice: 120,
        unit: "季度",
        notes: "约¥40/月",
        serviceDetails: [
          "每5小时约120次提示（Claude Pro 的3倍用量）",
          "GLM-4.7 最新开源模型，持续更新",
          "支持 Claude Code、Cursor、Cline、Kilo Code 等主流工具",
          "摩尔线程 MTT S5000 算力支持",
        ],
      }),
      asPlan({
        name: "Pro Plan",
        currentPriceText: "¥600/季度",
        currentPrice: 600,
        unit: "季度",
        notes: "约¥200/月，Lite Plan 的5倍用量",
        serviceDetails: [
          "每5小时约600次提示",
          "更快的生成速度，响应保障",
          "最新开源模型持续更新",
          "支持主流 AI 编码工具",
        ],
      }),
      asPlan({
        name: "Max Plan",
        currentPriceText: "¥1200/季度",
        currentPrice: 1200,
        unit: "季度",
        notes: "约¥400/月，Pro Plan 的4倍用量",
        serviceDetails: [
          "每5小时约2400次提示",
          "峰值期优先访问，抢先体验新功能",
          "最新开源模型持续更新",
          "支持主流 AI 编码工具",
        ],
      }),
    ],
  };
}

module.exports = parseMthreadsCodingPlans;
