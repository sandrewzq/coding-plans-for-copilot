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
  // HongMaCC pricing info needs login to view exact prices
  // Based on website: https://hongmacc.com/#pricing
  return {
    provider: PROVIDER_IDS.HONGMACC,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "按量付费",
        currentPriceText: "按量付费",
        currentPrice: null,
        unit: "月",
        notes: "价格亲民无门槛，按量付费",
        serviceDetails: [
          "国内直连，毫秒级极速响应",
          "聚合全球顶尖模型，一键切换",
          "完美兼容 Cursor、VSCode 等主流工具",
          "支持 Claude Code、Codex、Gemini",
        ],
      }),
      asPlan({
        name: "定制套餐",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "联系客服获取定制报价",
        serviceDetails: [
          "企业级安全防护",
          "数据加密传输",
          "99.9% 服务可用性",
          "专业技术支持",
        ],
      }),
    ],
  };
}

module.exports = parseHongmaccCodingPlans;
