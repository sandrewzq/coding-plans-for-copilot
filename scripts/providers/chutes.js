"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
} = require("../utils");

async function parseChutesCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.CHUTES, readmePath);
  // Prices in USD, last verified 2026-03:
  // Base $3/月 (300 requests/day), Plus $10/月 (2000 requests/day),
  // Pro $20/月 (5000 requests/day), Enterprise custom
  return {
    provider: PROVIDER_IDS.CHUTES,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Base",
        currentPriceText: "$3/月",
        currentPrice: 3,
        unit: "月",
        serviceDetails: [
          "Up to 300 requests/day",
          "标准模型访问",
          "基础技术支持",
        ],
      }),
      asPlan({
        name: "Plus",
        currentPriceText: "$10/月",
        currentPrice: 10,
        unit: "月",
        serviceDetails: [
          "Up to 2,000 requests/day",
          "更多模型选择",
          "优先响应速度",
        ],
      }),
      asPlan({
        name: "Pro",
        currentPriceText: "$20/月",
        currentPrice: 20,
        unit: "月",
        notes: "Best Value",
        serviceDetails: [
          "Up to 5,000 requests/day",
          "全部模型访问",
          "最高优先级",
          "高级技术支持",
        ],
      }),
    ],
  };
}

module.exports = parseChutesCodingPlans;
