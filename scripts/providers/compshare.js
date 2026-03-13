"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  normalizeText,
  asPlan,
  fetchText,
  unique,
} = require("../utils");

async function parseCompshareCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.COMPSHARE, readmePath);

  // Fetch and parse the HTML content
  const html = await fetchText(pageUrl);

  // Extract plans from the HTML using regex patterns based on the structure
  const plans = [];

  // Check if we can find the pricing cards in HTML
  const liteMatch = html.match(/49\.9\s*包月畅享包\s*Lite/i);
  const plusMatch = html.match(/199\s*包月畅享包\s*Plus/i);
  const proMatch = html.match(/499\s*包月畅享包\s*Pro/i);

  // Define service details for both monthly and paygo plans
  const serviceDetailsMonthly = [
    "每日 0 点刷新积分额度",
    "支持全球主流SOTA语言模型！持续补充ing",
    "支持Claude Code，OpenClaw等主流AI编程助手/Agent",
    "允许API调用，不限制使用场景",
  ];

  const serviceDetailsPaygo = [
    "支持全球主流SOTA语言模型！持续补充ing",
    "支持Claude Code，OpenClaw等主流AI编程助手/Agent",
    "允许API调用，不限制使用场景",
  ];

  // Add paygo plans (always included)
  plans.push(
    asPlan({
      name: "超值体验包",
      currentPriceText: "¥6.9/月",
      currentPrice: 6.9,
      unit: "月",
      serviceDetails: serviceDetailsPaygo,
      notes: "按量付费，2900w 积分，相当于原价API的平均0.5折起",
    }),
    asPlan({
      name: "标准按量包 Lite",
      currentPriceText: "¥19.9/月",
      currentPrice: 19.9,
      unit: "月",
      serviceDetails: serviceDetailsPaygo,
      notes: "按量付费，5900w 积分，相当于原价API的平均1折起",
    }),
    asPlan({
      name: "标准按量包 Plus",
      currentPriceText: "¥199/月",
      currentPrice: 199,
      unit: "月",
      serviceDetails: serviceDetailsPaygo,
      notes: "按量付费，5亿9000w 积分，相当于原价API的平均1折起",
    }),
  );

  // Add monthly plans from HTML if found, otherwise use fallback
  if (liteMatch || plusMatch || proMatch) {
    if (liteMatch) {
      plans.push(
        asPlan({
          name: "49.9 包月畅享包 Lite",
          currentPriceText: "¥49.9/月",
          currentPrice: 49.9,
          unit: "月",
          serviceDetails: serviceDetailsMonthly,
          notes: "每日 0 点刷新 700w 积分额度",
        }),
      );
    }

    if (plusMatch) {
      plans.push(
        asPlan({
          name: "199 包月畅享包 Plus",
          currentPriceText: "¥199/月",
          currentPrice: 199,
          unit: "月",
          serviceDetails: serviceDetailsMonthly,
          notes: "每日 0 点刷新 700w 积分额度",
        }),
      );
    }

    if (proMatch) {
      plans.push(
        asPlan({
          name: "499 包月畅享包 Pro",
          currentPriceText: "¥499/月",
          currentPrice: 499,
          unit: "月",
          serviceDetails: serviceDetailsMonthly,
          notes: "每日 0 点刷新 7000w 积分额度",
        }),
      );
    }
  } else {
    // Fallback: if no plans found from HTML, use hardcoded monthly plans
    plans.push(
      asPlan({
        name: "49.9 包月畅享包 Lite",
        currentPriceText: "¥49.9/月",
        currentPrice: 49.9,
        unit: "月",
        serviceDetails: serviceDetailsMonthly,
        notes: "每日 0 点刷新 700w 积分额度",
      }),
      asPlan({
        name: "199 包月畅享包 Plus",
        currentPriceText: "¥199/月",
        currentPrice: 199,
        unit: "月",
        serviceDetails: serviceDetailsMonthly,
        notes: "每日 0 点刷新 700w 积分额度",
      }),
      asPlan({
        name: "499 包月畅享包 Pro",
        currentPriceText: "¥499/月",
        currentPrice: 499,
        unit: "月",
        serviceDetails: serviceDetailsMonthly,
        notes: "每日 0 点刷新 7000w 积分额度",
      }),
    );
  }

  return {
    provider: PROVIDER_IDS.COMPSHARE,
    sourceUrls: unique([pageUrl]),
    fetchedAt: new Date().toISOString(),
    plans,
  };
}

module.exports = parseCompshareCodingPlans;
