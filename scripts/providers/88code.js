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
        name: "PAYGO套餐",
        currentPriceText: "按量付费",
        currentPrice: null,
        unit: "月",
        notes: "一次性获取额度，额度不过期，随用随停",
        serviceDetails: [
          "覆盖主流 Claude / Codex 编码模型调用",
          "共可用 165美元 Claude 或 330美元 Codex",
          "适合少量使用，灵活方便",
        ],
      }),
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
      asPlan({
        name: "MAX 20x 拼车套餐",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "1-5人拼车，适合团队使用",
        serviceDetails: [
          "覆盖主流 Claude / Codex 编码模型调用",
          "MAX 20x 额度共享",
          "扫码联系拼车客服获取报价",
        ],
      }),
      asPlan({
        name: "定制套餐",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "联系客服获取定制报价",
        serviceDetails: [
          "适合有并发率要求、预算管控和集中管理需求的团队",
          "支持高级审计，团队使用",
          "专享高吞吐量通道，保障业务零延迟",
          "专属技术支持与接入咨询",
        ],
      }),
    ],
  };
}

module.exports = parse88codeCodingPlans;
