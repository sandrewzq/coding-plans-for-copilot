"use strict";

const {
  PROVIDER_IDS,
  fetchText,
  extractRows,
  normalizeText,
  isPriceLike,
  buildServiceDetailsFromRows,
  asPlan,
  dedupePlans,
  stripTags,
} = require("../utils");

/**
 * Extracts additional service features from HTML content
 * Looks for feature lists, bullet points, and descriptive text
 * @param {string} html - The HTML content
 * @param {string} planName - The plan name to match
 * @returns {string[]} Array of additional service features
 */
function extractAdditionalFeatures(html, planName) {
  const features = [];
  
  // Look for common feature patterns in the HTML
  // Pattern 1: Checkmark lists (✓ or ✔)
  const checkmarkPattern = /[✓✔]\s*([^<\n]+)/g;
  let match;
  while ((match = checkmarkPattern.exec(html)) !== null) {
    const feature = normalizeText(match[1]);
    if (feature && feature.length > 3 && !features.includes(feature)) {
      features.push(feature);
    }
  }
  
  // Pattern 2: List items with specific keywords
  const featureKeywords = [
    "支持主流的编程工具",
    "支持图像理解",
    "联网搜索",
    "MCP",
    "IDE",
    "代码补全",
    "代码生成",
    "多模型",
    "极速推理",
    "生成速度",
  ];
  
  for (const keyword of featureKeywords) {
    if (html.includes(keyword)) {
      // Extract the surrounding context
      const regex = new RegExp(`[^<\n]{0,20}${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<\n]{0,30}`, 'g');
      let contextMatch;
      while ((contextMatch = regex.exec(html)) !== null) {
        const context = normalizeText(contextMatch[0]);
        if (context && !features.includes(context)) {
          features.push(context);
        }
      }
    }
  }
  
  return features;
}

/**
 * Parses service details from HTML sections
 * MiniMax uses a specific format with sections for each plan
 * @param {string} html - The HTML content
 * @param {string} planName - The plan name
 * @returns {string[]} Array of service details
 */
function parseServiceDetailsFromHtml(html, planName) {
  const details = [];
  
  // Try to find plan-specific section
  const planPatterns = [
    new RegExp(`<[^>]*>\\s*${planName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</[^>]*>`, 'i'),
    new RegExp(`"[^"]*${planName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"`, 'i'),
  ];
  
  // Extract features from the entire HTML for now
  // Look for feature descriptions near model mentions
  const modelSectionPattern = /支持模型[:：]\s*([^<\n]+)/i;
  const modelMatch = html.match(modelSectionPattern);
  if (modelMatch) {
    const models = normalizeText(modelMatch[1]);
    if (models) {
      details.push(`支持模型: ${models}`);
    }
  }
  
  // Look for usage/quota information
  const usagePatterns = [
    /(\d+\s*prompts?\s*\/\s*每?\s*\d*\s*小时)/i,
    /(\d+\s*次\s*\/\s*每?\s*\d*\s*小时)/i,
    /用量[:：]\s*([^<\n]+)/i,
  ];
  
  for (const pattern of usagePatterns) {
    const usageMatch = html.match(pattern);
    if (usageMatch) {
      const usage = normalizeText(usageMatch[1]);
      if (usage && !details.some(d => d.includes("用量"))) {
        details.push(`用量: ${usage}`);
        break;
      }
    }
  }
  
  // Look for scenario/use case
  const scenarioPatterns = [
    /适用场景[:：]\s*([^<\n]+)/i,
    /适合([^<\n]{3,30})场景/i,
  ];
  
  for (const pattern of scenarioPatterns) {
    const scenarioMatch = html.match(pattern);
    if (scenarioMatch) {
      const scenario = normalizeText(scenarioMatch[1]);
      if (scenario) {
        details.push(`适用场景: ${scenario}`);
        break;
      }
    }
  }
  
  // Extract additional features
  const additionalFeatures = extractAdditionalFeatures(html, planName);
  for (const feature of additionalFeatures) {
    if (!details.some(d => d.includes(feature.substring(0, 10)))) {
      details.push(feature);
    }
  }
  
  return details;
}

