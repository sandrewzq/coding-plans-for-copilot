"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
} = require("../utils");

async function parseYescodeCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.YESCODE, readmePath);
  // Prices in CNY, last verified 2026-03:
  // Based on website: https://co.yes.vg/pricing
  return {
    provider: PROVIDER_IDS.YESCODE,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      // 按量付费
      asPlan({
        name: "PAYGO",
        currentPriceText: "$9.9",
        currentPrice: 9.9,
        unit: "一次性",
        notes: "$50 初始余额，余额永不过期",
        serviceDetails: [
          "按需付费",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      // 包月套餐
      asPlan({
        name: "Starter",
        currentPriceText: "$19.9/月",
        currentPrice: 19.9,
        unit: "月",
        notes: "$20 每日余额，$210 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Accelerate",
        currentPriceText: "$44.9/月",
        currentPrice: 44.9,
        unit: "月",
        notes: "$50 每日余额，$430 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Advanced",
        currentPriceText: "$66.6/月",
        currentPrice: 66.6,
        unit: "月",
        notes: "$80 每日余额，$640 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Ultra",
        currentPriceText: "$89.9/月",
        currentPrice: 89.9,
        unit: "月",
        notes: "$100 每日余额，$860 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Apex",
        currentPriceText: "$109.9/月",
        currentPrice: 109.9,
        unit: "月",
        notes: "$150 每日余额，$1080 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Zenith",
        currentPriceText: "$149.9/月",
        currentPrice: 149.9,
        unit: "月",
        notes: "$200 每日余额，$1450 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Galaxy",
        currentPriceText: "$179.9/月",
        currentPrice: 179.9,
        unit: "月",
        notes: "$300 每日余额，$1800 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Quantum",
        currentPriceText: "$429.9/月",
        currentPrice: 429.9,
        unit: "月",
        notes: "$300 每日余额，$4285 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
    ],
  };
}

module.exports = parseYescodeCodingPlans;
