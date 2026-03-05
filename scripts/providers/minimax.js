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
} = require("../utils");

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
        name: "Coding Plan Lite",
        currentPriceText: "¥49/月",
        currentPrice: 49,
        unit: "月",
        notes: null,
        serviceDetails: [
          "用量: 每月 500 次请求",
          "支持模型: MiniMax 全系列模型",
          "适用场景: 个人开发者轻量级使用",
        ],
      }),
      asPlan({
        name: "Coding Plan Pro",
        currentPriceText: "¥199/月",
        currentPrice: 199,
        unit: "月",
        notes: null,
        serviceDetails: [
          "用量: 每月 2000 次请求",
          "支持模型: MiniMax 全系列模型",
          "适用场景: 专业开发者高频使用",
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
        if (!\/\s*月/i.test(currentText) || /首月/i.test(currentText)) {
          continue;
        }
        const originalText = parseMinimaxOriginalPrice(rawPriceCell, currentText);
        plans.push(
          asPlan({
            name: rawName,
            currentPriceText: currentText,
            originalPriceText: originalText,
            notes: usageRow && usageRow[column] ? `用量: ${normalizeText(usageRow[column])}` : null,
            serviceDetails: buildServiceDetailsFromRows(serviceRows, column),
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
  if (!\/\s*[年月]/.test(original)) {
    const unitMatch = currentText.match(/\/\s*([年月])/);
    if (unitMatch) {
      original = `${original} /${unitMatch[1]}`;
    }
  }
  return original;
}

module.exports = parseMinimaxCodingPlans;
