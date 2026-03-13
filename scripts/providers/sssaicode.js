"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
} = require("../utils");

async function parseSssaicodeCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.SSSAICODE, readmePath);
  // Prices in CNY, last verified 2026-03:
  // SSSAiCode pricing info needs login to view exact prices
  // Based on website: https://www.sssaicode.com/
  return {
    provider: PROVIDER_IDS.SSSAICODE,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      // 包月套餐
      asPlan({
        name: "试用套餐",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "有效期 30 天，仅限一次",
        serviceDetails: [
          "Claude倍率 0.75x~1.3x",
          "CodeX倍率 0.5x",
          "支持所有模型",
        ],
      }),
      asPlan({
        name: "小月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "每日 0 点重置到 $40，周限额度 $75",
        serviceDetails: [
          "约 4500 条 Sonnet 请求",
          "约 1000M Token",
          "支持所有模型",
          "Claude倍率 0.75x~1.3x",
          "CodeX倍率 0.5x",
        ],
      }),
      asPlan({
        name: "月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "每日 0 点重置到 $75，周限额度 $150",
        serviceDetails: [
          "约 9000 条 Sonnet 请求",
          "约 2000M Token",
          "支持所有模型",
          "Claude倍率 0.75x~1.3x",
          "CodeX倍率 0.5x",
        ],
      }),
      asPlan({
        name: "大月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "每日 0 点重置到 $150，周限额度 $300",
        serviceDetails: [
          "约 18750 条 Sonnet 请求",
          "约 4000M Token",
          "支持所有模型",
          "Claude倍率 0.75x~1.3x",
          "CodeX倍率 0.5x",
        ],
      }),
      asPlan({
        name: "超大月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "每日 0 点重置到 $500，周限额度 $1000",
        serviceDetails: [
          "约 60000 条 Sonnet 请求",
          "约 14000M Token",
          "支持所有模型",
          "Claude倍率 0.75x~1.3x",
          "CodeX倍率 0.5x",
        ],
      }),
      asPlan({
        name: "团队套餐",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "每日 0 点重置到 $950，周限额度 $1875",
        serviceDetails: [
          "50 倍并发",
          "50 个席位",
          "支持所有模型",
          "Claude倍率 0.75x~1.3x",
          "CodeX倍率 0.5x",
        ],
      }),
      // PayGO 按量付费套餐
      asPlan({
        name: "PAYGO 100",
        currentPriceText: "按量付费",
        currentPrice: null,
        unit: "月",
        notes: "美元额度，实时扣费，余额永不过期",
        serviceDetails: [
          "约 1500 条 Sonnet 请求",
          "支持所有模型",
          "透明计费，实时查看",
          "Claude倍率 0.45x~1x",
          "CodeX倍率 0.5x",
        ],
      }),
      asPlan({
        name: "PAYGO 200",
        currentPriceText: "按量付费",
        currentPrice: null,
        unit: "月",
        notes: "美元额度，实时扣费，余额永不过期",
        serviceDetails: [
          "支持所有模型",
          "透明计费，实时查看",
          "优先技术支持",
          "Claude倍率 0.45x~1x",
          "CodeX倍率 0.5x",
        ],
      }),
      asPlan({
        name: "PAYGO 500",
        currentPriceText: "按量付费",
        currentPrice: null,
        unit: "月",
        notes: "美元额度，实时扣费，余额永不过期",
        serviceDetails: [
          "支持所有模型",
          "透明计费，实时查看",
          "专属技术支持",
          "Claude倍率 0.45x~1x",
          "CodeX倍率 0.5x",
        ],
      }),
      asPlan({
        name: "PAYGO 2000",
        currentPriceText: "按量付费",
        currentPrice: null,
        unit: "月",
        notes: "美元额度，实时扣费，余额永不过期",
        serviceDetails: [
          "支持所有模型",
          "透明计费，实时查看",
          "专属技术支持",
          "Claude倍率 0.45x~1x",
          "CodeX倍率 0.5x",
        ],
      }),
    ],
  };
}

module.exports = parseSssaicodeCodingPlans;
