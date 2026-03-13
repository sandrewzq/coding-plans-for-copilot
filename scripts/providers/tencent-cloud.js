"use strict";

/**
 * @fileoverview 腾讯云 编码套餐定价解析器
 * 页面地址: https://cloud.tencent.com/act/pro/codingplan
 * 文档地址: https://cloud.tencent.com/document/product/1772/128947
 */

const {
  PROVIDER_IDS,
  fetchText,
  normalizeText,
  formatAmount,
  normalizeServiceDetails,
  asPlan,
  absoluteUrl,
  unique,
  dedupePlans,
} = require("../utils");

/**
 * 从 HTML 中提取活动时间
 * @param {string} html - 页面 HTML
 * @returns {string|null} - 活动结束时间 ISO 格式
 */
function extractOfferEndDate(html) {
  // 匹配格式: 2026-03-06 00:00:00至2026-04-19 23:59:59
  // 注意：时间可能被 HTML 标签分割
  const match = html.match(/(\d{4}-\d{2}-\d{2})\s*\d{2}:\d{2}:\d{2}[^\d]*至[^\d]*(\d{4}-\d{2}-\d{2})\s*(\d{2})[^\d]*[:：][^\d]*(\d{2})[^\d]*[:：][^\d]*(\d{2})/);
  if (match) {
    const endDate = new Date(`${match[2]}T${match[3]}:${match[4]}:${match[5]}+08:00`);
    return endDate.toISOString();
  }
  return null;
}

/**
 * 从文档页面提取用量限制信息
 * @param {string} html - 文档页面 HTML
 * @returns {Object} - 用量限制信息 { lite: string[], pro: string[] }
 */
function extractUsageLimits(html) {
  const usageLimits = {
    lite: [],
    pro: []
  };

  // 尝试匹配用量限制表格
  // Lite 套餐用量
  const lite5hMatch = html.match(/Lite[^\d]*每\s*5\s*小时[^\d]*(\d[\d,]*)\s*次/);
  const liteWeeklyMatch = html.match(/Lite[^\d]*每周[^\d]*(\d[\d,]*)\s*次/);
  const liteMonthlyMatch = html.match(/Lite[^\d]*每订阅月[^\d]*(\d[\d,]*)\s*次/);

  if (lite5hMatch) {
    usageLimits.lite.push(`每 5 小时：最多约 ${lite5hMatch[1]} 次请求`);
  }
  if (liteWeeklyMatch) {
    usageLimits.lite.push(`每周：最多约 ${liteWeeklyMatch[1]} 次请求`);
  }
  if (liteMonthlyMatch) {
    usageLimits.lite.push(`每订阅月：最多约 ${liteMonthlyMatch[1]} 次请求`);
  }

  // Pro 套餐用量
  const pro5hMatch = html.match(/Pro[^\d]*每\s*5\s*小时[^\d]*(\d[\d,]*)\s*次/);
  const proWeeklyMatch = html.match(/Pro[^\d]*每周[^\d]*(\d[\d,]*)\s*次/);
  const proMonthlyMatch = html.match(/Pro[^\d]*每订阅月[^\d]*(\d[\d,]*)\s*次/);

  if (pro5hMatch) {
    usageLimits.pro.push(`每 5 小时：最多约 ${pro5hMatch[1]} 次请求`);
  }
  if (proWeeklyMatch) {
    usageLimits.pro.push(`每周：最多约 ${proWeeklyMatch[1]} 次请求`);
  }
  if (proMonthlyMatch) {
    usageLimits.pro.push(`每订阅月：最多约 ${proMonthlyMatch[1]} 次请求`);
  }

  // 如果上面的匹配失败，尝试从表格中提取
  if (usageLimits.lite.length === 0 && usageLimits.pro.length === 0) {
    // 查找用量限制部分
    const usageSection = html.match(/用量限制[\s\S]{0,2000}/);
    if (usageSection) {
      // 提取所有数字
      const numbers = usageSection[0].match(/(\d{1,3}(?:,\d{3})*)/g);
      if (numbers && numbers.length >= 6) {
        // Lite: 1,200, 9,000, 18,000; Pro: 6,000, 45,000, 90,000
        usageLimits.lite = [
          `每 5 小时：最多约 ${numbers[0]} 次请求`,
          `每周：最多约 ${numbers[1]} 次请求`,
          `每订阅月：最多约 ${numbers[2]} 次请求`
        ];
        usageLimits.pro = [
          `每 5 小时：最多约 ${numbers[3]} 次请求`,
          `每周：最多约 ${numbers[4]} 次请求`,
          `每订阅月：最多约 ${numbers[5]} 次请求`
        ];
      }
    }
  }

  return usageLimits;
}

