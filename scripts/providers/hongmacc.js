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
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "限购一次，新用户体验",
        serviceDetails: [
          "共可用 $30 额度",
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "轻享月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "包月套餐，每日额度重置",
        serviceDetails: [
          "每日 $25 额度，无并发限制",
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "标准月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "包月套餐，每日额度重置",
        serviceDetails: [
          "每日 $40 额度，无并发限制",
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "旗舰月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "包月套餐，每日额度重置",
        serviceDetails: [
          "每日 $100 额度，无并发限制",
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      // 按量计费套餐
      asPlan({
        name: "轻量包",
        currentPriceText: "按量计费",
        currentPrice: null,
        unit: "月",
        notes: "按量计费，无使用压力，额度永久有效",
        serviceDetails: [
          "共可用 $100 额度，无并发限制",
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "标准包",
        currentPriceText: "按量计费",
        currentPrice: null,
        unit: "月",
        notes: "按量计费，无使用压力，额度永久有效",
        serviceDetails: [
          "共可用 $500 额度，无并发限制",
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
      asPlan({
        name: "海量包",
        currentPriceText: "按量计费",
        currentPrice: null,
        unit: "月",
        notes: "按量计费，无使用压力，额度永久有效",
        serviceDetails: [
          "共可用 $1000 额度，无并发限制",
          "可用 Sonnet、Opus 最新模型",
          "完美兼容 CC/Codex/Gemini",
          "国内直连，毫秒级极速响应",
        ],
      }),
    ],
  };
}

module.exports = parseHongmaccCodingPlans;
