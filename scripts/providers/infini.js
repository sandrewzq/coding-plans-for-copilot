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

async function parseInfiniCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.INFINI, readmePath);
  const html = await fetchText(pageUrl);
  const mainScriptUrl =
    html.match(/https:\/\/content\.cloud\.infini-ai\.com\/platform-web-prod\/assets\/js\/main\.[^"'\s]+\.js/i)?.[0] ||
    null;
  if (!mainScriptUrl) {
    throw new Error("Unable to locate Infini main script");
  }
  const mainScriptText = await fetchText(mainScriptUrl);
  const candidateChunkPaths = unique([
    ...[...mainScriptText.matchAll(/(?:\.\/)?Index\.[0-9a-f]+\.js/gi)].map((match) => match[0].replace(/^\.\//, "")),
    ...[...mainScriptText.matchAll(/(?:\.\/)?index\.[0-9a-f]+\.js/gi)].map((match) => match[0].replace(/^\.\//, "")),
    ...[...mainScriptText.matchAll(/\/assets\/js\/(?:Index|index)\.[0-9a-f]+\.js/gi)].map((match) => match[0]),
  ]);
  if (candidateChunkPaths.length === 0) {
    throw new Error("Unable to locate Infini candidate pricing chunks");
  }

  let selectedChunkUrl = null;
  let selectedPlans = [];
  for (const chunkPath of candidateChunkPaths.slice(0, 30)) {
    const chunkUrl = absoluteUrl(chunkPath, mainScriptUrl);
    let chunkText;
    try {
      chunkText = await fetchText(chunkUrl);
    } catch {
      continue;
    }
    if (chunkText.length < 5000 || !/Infini Coding (Lite|Pro)/i.test(chunkText)) {
      continue;
    }
    const serviceDetailsByTier = parseInfiniServiceDetailsByTier(chunkText);
    const liteBase = parseInfiniPlanFromBundle(chunkText, "Lite");
    const proBase = parseInfiniPlanFromBundle(chunkText, "Pro");
    const litePlan = liteBase ? { ...liteBase, serviceDetails: serviceDetailsByTier.get("Lite") || null } : null;
    const proPlan = proBase ? { ...proBase, serviceDetails: serviceDetailsByTier.get("Pro") || null } : null;
    const plans = [litePlan, proPlan].filter(Boolean);
    if (plans.length === 0) {
      continue;
    }
    selectedChunkUrl = chunkUrl;
    selectedPlans = plans;
    if (plans.some((plan) => plan.originalPriceText)) {
      break;
    }
  }
  if (selectedPlans.length === 0) {
    // Fallback: use known published prices from the official page.
    // Last verified: 2025-03 - Infini Coding Lite ¥40/月, Pro ¥200/月.
    selectedPlans = [
      asPlan({
        name: "Infini Coding Lite",
        currentPriceText: "¥40/月",
        currentPrice: 40,
        unit: "月",
        serviceDetails: ["1,000次/5小时、6,000次/7天、12,000次/1个月", "支持MiniMax、GLM、DeepSeek、Kimi等最新模型，Day0上新", "适配Claude Code、Cline等主流编程工具，持续更新"],
      }),
      asPlan({
        name: "Infini Coding Pro",
        currentPriceText: "¥200/月",
        currentPrice: 200,
        unit: "月",
        serviceDetails: ["5,000次/5小时、30,000次/7天、60,000次/1个月", "5倍Lite套餐用量", "支持MiniMax、GLM、DeepSeek、Kimi等最新模型，Day0上新", "适配Claude Code、Cline等主流编程工具，持续更新"],
      }),
    ];
  }

  const canPurchaseUrl = "https://cloud.infini-ai.com/api/maas/system/coding_plan/can_purchase";
  let canPurchaseItems = [];
  try {
    const payload = await fetchJson(canPurchaseUrl, {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://cloud.infini-ai.com",
        referer: pageUrl,
      },
      body: "{}",
    });
    if (Array.isArray(payload)) {
      canPurchaseItems = payload;
    }
  } catch {
    canPurchaseItems = [];
  }
  const canBuyByTier = new Map();
  for (const item of canPurchaseItems) {
    const name = normalizeText(item?.name || "");
    if (!name) {
      continue;
    }
    if (/lite/i.test(name)) {
      canBuyByTier.set("Lite", Boolean(item?.can_buy));
    } else if (/pro/i.test(name)) {
      canBuyByTier.set("Pro", Boolean(item?.can_buy));
    }
  }
  const plans = selectedPlans.map((plan) => {
    const tier = /lite/i.test(plan.name) ? "Lite" : /pro/i.test(plan.name) ? "Pro" : null;
    const canBuy = tier ? canBuyByTier.get(tier) : null;
    const notes = canBuy === false ? "暂不可购买" : null;
    const serviceDetails = normalizeServiceDetails([
      ...(plan.serviceDetails || []),
      canBuy === false ? "当前状态: 暂不可购买" : null,
    ]);
    return {
      ...plan,
      notes: notes || plan.notes || null,
      serviceDetails: serviceDetails || null,
    };
  });

  return {
    provider: PROVIDER_IDS.INFINI,
    sourceUrls: unique([pageUrl, mainScriptUrl, selectedChunkUrl, canPurchaseUrl]),
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
}

function parseInfiniPlanFromBundle(bundleText, tier) {
  const marker = `Infini Coding ${tier}`;
  const markerIndex = bundleText.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }
  const snippet = bundleText.slice(markerIndex, markerIndex + 3600);
  const currentMatch = snippet.match(/class:"amount"\}\s*,\s*"([0-9]+(?:\.[0-9]+)?)"/i);
  if (!currentMatch) {
    return null;
  }
  const originalMatch = snippet.match(/class:"strike"\}\s*,\s*"¥\s*([0-9]+(?:\.[0-9]+)?)\/月"/i);
  const currentAmount = Number(currentMatch[1]);
  const originalAmount = originalMatch ? Number(originalMatch[1]) : null;
  if (!Number.isFinite(currentAmount)) {
    return null;
  }
  return asPlan({
    name: `Infini Coding ${tier}`,
    currentPriceText: `¥${formatAmount(currentAmount)}/月`,
    currentPrice: currentAmount,
    originalPriceText: Number.isFinite(originalAmount) ? `¥${formatAmount(originalAmount)}/月` : null,
    originalPrice: Number.isFinite(originalAmount) ? originalAmount : null,
    unit: "月",
  });
}

function parseInfiniServiceDetailsByTier(bundleText) {
  const detailsByTier = new Map();
  const liteMarker = bundleText.indexOf("Infini Coding Lite");
  const proMarker = bundleText.indexOf("Infini Coding Pro");
  if (liteMarker < 0 && proMarker < 0) {
    return detailsByTier;
  }
  const regionStart = Math.max(0, Math.min(...[liteMarker, proMarker].filter((value) => value >= 0)) - 1200);
  const regionEnd = Math.min(bundleText.length, Math.max(liteMarker, proMarker) + 12000);
  const section = decodeUnicodeLiteral(bundleText.slice(regionStart, regionEnd));

  const titleMatches = [...section.matchAll(/class:"feature-title"}\s*,\s*"([^"]+)"/g)];
  const blocks = [];
  for (let index = 0; index < titleMatches.length; index += 1) {
    const match = titleMatches[index];
    const blockStart = match.index ?? 0;
    const blockEnd = titleMatches[index + 1]?.index ?? section.length;
    const blockText = section.slice(blockStart, blockEnd);
    const title = normalizeText(match[1]);
    const items = [...blockText.matchAll(/class:"feature-item[^"]*"}[\s\S]{0,260}?U\("span",null,"([^"]+)"\)/g)]
      .map((item) => normalizeText(item[1]))
      .filter(Boolean);
    const details = normalizeServiceDetails([title, ...items]);
    if (details && details.length > 0) {
      blocks.push(details);
    }
  }

  for (const details of blocks) {
    const text = details.join(" ");
    if (/5,000次\/5小时|30,000次\/7天|60,000次\/1个月|5倍Lite套餐用量/.test(text)) {
      detailsByTier.set("Pro", details);
      continue;
    }
    if (/1,000次\/5小时|6,000次\/7天|12,000次\/1个月/.test(text)) {
      detailsByTier.set("Lite", details);
    }
  }
  if (!detailsByTier.get("Lite") && blocks[0]) {
    detailsByTier.set("Lite", blocks[0]);
  }
  if (!detailsByTier.get("Pro") && blocks[1]) {
    detailsByTier.set("Pro", blocks[1]);
  }
  return detailsByTier;
}

module.exports = parseInfiniCodingPlans;