/**
 * 从 HTML 中提取套餐信息
 * @param {string} html - 页面 HTML
 * @param {Object} usageLimits - 用量限制信息
 * @returns {Array} - 套餐列表
 */
function extractPlansFromHtml(html, usageLimits) {
  const plans = [];

  // 尝试提取优惠价格（如果存在）
  const liteFirstMonthMatch = html.match(/Lite[^\d]*首月\s*(\d+(?:\.\d+)?)\s*元/);
  const liteRenewalMatch = html.match(/自动续费次月[^\d]*(\d+(?:\.\d+)?)\s*元/);
  const liteRegularMatch = html.match(/第三月起[^\d]*(\d+(?:\.\d+)?)\s*元[/\s]*月/);

  // 提取标准价格（原价）
  const litePriceMatch = html.match(/Lite[^\d]*入门首选[\s\S]{0,500}?(\d{2,3})\s*元[/\s]*月/);
  const liteRegularPrice = liteRegularMatch ? parseFloat(liteRegularMatch[1]) : (litePriceMatch ? parseFloat(litePriceMatch[1]) : 40);

  // 如果优惠活动已结束或无法解析优惠价格，直接显示原价
  const hasActivePromotion = liteFirstMonthMatch && liteRenewalMatch;

  if (hasActivePromotion) {
    const firstMonthPrice = parseFloat(liteFirstMonthMatch[1]);
    const monthlyPrice = parseFloat(liteRenewalMatch[1]);

    plans.push({
      name: "Lite 套餐",
      currentPriceText: `¥${monthlyPrice}/月`,
      currentPrice: monthlyPrice,
      originalPrice: liteRegularPrice > monthlyPrice ? liteRegularPrice : null,
      unit: "月",
      notes: `首月 ${firstMonthPrice} 元，次月 ${monthlyPrice} 元，第三月起 ${liteRegularPrice} 元/月`,
      serviceDetails: [
        "满足日常 AI 编程与中等强度开发",
        "支持 Tencent Hunyuan、GLM、Kimi、MiniMax 等主流模型",
        "兼容 Codebuddy、OpenClaw 等主流编程工具",
        ...(usageLimits.lite.length > 0 ? usageLimits.lite : [
          "每 5 小时：最多约 1,200 次请求",
          "每周：最多约 9,000 次请求",
          "每订阅月：最多约 18,000 次请求"
        ])
      ],
      offerEndDate: null,
    });
  } else {
    // 优惠活动已结束，显示原价
    plans.push({
      name: "Lite 套餐",
      currentPriceText: `¥${liteRegularPrice}/月`,
      currentPrice: liteRegularPrice,
      originalPrice: null,
      unit: "月",
      notes: null,
      serviceDetails: [
        "满足日常 AI 编程与中等强度开发",
        "支持 Tencent Hunyuan、GLM、Kimi、MiniMax 等主流模型",
        "兼容 Codebuddy、OpenClaw 等主流编程工具",
        ...(usageLimits.lite.length > 0 ? usageLimits.lite : [
          "每 5 小时：最多约 1,200 次请求",
          "每周：最多约 9,000 次请求",
          "每订阅月：最多约 18,000 次请求"
        ])
      ],
      offerEndDate: null,
    });
  }

  // Pro 套餐
  const proFirstMonthMatch = html.match(/Pro[^\d]*首月\s*(\d+(?:\.\d+)?)\s*元/);
  const proRenewalMatches = html.match(/自动续费次月[^\d]*(\d+(?:\.\d+)?)\s*元/g);
  const proRegularMatch = html.match(/第三月起[^\d]*(\d+(?:\.\d+)?)\s*元[/\s]*月/);

  const proPriceMatch = html.match(/Pro[^\d]*最受欢迎[\s\S]{0,500}?(\d{2,3})\s*元[/\s]*月/);
  const proRegularPrice = proRegularMatch ? parseFloat(proRegularMatch[1]) : (proPriceMatch ? parseFloat(proPriceMatch[1]) : 200);

  const hasProPromotion = proFirstMonthMatch && proRenewalMatches && proRenewalMatches.length >= 2;

  if (hasProPromotion) {
    const firstMonthPrice = parseFloat(proFirstMonthMatch[1]);
    const proRenewalMatch = proRenewalMatches[1].match(/(\d+(?:\.\d+)?)/);
    const monthlyPrice = proRenewalMatch ? parseFloat(proRenewalMatch[1]) : 100;

    plans.push({
      name: "Pro 套餐",
      currentPriceText: `¥${monthlyPrice}/月`,
      currentPrice: monthlyPrice,
      originalPrice: proRegularPrice > monthlyPrice ? proRegularPrice : null,
      unit: "月",
      notes: `首月 ${firstMonthPrice} 元，次月 ${monthlyPrice} 元，第三月起 ${proRegularPrice} 元/月`,
      serviceDetails: [
        "面向复杂项目与高频开发场景",
        "5倍于 Lite 套餐用量",
        "享受 Lite 套餐的全部能力",
        "支持 Tencent Hunyuan、GLM、Kimi、MiniMax 等主流模型",
        "兼容 Codebuddy、OpenClaw 等主流编程工具",
        ...(usageLimits.pro.length > 0 ? usageLimits.pro : [
          "每 5 小时：最多约 6,000 次请求",
          "每周：最多约 45,000 次请求",
          "每订阅月：最多约 90,000 次请求"
        ])
      ],
      offerEndDate: null,
    });
  } else {
    // 优惠活动已结束，显示原价
    plans.push({
      name: "Pro 套餐",
      currentPriceText: `¥${proRegularPrice}/月`,
      currentPrice: proRegularPrice,
      originalPrice: null,
      unit: "月",
      notes: null,
      serviceDetails: [
        "面向复杂项目与高频开发场景",
        "5倍于 Lite 套餐用量",
        "享受 Lite 套餐的全部能力",
        "支持 Tencent Hunyuan、GLM、Kimi、MiniMax 等主流模型",
        "兼容 Codebuddy、OpenClaw 等主流编程工具",
        ...(usageLimits.pro.length > 0 ? usageLimits.pro : [
          "每 5 小时：最多约 6,000 次请求",
          "每周：最多约 45,000 次请求",
          "每订阅月：最多约 90,000 次请求"
        ])
      ],
      offerEndDate: null,
    });
  }

  return plans;
}

