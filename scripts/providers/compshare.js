"use strict";

const path = require("path");
const {
  HTML_ENTITIES,
  CNY_CURRENCY_HINT,
  USD_CURRENCY_HINT,
  COMMON_HEADERS,
  REQUEST_CONTEXT,
  REQUEST_TIMEOUT_MS,
  PROVIDER_IDS,
  getProviderUrl,
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

async function parseCompshareCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.COMPSHARE, readmePath);
  const html = await fetchText(pageUrl);
  const rows = extractRows(html);
  const headerRow = rows.find((row) => normalizeText(row?.[0] || "") === "套餐名称" && row.length >= 5) || null;
  const plans = [];
  for (const row of rows) {
    const rawName = normalizeText(row?.[0] || "");
    const rawPrice = normalizeText(row?.[1] || "");
    if (!rawName || !rawPrice || !isMonthlyPriceText(rawPrice)) {
      continue;
    }
    const amount = parsePriceText(rawPrice).amount;
    const serviceDetails = [];
    for (let column = 2; column < row.length; column += 1) {
      const value = normalizeText(row[column]);
      if (!value) {
        continue;
      }
      const label = normalizeText(headerRow?.[column] || "");
      serviceDetails.push(label ? `${label}: ${value}` : value);
    }
    plans.push(
      asPlan({
        name: rawName,
        currentPriceText: rawPrice,
        currentPrice: Number.isFinite(amount) ? amount : null,
        unit: "月",
        serviceDetails,
      }),
    );
  }

  if (plans.length === 0) {
    throw new Error("Unable to parse Compshare standard monthly plans");
  }

  return {
    provider: PROVIDER_IDS.COMPSHARE,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
}

module.exports = parseCompshareCodingPlans;