/**
 * Fallback data for MiniMax when parsing fails
 * @returns {Object} Fallback provider data
 */
function getFallbackData() {
  return {
    provider: PROVIDER_IDS.MINIMAX,
    sourceUrls: [
      "https://platform.minimaxi.com/docs/guides/pricing-coding-plan",
      "https://platform.minimaxi.com/subscribe/coding-plan",
    ],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Plus-极速版",
        currentPriceText: "¥98/月",
        currentPrice: 98,
        unit: "月",
        notes: "用量: 100 prompts/每 5 小时",
        serviceDetails: [
          "支持模型: MiniMax M2.5-highspeed MiniMax M2.5 MiniMax M2.1 MiniMax M2",
          "套餐资源: 2.5 倍 Starter 套餐用量",
          "适用场景: 适合专业开发场景 满足复杂开发任务需求",
          "支持主流的编程工具，并持续扩展中",
          "支持图像理解、联网搜索 MCP",
        ],
      }),
      asPlan({
        name: "Max-极速版 超值之选",
        currentPriceText: "¥199/月",
        currentPrice: 199,
        unit: "月",
        notes: "用量: 300 prompts/每 5 小时",
        serviceDetails: [
          "支持模型: MiniMax M2.5-highspeed MiniMax M2.5 MiniMax M2.1 MiniMax M2",
          "套餐资源: 7.5 倍 Starter 套餐用量",
          "适用场景: 适合高级开发场景 满足大量编程辅助需求",
          "支持主流的编程工具，并持续扩展中",
          "支持图像理解、联网搜索 MCP",
        ],
      }),
      asPlan({
        name: "Ultra-极速版 极速畅用",
        currentPriceText: "¥899/月",
        currentPrice: 899,
        unit: "月",
        notes: "用量: 2000 prompts/每 5 小时",
        serviceDetails: [
          "支持模型: MiniMax M2.5-highspeed MiniMax M2.5 MiniMax M2.1 MiniMax M2",
          "套餐资源: 50 倍 Starter 套餐用量",
          "适用场景: 适合硬核开发者 超大量编程辅助需求",
          "支持主流的编程工具，并持续扩展中",
          "支持图像理解、联网搜索 MCP",
        ],
      }),
      asPlan({
        name: "Starter",
        currentPriceText: "¥29/月",
        currentPrice: 29,
        unit: "月",
        notes: "用量: 40 prompts/每 5 小时",
        serviceDetails: [
          "支持模型: MiniMax M2.5 MiniMax M2.1 MiniMax M2",
          "套餐资源: 基础用量",
          "适用场景: 适合入门级开发场景 满足基础开发需求",
          "支持主流的编程工具，并持续扩展中",
        ],
      }),
      asPlan({
        name: "Plus 高性价比",
        currentPriceText: "¥49/月",
        currentPrice: 49,
        unit: "月",
        notes: "用量: 100 prompts/每 5 小时",
        serviceDetails: [
          "支持模型: MiniMax M2.5 MiniMax M2.1 MiniMax M2",
          "套餐资源: 2.5 倍 Starter 套餐用量",
          "适用场景: 适合专业开发场景 满足复杂开发任务需求",
          "支持主流的编程工具，并持续扩展中",
        ],
      }),
      asPlan({
        name: "Max 超大份量",
        currentPriceText: "¥119/月",
        currentPrice: 119,
        unit: "月",
        notes: "用量: 300 prompts/每 5 小时",
        serviceDetails: [
          "支持模型: MiniMax M2.5 MiniMax M2.1 MiniMax M2",
          "套餐资源: 7.5 倍 Starter 套餐用量",
          "适用场景: 适合专业开发场景 满足复杂开发任务需求",
          "支持主流的编程工具，并持续扩展中",
        ],
      }),
    ],
  };
}

