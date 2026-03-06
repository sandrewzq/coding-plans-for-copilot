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

/**
 * Parses offer end date from page HTML
 * Looks for patterns like "限时特惠期：2026年1月5日 - 2026年3月22日"
 * @param {string} html - Page HTML content
 * @returns {string|null} ISO formatted end date or null
 */
function parseOfferEndDate(html) {
  // Look for date range pattern: 2026年1月5日 - 2026年3月22日
  const dateRangeMatch = html.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*-\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (dateRangeMatch) {
    const [, startYear, startMonth, startDay, endYear, endMonth, endDay] = dateRangeMatch;
    // Return end date in ISO format
    return `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}T23:59:59+08:00`;
  }
  
  // Alternative pattern: 2026/1/5 - 2026/3/22
  const slashDateMatch = html.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashDateMatch) {
    const [, startYear, startMonth, startDay, endYear, endMonth, endDay] = slashDateMatch;
    return `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}T23:59:59+08:00`;
  }
  
  return null;
}

async function parseKwaikatCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.KWAIKAT, readmePath);
  const configUrl =
    "https://www.streamlake.com/api/get-kconf-content?key=website_kat_coder_coding_plan&name=platform_web&folder=streamlake";
  const detailUrl = "https://console.streamlake.com/api/common/describe-product-detail";

  // Fetch page HTML to parse offer end date
  const html = await fetchText(pageUrl);
  const offerEndDate = parseOfferEndDate(html);

  const configPayload = await fetchJson(configUrl);
  const monthPackages = Array.isArray(configPayload?.monthPackages)
    ? configPayload.monthPackages
    : Array.isArray(configPayload?.data?.monthPackages)
      ? configPayload.data.monthPackages
      : [];
  if (monthPackages.length === 0) {
    throw new Error("Unable to parse KwaiKAT month package config");
  }

  const skuIdList = unique(monthPackages.map((item) => item?.skuId));
  const detailPayload = await fetchJson(detailUrl, {
    method: "POST",
    headers: {
      ...COMMON_HEADERS,
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      origin: "https://www.streamlake.com",
      referer: pageUrl,
    },
    body: JSON.stringify({
      productType: "standard",
      productCategory: "kat_coder_coding_plan",
      skuIdList,
    }),
  });

  const discountList = Array.isArray(detailPayload?.data?.data?.productDiscountList)
    ? detailPayload.data.data.productDiscountList
    : Array.isArray(detailPayload?.data?.productDiscountList)
      ? detailPayload.data.productDiscountList
      : Array.isArray(detailPayload?.productDiscountList)
        ? detailPayload.productDiscountList
        : [];
  if (discountList.length === 0) {
    throw new Error("Unable to parse KwaiKAT monthly discount list");
  }

  const packageBySkuId = new Map(monthPackages.map((item) => [item?.skuId, item]));
  const orderBySkuId = new Map(monthPackages.map((item, index) => [item?.skuId, index]));

  const plans = discountList
    .map((item) => {
      const packageMeta = packageBySkuId.get(item?.skuId) || {};
      const specUnit = normalizeText(item?.resourcePackBases?.[0]?.resourcePackSpecUnit || "");
      if (!isMonthlyUnit(specUnit)) {
        return null;
      }
      const discountPrice = Number(item?.discountPrice);
      const originalPrice = Number(item?.originalPrice);
      const level = normalizeText(packageMeta?.level || packageMeta?.skuName || "");
      const name = level ? `KAT Coding ${level}` : normalizeText(item?.skuName || "KAT Coding");
      const serviceItems = [packageMeta?.desc, ...(Array.isArray(packageMeta?.descList) ? packageMeta.descList : [])]
        .filter(Boolean)
        .map((value) => normalizeText(value));
      return {
        order: orderBySkuId.get(item?.skuId) ?? 999,
        plan: asPlan({
          name,
          currentPriceText: Number.isFinite(discountPrice) ? `¥${formatAmount(discountPrice)}/月` : null,
          currentPrice: Number.isFinite(discountPrice) ? discountPrice : null,
          originalPriceText:
            Number.isFinite(originalPrice) && Number.isFinite(discountPrice) && originalPrice > discountPrice
              ? `¥${formatAmount(originalPrice)}/月`
              : null,
          originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
          unit: "月",
          notes: serviceItems.join("；"),
          serviceDetails: serviceItems,
          offerEndDate: offerEndDate,
        }),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.order - right.order)
    .map((entry) => entry.plan);

  if (plans.length === 0) {
    throw new Error("Unable to parse KwaiKAT standard monthly plans");
  }

  return {
    provider: PROVIDER_IDS.KWAIKAT,
    sourceUrls: [pageUrl, configUrl, detailUrl],
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
}

module.exports = parseKwaikatCodingPlans;
