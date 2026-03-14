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
      // 包月套餐
      asPlan({
        name: "超值体验卡",
        currentPriceText: "¥9.90/年",
        currentPrice: 9.90,
        originalPrice: 30.00,
        unit: "年",
        notes: "限购一次，新用户体验，共可用 $30 额度",
        serviceDetails: [
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "轻享月卡",
        currentPriceText: "¥248.00/月",
        currentPrice: 248.00,
        originalPrice: 488.00,
        unit: "月",
        notes: "包月套餐，每日额度重置，每日 $25 额度",
        serviceDetails: [
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "标准月卡",
        currentPriceText: "¥368.00/月",
        currentPrice: 368.00,
        originalPrice: 688.00,
        unit: "月",
        notes: "包月套餐，每日额度重置，每日 $40 额度",
        serviceDetails: [
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "旗舰月卡",
        currentPriceText: "¥798.00/月",
        currentPrice: 798.00,
        originalPrice: 1488.00,
        unit: "月",
        notes: "包月套餐，每日额度重置，每日 $100 额度",
        serviceDetails: [
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      // 按量计费套餐
      asPlan({
        name: "轻量包",
        currentPriceText: "¥79.80/年",
        currentPrice: 79.80,
        originalPrice: 150.00,
        unit: "年",
        notes: "按量计费，无使用压力，额度永久有效，共可用 $100 额度",
        serviceDetails: [
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "标准包",
        currentPriceText: "¥398.00/年",
        currentPrice: 398.00,
        originalPrice: 758.00,
        unit: "年",
        notes: "按量计费，无使用压力，额度永久有效，共可用 $500 额度",
        serviceDetails: [
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "海量包",
        currentPriceText: "¥788.00/年",
        currentPrice: 788.00,
        originalPrice: 1500.00,
        unit: "年",
        notes: "按量计费，无使用压力，额度永久有效，共可用 $1000 额度",
        serviceDetails: [
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
    ],
  };
}

module.exports = parseHongmaccCodingPlans;