async function parseMinimaxCodingPlans() {
  const pageUrl = "https://platform.minimaxi.com/docs/guides/pricing-coding-plan";
  try {
    const html = await fetchText(pageUrl);
    const buyUrl = html.match(/https:\/\/platform\.minimaxi\.com\/subscribe\/coding-plan/)?.[0] || null;
    const rows = extractRows(html);
    const plans = [];
    
    // Also extract additional features from the full HTML
    const additionalFeatures = extractAdditionalFeatures(html, "");
    
    for (let index = 0; index < rows.length; index += 1) {
      const headerRow = rows[index];
      const priceRow = rows[index + 1];
      if (!headerRow || !priceRow) {
        continue;
      }
      if (headerRow[0] !== "套餐类型" || priceRow[0] !== "价格") {
        continue;
      }
      const nextHeaderOffset = rows
        .slice(index + 1)
        .findIndex((row) => normalizeText(row?.[0] || "") === "套餐类型");
      const blockEnd = nextHeaderOffset >= 0 ? index + 1 + nextHeaderOffset : rows.length;
      const serviceRows = rows.slice(index + 2, blockEnd);
      const usageRow = serviceRows.find((row) => normalizeText(row?.[0] || "") === "用量") || null;

      for (let column = 1; column < headerRow.length; column += 1) {
        const rawName = normalizeText(headerRow[column] || "");
        const rawPriceCell = normalizeText(priceRow[column] || "");
        if (!rawName || !rawPriceCell || !isPriceLike(rawPriceCell)) {
          continue;
        }
        const currentText = normalizeText(rawPriceCell.replace(/\(\s*原价[^)）]+\)/g, ""));
        if (!/\/\s*月/i.test(currentText) || /首月/i.test(currentText)) {
          continue;
        }
        const originalText = parseMinimaxOriginalPrice(rawPriceCell, currentText);
        
        // Build base service details from table rows
        let serviceDetails = buildServiceDetailsFromRows(serviceRows, column, {
          excludeLabels: ["用量"],
        }) || [];
        
        // Parse additional details from HTML for this specific plan
        const htmlDetails = parseServiceDetailsFromHtml(html, rawName);
        
        // Merge details, avoiding duplicates
        for (const detail of htmlDetails) {
          const detailKey = detail.substring(0, 15).toLowerCase();
          if (!serviceDetails.some(d => d.toLowerCase().startsWith(detailKey))) {
            serviceDetails.push(detail);
          }
        }
        
        // Add common features that apply to all plans
        const commonFeatures = [
          "支持主流的编程工具，并持续扩展中",
          "支持图像理解、联网搜索 MCP",
        ];
        
        // Only add features that aren't already included
        for (const feature of commonFeatures) {
          if (!serviceDetails.some(d => d.includes(feature.substring(0, 10)))) {
            // Check if this feature is mentioned in the HTML for this plan
            if (html.includes(feature) || additionalFeatures.some(f => f.includes(feature.substring(0, 10)))) {
              serviceDetails.push(feature);
            }
          }
        }
        
        plans.push(
          asPlan({
            name: rawName,
            currentPriceText: currentText,
            originalPriceText: originalText,
            notes: usageRow && usageRow[column] ? `用量: ${normalizeText(usageRow[column])}` : null,
            serviceDetails: serviceDetails.length > 0 ? serviceDetails : null,
          }),
        );
      }
      index = blockEnd - 1;
    }

    if (plans.length === 0) {
      throw new Error("Unable to parse MiniMax coding plans");
    }

    return {
      provider: PROVIDER_IDS.MINIMAX,
      sourceUrls: [pageUrl, buyUrl].filter(Boolean),
      fetchedAt: new Date().toISOString(),
      plans: dedupePlans(plans),
    };
  } catch (error) {
    console.warn(`[pricing] MiniMax fetch failed: ${error.message}. Returning fallback.`);
    return getFallbackData();
  }
}

function parseMinimaxOriginalPrice(priceText, currentText) {
  const originalMatch = priceText.match(/原价\s*([¥￥]?\s*[0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[年月])?)/i);
  if (!originalMatch) {
    return null;
  }
  let original = normalizeText(originalMatch[1]);
  if (!/\/\s*[年月]/.test(original)) {
    const unitMatch = currentText.match(/\/\s*([年月])/);
    if (unitMatch) {
      original = `${original} /${unitMatch[1]}`;
    }
  }
  return original;
}

module.exports = parseMinimaxCodingPlans;
