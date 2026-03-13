"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
} = require("../utils");

async function parseToprouterCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.TOPROUTER, readmePath);
  // Prices in CNY, last verified 2026-03:
  // Top Router pricing info needs login to view exact prices
  // Based on website: https://www.toprouter.cn/
  return {
    provider: PROVIDER_IDS.TOPROUTER,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      // 月付方案
      asPlan({
        name: "入门特惠卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "低成本体验，适合初学者",
        serviceDetails: [
          "1 API Key",
          "不限 tokens/月",
          "$100 费用限额/周",
          "$25 费用限额/天",
          "Max 号池",
          "缓存命中高",
          "原生体验",
        ],
      }),
      asPlan({
        name: "进阶版月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "轻量级使用，初级开发人员",
        serviceDetails: [
          "1 API Key",
          "不限 tokens/月",
          "$200 费用限额/周",
          "$50 费用限额/天",
          "Max 号池",
          "缓存命中高",
          "原生体验",
        ],
      }),
      asPlan({
        name: "专业版月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "个人开发者的日常使用",
        serviceDetails: [
          "1 API Key",
          "不限 tokens/月",
          "$360 费用限额/周",
          "$90 费用限额/天",
          "绑定Max账户",
          "缓存命中高",
          "高速家宽出口",
        ],
      }),
      asPlan({
        name: "尊享版月卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "全天候 Vibe Coding",
        serviceDetails: [
          "1 API Key",
          "不限 tokens/月",
          "$480 费用限额/周",
          "$120 费用限额/天",
          "绑定Max账户",
          "缓存命中高",
          "独享家宽出口",
        ],
      }),
      asPlan({
        name: "铂金独享专线",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "资深用户，专业陪伴",
        serviceDetails: [
          "不限月请求",
          "1 API Key",
          "不限 tokens/月",
          "不限费用限额/月",
          "专属Max100账户",
          "专属内不计流量，专属外$10",
          "5小时按官方限额",
        ],
      }),
      asPlan({
        name: "钻石独享专线",
        currentPriceText: null,
        currentPrice: null,
        unit: "月",
        notes: "沉浸式 Coding",
        serviceDetails: [
          "不限月请求",
          "1 API Key",
          "不限 tokens/月",
          "不限费用限额/月",
          "专属Max200账户",
          "专属内不计流量，专属外每日$25",
          "5小时按官方限额",
        ],
      }),
      // 周付方案
      asPlan({
        name: "轻量周卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "周",
        notes: "特别的一周，给自己加点量",
        serviceDetails: [
          "$100 费用限额/周",
          "$25 费用限额/天",
        ],
      }),
      asPlan({
        name: "标准周卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "周",
        notes: "本周新常态，AI加满",
        serviceDetails: [
          "$240 费用限额/周",
          "$60 费用限额/天",
        ],
      }),
      asPlan({
        name: "至尊周卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "周",
        notes: "一周顶半月",
        serviceDetails: [
          "$480 费用限额/周",
          "$120 费用限额/天",
        ],
      }),
      // 日付方案
      asPlan({
        name: "微充流量卡",
        currentPriceText: null,
        currentPrice: null,
        unit: "日",
        notes: "应对不时之需",
        serviceDetails: [
          "$10 费用限额/天",
        ],
      }),
      asPlan({
        name: "专业日享包",
        currentPriceText: null,
        currentPrice: null,
        unit: "日",
        notes: "保证 Vibe 一整天",
        serviceDetails: [
          "$30 费用限额/天",
        ],
      }),
      asPlan({
        name: "极速畅享包",
        currentPriceText: null,
        currentPrice: null,
        unit: "日",
        notes: "满足一天所需",
        serviceDetails: [
          "$70 费用限额/天",
        ],
      }),
    ],
  };
}

module.exports = parseToprouterCodingPlans;
