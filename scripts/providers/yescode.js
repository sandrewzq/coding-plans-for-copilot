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
  // YesCode pricing info needs login to view exact prices
  // Based on website: https://co.yes.vg/pricing
  return {
    provider: PROVIDER_IDS.YESCODE,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      // 按量付费
      asPlan({
        name: "Pay as you go",
        currentPriceText: "按量付费",
        currentPrice: null,
        unit: "月",
        notes: "$50 初始余额，余额永不过期",
        serviceDetails: [
          "按需付费",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      // 包月套餐
      asPlan({
        name: "Lightweight",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "$20 每日余额，$210 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Works Good",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "$50 每日余额，$430 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Most Popular",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "$80 每日余额，$640 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Full Power",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "$100 每日余额，$860 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Lightning the Core",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "$150 每日余额，$1080 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Top Gear",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "$200 每日余额，$1450 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "Cosmos in your hand",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "$300 每日余额，$4285 月消费限额",
        serviceDetails: [
          "自动每日更新",
          "实时使用跟踪",
          "社区支持",
        ],
      }),
      asPlan({
        name: "To the Stars",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "$300 每日余额，$1800 月消费限额",
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
