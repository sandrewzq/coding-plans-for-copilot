"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
} = require("../utils");

async function parseUucodeCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.UUCODE, readmePath);
  // Prices in CNY, last verified 2026-03:
  // UUcode pricing info needs login to view exact prices
  // Based on website: https://www.uucode.org/#pricing
  return {
    provider: PROVIDER_IDS.UUCODE,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      // 订阅计划
      asPlan({
        name: "Starter",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "入门级订阅方案",
        serviceDetails: [
          "访问所有标准模型",
          "标准技术支持",
          "基础用量分析",
          "亚洲专线优化",
        ],
      }),
      asPlan({
        name: "Pro",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "专业级订阅方案",
        serviceDetails: [
          "包含 Starter 所有功能",
          "优先响应支持",
          "专属客服群",
          "更高并发限额",
        ],
      }),
      asPlan({
        name: "Max",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "企业级订阅方案",
        serviceDetails: [
          "包含 Pro 所有功能",
          "极致并发性能",
          "专属客户经理",
          "新模型优先内测权",
        ],
      }),
      // 按量付费
      asPlan({
        name: "按量付费",
        currentPriceText: "按量付费",
        currentPrice: null,
        unit: "月",
        notes: "按需使用，灵活计费",
        serviceDetails: [
          "访问所有标准模型",
          "亚洲专线优化",
          "实时用量追踪",
        ],
      }),
    ],
  };
}

module.exports = parseUucodeCodingPlans;
