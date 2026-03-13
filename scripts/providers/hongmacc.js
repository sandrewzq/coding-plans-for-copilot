"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
} = require("../utils");

async function parseHongmaccCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.HONGMACC, readmePath);
  // Prices in CNY, last verified 2026-03:
  // HongMaCC pricing info needs to be fetched from the website
  // Placeholder implementation - update with actual pricing when available
  return {
    provider: PROVIDER_IDS.HONGMACC,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "标准套餐",
        currentPriceText: "价格待确认",
        currentPrice: null,
        unit: "月",
        notes: "请访问官网查看最新定价",
        serviceDetails: [
          "AI 编码助手服务",
          "详情请访问官网",
        ],
      }),
    ],
  };
}

module.exports = parseHongmaccCodingPlans;
