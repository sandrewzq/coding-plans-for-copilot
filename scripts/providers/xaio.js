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

async function parseXAioCodingPlans() {
  const pageUrl = "https://code.x-aio.com/";
  const html = await fetchText(pageUrl);
  const appPath = html.match(/\/assets\/index-[^"'\s]+\.js/i)?.[0];
  if (!appPath) {
    throw new Error("Unable to locate X-AIO app script");
  }
  const appUrl = absoluteUrl(appPath, pageUrl);
  const appJs = await fetchText(appUrl);

  const planRegex =
    /\{id:"([^"]+)",name:"([^"]+)",nameCN:"([^"]+)"[\s\S]*?price:\{monthly:([0-9]+(?:\.[0-9]+)?)[\s\S]*?firstOrder:\{monthly:([0-9]+(?:\.[0-9]+)?)[\s\S]*?description:"([^"]*)"[\s\S]*?features:\[([^\]]*)\]/g;
  const plans = [];
  const seenIds = new Set();
  let match;
  while ((match = planRegex.exec(appJs)) !== null) {
    const planId = match[1];
    if (seenIds.has(planId)) {
      continue;
    }
    seenIds.add(planId);
    const name = normalizeText(match[2]);
    const nameCn = normalizeText(match[3]);
    const monthlyPrice = Number(match[4]);
    const firstOrderPrice = Number(match[5]);
    const description = normalizeText(match[6]);
    const featureBlock = String(match[7] || "");
    const features = unique(
      [...featureBlock.matchAll(/"([^"]+)"/g)]
        .map((item) => normalizeText(item[1]))
        .filter(Boolean),
    );
    if (!Number.isFinite(monthlyPrice)) {
      continue;
    }
    plans.push(
      asPlan({
        name: nameCn ? `${name}（${nameCn}）` : name,
        currentPriceText: `¥${formatAmount(monthlyPrice)}/月`,
        currentPrice: monthlyPrice,
        unit: "月",
        notes: [
          Number.isFinite(firstOrderPrice) && firstOrderPrice < monthlyPrice
            ? `首购优惠：¥${formatAmount(firstOrderPrice)}/月`
            : null,
        ]
          .filter(Boolean)
          .join("；"),
        serviceDetails: [description ? `适用场景: ${description}` : null, ...features],
      }),
    );
  }

  if (plans.length === 0) {
    throw new Error("Unable to parse X-AIO coding plan standard monthly prices");
  }

  return {
    provider: PROVIDER_IDS.XAIO,
    sourceUrls: [pageUrl, appUrl],
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
}

module.exports = parseXAioCodingPlans;
