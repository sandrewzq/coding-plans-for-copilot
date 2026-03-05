"use strict";

const {
  PROVIDER_IDS,
  fetchText,
  extractRows,
  normalizeText,
  formatAmount,
  normalizeServiceDetails,
  asPlan,
  absoluteUrl,
  unique,
  dedupePlans,
} = require("../utils");

async function parseZhipuCodingPlans() {
  const pageUrl = "https://bigmodel.cn/glm-coding";
  const html = await fetchText(pageUrl);
  const appPath = html.match(/\/js\/app\.[0-9a-f]+\.js/i)?.[0];
  if (!appPath) {
    throw new Error("Unable to locate Zhipu app script");
  }
  const appUrl = absoluteUrl(appPath, pageUrl);
  const appJs = await fetchText(appUrl);

  const pricingChunkHash = appJs.match(/"chunk-0d4f69d1"\s*:\s*"([0-9a-f]+)"/i)?.[1];
  if (!pricingChunkHash) {
    throw new Error("Unable to locate Zhipu coding pricing chunk");
  }
  const pricingChunkUrl = absoluteUrl(`/js/chunk-0d4f69d1.${pricingChunkHash}.js`, pageUrl);
  const pricingChunkText = await fetchText(pricingChunkUrl);
  const moduleStart = pricingChunkText.indexOf('"566a":function');
  if (moduleStart < 0) {
    throw new Error("Unable to locate Zhipu coding pricing module");
  }
  const nextModuleMatch = pricingChunkText.slice(moduleStart + 1).match(/},\"[0-9a-z]{4,6}\":function/i);
  const moduleEnd = nextModuleMatch ? moduleStart + 1 + nextModuleMatch.index : pricingChunkText.length;
  const moduleSection = pricingChunkText.slice(moduleStart, moduleEnd);

  const extractStringField = (body, key) => {
    const match = body.match(new RegExp(`${key}:"([^"]*)"`));
    return match ? match[1] : null;
  };
  const extractNumberField = (body, key) => {
    const match = body.match(new RegExp(`${key}:([0-9]+(?:\\.[0-9]+)?)`));
    return match ? Number(match[1]) : null;
  };

  const cardRegex = /Object\(i\["a"\]\)\(\{([\s\S]*?)\},n\.(lite|pro|max)\)/g;
  const cardItems = [];
  let cardMatch;
  while ((cardMatch = cardRegex.exec(moduleSection)) !== null) {
    const body = cardMatch[1];
    const productName = extractStringField(body, "productName");
    if (!productName || !/^GLM Coding (Lite|Pro|Max)$/.test(productName)) {
      continue;
    }
    cardItems.push({
      productId: extractStringField(body, "productId"),
      productName,
      salePrice: extractNumberField(body, "salePrice"),
      originalPrice: extractNumberField(body, "originalPrice"),
      renewAmount: extractNumberField(body, "renewAmount"),
      unit: extractStringField(body, "unit"),
      unitText: extractStringField(body, "unitText"),
      tagText: extractStringField(body, "tagText"),
      version: extractStringField(body, "version"),
    });
  }
  if (cardItems.length === 0) {
    throw new Error("Unable to parse Zhipu coding pricing cards");
  }

  const selectedCards = (() => {
    const v2Cards = cardItems.filter((item) => item.version === "v2");
    return v2Cards.length >= 3 ? v2Cards : cardItems;
  })();

  const unitOrder = { month: 0, quarter: 1, year: 2 };
  const tierOrder = { Lite: 0, Pro: 1, Max: 2 };
  const sortedCards = [...selectedCards]
    .filter(
      (item) =>
        item.productName && item.unitText && Number.isFinite(item.salePrice) && String(item.unit).toLowerCase() === "month",
    )
    .sort((left, right) => {
      const leftUnit = unitOrder[left.unit] ?? 99;
      const rightUnit = unitOrder[right.unit] ?? 99;
      if (leftUnit !== rightUnit) {
        return leftUnit - rightUnit;
      }
      const leftTier = left.productName.replace("GLM Coding ", "");
      const rightTier = right.productName.replace("GLM Coding ", "");
      return (tierOrder[leftTier] ?? 99) - (tierOrder[rightTier] ?? 99);
    });

  const renewLabelByUnit = {
    month: "下个月度续费金额",
    quarter: "下个季度续费金额",
    year: "下个年度续费金额",
  };
  const docsUrl = "https://docs.bigmodel.cn/cn/coding-plan/overview";
  const serviceDetailsByTier = new Map();
  try {
    const docsHtml = await fetchText(docsUrl);
    const docsRows = extractRows(docsHtml);
    const headerRow = docsRows.find((row) => normalizeText(row?.[0] || "") === "套餐类型" && row.length >= 3) || null;
    if (headerRow) {
      for (const row of docsRows) {
        const tierMatch = normalizeText(row?.[0] || "").match(/^(Lite|Pro|Max)\s*套餐$/i);
        if (!tierMatch) {
          continue;
        }
        const serviceDetails = [];
        for (let column = 1; column < Math.min(headerRow.length, row.length); column += 1) {
          const label = normalizeText(headerRow[column]);
          const value = normalizeText(row[column]);
          if (!label || !value) {
            continue;
          }
          serviceDetails.push(`${label}: ${value}`);
        }
        serviceDetailsByTier.set(tierMatch[1], normalizeServiceDetails(serviceDetails));
      }
    }
  } catch {
    // Keep pricing fetch resilient when docs service metadata is temporarily unavailable.
  }
  const plans = [];
  const seen = new Set();
  for (const card of sortedCards) {
    const uniqueKey = `${card.productName}|${card.unit}`;
    if (seen.has(uniqueKey)) {
      continue;
    }
    seen.add(uniqueKey);
    const currentPriceText = `¥${formatAmount(card.salePrice)}/${card.unitText}`;
    const originalPriceText =
      Number.isFinite(card.originalPrice) && card.originalPrice > card.salePrice
        ? `¥${formatAmount(card.originalPrice)}/${card.unitText}`
        : null;
    const renewText = Number.isFinite(card.renewAmount)
      ? `${renewLabelByUnit[card.unit] || "续费金额"}：¥${formatAmount(card.renewAmount)}`
      : null;
    const tier = card.productName.replace("GLM Coding ", "");
    plans.push(
      asPlan({
        name: `${card.productName} (${card.unitText})`,
        currentPriceText,
        currentPrice: card.salePrice,
        originalPriceText,
        originalPrice: Number.isFinite(card.originalPrice) ? card.originalPrice : null,
        unit: card.unitText,
        notes: [card.tagText || "", renewText || ""].filter(Boolean).join("；"),
        serviceDetails: serviceDetailsByTier.get(tier) || null,
      }),
    );
  }
  if (plans.length === 0) {
    throw new Error("Unable to build Zhipu coding plans");
  }

  return {
    provider: PROVIDER_IDS.ZHIPU,
    sourceUrls: unique([pageUrl, appUrl, pricingChunkUrl, docsUrl]),
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
}

module.exports = parseZhipuCodingPlans;
