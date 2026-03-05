"use strict";

const {
  HTML_ENTITIES,
  CNY_CURRENCY_HINT,
  USD_CURRENCY_HINT,
  COMMON_HEADERS,
  REQUEST_CONTEXT,
  REQUEST_TIMEOUT_MS,
  PROVIDER_IDS,
  decodeHtml,
  stripTags,
  normalizeText,
  decodeUnicodeLiteral,
  isPriceLike,
  parsePriceText,
  compactInlineText,
  detectCurrencyFromText,
  normalizeMoneyTextByCurrency,
  normalizePlanCurrencySymbols,
  normalizeProviderCurrencySymbols,
  dedupePlans,
  fetchText,
  fetchJson,
  extractRows,
  formatAmount,
  normalizeServiceDetails,
  buildServiceDetailsFromRows,
  asPlan,
  absoluteUrl,
  unique,
  timeUnitLabel,
  isMonthlyUnit,
  isMonthlyPriceText,
  isStandardMonthlyPlan,
  keepStandardMonthlyPlans,
  stripSimpleMarkdown
} = require("../utils");

async function parseMinimaxCodingPlans() {
  const pageUrl = "https://platform.minimaxi.com/docs/guides/pricing-coding-plan";
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
      if (!/\/\s*月/i.test(currentText) || /首月/i.test(currentText)) {
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

  return {
    provider: PROVIDER_IDS.MINIMAX,
    sourceUrls: unique([pageUrl, buyUrl]),
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
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
