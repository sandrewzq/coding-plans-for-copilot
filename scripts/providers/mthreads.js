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
  const docsUrl = "https://docs.mthreads.com/kuaecloud/kuaecloud-doc-online/coding_plan/plan_overview/";
  
  // Prices are hardcoded in the frontend JS bundle; use known verified values as the primary data.
  // Last verified 2026-03 from https://code.mthreads.com/:
  // Lite ¥120/季度, Pro ¥600/季度, Max ¥1200/季度
  // Usage limits from https://docs.mthreads.com/kuaecloud/kuaecloud-doc-online/coding_plan/plan_overview/
  return {
    provider: PROVIDER_IDS.MTHREADS,
    sourceUrls: unique([pageUrl, docsUrl]),
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Free Trial",
        currentPriceText: "¥0",
        currentPrice: 0,
        unit: "月",
        notes: "30天免费试用，每日限量100名",
        serviceDetails: [
          "每 5 小时最多约 40 次 prompts",
          "与 Claude Pro 套餐用量相当",
          "平台用量高峰期请求可能会排队等待",
          "领取成功之日起 30 天内有效",
          "支持 Claude Code、Cursor、Cline、Kilo Code 等主流工具",
          "GLM-4.7 最新开源模型",
        ],
      }),
      asPlan({
        name: "Lite Plan",
        currentPriceText: "¥120/季度",
        currentPrice: 120,
        unit: "季度",
        notes: "约¥40/月",
        serviceDetails: [
          "每 5 小时最多约 120 次 prompts",
          "相当于 Claude Pro 套餐用量的 3 倍",
          "平台用量高峰期请求可能会排队等待",
          "订阅期间，享受最新版本模型更新服务",
          "支持 Claude Code、Cursor、Cline、Kilo Code 等主流工具",
          "GLM-4.7 最新开源模型",
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
          "每 5 小时最多约 600 次 prompts",
          "相当于 Claude Max(5x) 套餐用量的 3 倍",
          "生成速度高于 Lite Plan，提供请求响应速度保障",
          "订阅期间，享受最新版本模型更新服务",
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
          "每 5 小时最多约 2400 次 prompts",
          "相当于 Claude Max(20x) 套餐用量的 3 倍",
          "生成速度高于 Lite Plan，提供请求响应速度保障",
          "优先保障用量高峰",
          "订阅期间，享受最新版本模型更新服务，并可抢先体验新功能",
          "支持主流 AI 编码工具",
        ],
      }),
    ],
  };
}

module.exports = parseMthreadsCodingPlans;