/**
 * 解析 腾讯云 的编码套餐定价
 * @returns {Promise<{provider: string, sourceUrls: Array, fetchedAt: string, plans: Array}>}
 */
async function parseTencentCloudCodingPlans() {
  const pageUrl = "https://cloud.tencent.com/act/pro/codingplan";
  const docsUrl = "https://cloud.tencent.com/document/product/1772/128947";

  // 优惠活动已结束，直接返回原价数据
  // 官网现在显示：Lite ¥40/月，Pro ¥200/月
  return {
    provider: PROVIDER_IDS.TENCENT_CLOUD,
    sourceUrls: [pageUrl, docsUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Lite 套餐",
        currentPriceText: "¥40/月",
        currentPrice: 40,
        originalPrice: null,
        unit: "月",
        notes: null,
        serviceDetails: [
          "满足日常 AI 编程与中等强度开发",
          "支持 Tencent Hunyuan、GLM、Kimi、MiniMax 等主流模型",
          "兼容 Codebuddy、OpenClaw 等主流编程工具",
          "每 5 小时：最多约 1,200 次请求",
          "每周：最多约 9,000 次请求",
          "每订阅月：最多约 18,000 次请求"
        ],
        offerEndDate: null,
      }),
      asPlan({
        name: "Pro 套餐",
        currentPriceText: "¥200/月",
        currentPrice: 200,
        originalPrice: null,
        unit: "月",
        notes: null,
        serviceDetails: [
          "面向复杂项目与高频开发场景",
          "5倍于 Lite 套餐用量",
          "享受 Lite 套餐的全部能力",
          "支持 Tencent Hunyuan、GLM、Kimi、MiniMax 等主流模型",
          "兼容 Codebuddy、OpenClaw 等主流编程工具",
          "每 5 小时：最多约 6,000 次请求",
          "每周：最多约 45,000 次请求",
          "每订阅月：最多约 90,000 次请求"
        ],
        offerEndDate: null,
      }),
    ],
  };
}

module.exports = parseTencentCloudCodingPlans;
