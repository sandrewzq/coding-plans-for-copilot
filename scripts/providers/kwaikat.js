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

async function parseKwaikatCodingPlans() {
  const pageUrl = "https://www.streamlake.com/marketing/coding-plan";
  const configUrl =
    "https://www.streamlake.com/api/get-kconf-content?key=website_kat_coder_coding_plan&name=platform_web&folder=streamlake";
  const detailUrl = "https://console.streamlake.com/api/common/describe-product-detail";

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
