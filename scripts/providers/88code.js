"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
} = require("../utils");

async function parse88codeCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.CODE88, readmePath);
  // Prices in CNY, last verified 2026-03:
  // 包月付费套餐 ¥198/月 (每天40美元Claude或80美元Codex额度)
  return {
    provider: PROVIDER_IDS.CODE88,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "包月付费套餐",
        currentPriceText: "¥198/月",
        currentPrice: 198,
        unit: "月",
        notes: "额度不结转，可与PAYGO套餐同时使用",
        serviceDetails: [
          "覆盖主流 Claude / Codex 编码模型调用",
          "每天可用 40美元 Claude 或 80美元 Codex",
        ],
      }),
    ],
  };
}

module.exports = parse88codeCodingPlans;
