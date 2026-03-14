"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  fetchText,
  formatAmount,
  normalizeServiceDetails,
  asPlan,
  unique,
  dedupePlans,
} = require("../utils");

// Fallback data based on observed pricing from browser
// This is used when dynamic fetching fails
const FALLBACK_PLANS = [
  {
    name: "GLM Coding Lite",
    currentPriceText: "¥132/季",
    currentPrice: 132,
    originalPriceText: "¥147/季",
    originalPrice: 147,
    unit: "季",
    notes: "连续包季 9 折；下个季度续费金额：¥132.3",
    serviceDetails: [
      "Claude Pro 套餐的 3倍 用量",
      "面向处理轻量级工作负载的个人开发者",
      "新模型/功能持续更新",
      "适用于 Claude Code 等 20+编程工具",
    ],
  },
  {
    name: "GLM Coding Pro",
    currentPriceText: "¥402/季",
    currentPrice: 402,
    originalPriceText: "¥447/季",
    originalPrice: 447,
    unit: "季",
    notes: "连续包季 9 折；下个季度续费金额：¥402.3",
    serviceDetails: [
      "Lite 套餐的 5倍 用量",
      "面向处理复杂工作负载的个人开发者",
      "享受 Lite 套餐所有权益",
      "新模型/功能优先升级",
      "生成速度高于 Lite",
      "视觉理解、联网搜索/读取、开源仓库 MCP",
    ],
  },
  {
    name: "GLM Coding Max",
    currentPriceText: "¥1266/季",
    currentPrice: 1266,
    originalPriceText: "¥1407/季",
    originalPrice: 1407,
    unit: "季",
    notes: "连续包季 9 折；下个季度续费金额：¥1266.3",
    serviceDetails: [
      "Pro 套餐的 4倍 用量",
      "面向处理海量工作负载的个人开发者",
      "享受 Pro 套餐所有权益",
      "新模型/功能首发升级",
      "用量高峰优先保障",
    ],
  },
];

async function parseZhipuCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.ZHIPU, readmePath);

  // Try to fetch dynamic data from page
  try {
    const html = await fetchText(pageUrl);

    // The page uses client-side rendering, so we need to look for the app.js
    // and extract the chunk hash for pricing data
    const appPath = html.match(/\/js\/app\.[0-9a-f]+\.js/i)?.[0];
    if (!appPath) {
      throw new Error("Unable to locate Zhipu app script");
    }

    // Try to find the pricing chunk - look for common patterns
    // The chunk name may have changed, so we look for any chunk that might contain pricing
    const chunkMatches = [...html.matchAll(/"(chunk-[0-9a-f]+)"\s*:\s*"([0-9a-f]+)"/gi)];

    for (const match of chunkMatches.slice(0, 20)) {
      const chunkName = match[1];
      const chunkHash = match[2];

      // Skip if it's not a pricing-related chunk (based on naming patterns)
      // Pricing chunks often have specific patterns
      try {
        const { absoluteUrl } = require("../utils");
        const chunkUrl = absoluteUrl(`/js/${chunkName}.${chunkHash}.js`, pageUrl);
        const chunkText = await fetchText(chunkUrl);

        // Check if this chunk contains pricing data
        if (chunkText.includes('GLM Coding') && chunkText.includes('salePrice')) {
          // Found the pricing chunk, try to extract data
          const plans = extractPlansFromChunk(chunkText);
          if (plans.length > 0) {
            return {
              provider: PROVIDER_IDS.ZHIPU,
              sourceUrls: unique([pageUrl, chunkUrl]),
              fetchedAt: new Date().toISOString(),
              plans: dedupePlans(plans),
            };
          }
        }
      } catch {
        // Continue to next chunk
      }
    }

    // If dynamic extraction fails, use fallback data
    console.log("Warning: Could not extract dynamic pricing data, using fallback");
  } catch (error) {
    console.log("Warning: Error fetching dynamic data:", error.message);
  }

  // Return fallback data
  return {
    provider: PROVIDER_IDS.ZHIPU,
    sourceUrls: unique([pageUrl]),
    fetchedAt: new Date().toISOString(),
    plans: FALLBACK_PLANS.map(plan => asPlan(plan)),
  };
}

function extractPlansFromChunk(chunkText) {
  const plans = [];

  // Look for product data patterns in the chunk
  // Pattern: productName:"GLM Coding Lite",salePrice:132,originalPrice:147,unit:"quarter",unitText:"季"
  const productPattern = /productName\s*:\s*"(GLM Coding (?:Lite|Pro|Max))"[\s\S]*?salePrice\s*:\s*(\d+)[\s\S]*?originalPrice\s*:\s*(\d+)[\s\S]*?unit\s*:\s*"([^"]+)"[\s\S]*?unitText\s*:\s*"([^"]+)"/gi;

  let match;
  while ((match = productPattern.exec(chunkText)) !== null) {
    const productName = match[1];
    const salePrice = Number(match[2]);
    const originalPrice = Number(match[3]);
    const unit = match[4];
    const unitText = match[5];

    // Extract tag text if available
    const tagMatch = chunkText.slice(match.index, match.index + 500).match(/tagText\s*:\s*"([^"]+)"/);
    const tagText = tagMatch ? tagMatch[1] : "连续包季 9 折";

    // Extract renew amount if available
    const renewMatch = chunkText.slice(match.index, match.index + 500).match(/renewAmount\s*:\s*([\d.]+)/);
    const renewAmount = renewMatch ? Number(renewMatch[1]) : null;

    const tier = productName.replace("GLM Coding ", "");

    const renewLabel = unit === "quarter" ? "下个季度续费金额" :
                      unit === "month" ? "下个月度续费金额" : "下个年度续费金额";
    const renewText = renewAmount ? `${renewLabel}：¥${formatAmount(renewAmount)}` : null;

    const serviceDetails = getServiceDetailsForTier(tier);

    plans.push(
      asPlan({
        name: productName,
        currentPriceText: `¥${formatAmount(salePrice)}/${unitText}`,
        currentPrice: salePrice,
        originalPriceText: originalPrice > salePrice ? `¥${formatAmount(originalPrice)}/${unitText}` : null,
        originalPrice: originalPrice > salePrice ? originalPrice : null,
        unit: unitText,
        notes: [tagText, renewText].filter(Boolean).join("；"),
        serviceDetails,
      })
    );
  }

  return plans;
}

function getServiceDetailsForTier(tier) {
  const serviceMap = {
    Lite: [
      "Claude Pro 套餐的 3倍 用量",
      "面向处理轻量级工作负载的个人开发者",
      "新模型/功能持续更新",
      "适用于 Claude Code 等 20+编程工具",
    ],
    Pro: [
      "Lite 套餐的 5倍 用量",
      "面向处理复杂工作负载的个人开发者",
      "享受 Lite 套餐所有权益",
      "新模型/功能优先升级",
      "生成速度高于 Lite",
      "视觉理解、联网搜索/读取、开源仓库 MCP",
    ],
    Max: [
      "Pro 套餐的 4倍 用量",
      "面向处理海量工作负载的个人开发者",
      "享受 Pro 套餐所有权益",
      "新模型/功能首发升级",
      "用量高峰优先保障",
    ],
  };

  return normalizeServiceDetails(serviceMap[tier] || []);
}

module.exports = parseZhipuCodingPlans;
