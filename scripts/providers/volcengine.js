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

async function parseVolcengineCodingPlans() {
  const pageUrl = "https://www.volcengine.com/activity/codingplan";
  const html = await fetchText(pageUrl);
  const candidates = extractVolcBundleCandidatesFromHtml(html, pageUrl);
  if (candidates.length === 0) {
    throw new Error("Unable to locate Volcengine coding plan bundle");
  }

  const fallbackIndexUrl =
    "https://lf6-cdn2-tos.bytegoofy.com/gftar/toutiao/fe_arch/fes2_app_1761224550685339/1.0.0.156/index.js";

  let selectedSourceUrl = null;
  let selectedPlans = [];
  for (const candidate of unique([...candidates.slice(0, 2), fallbackIndexUrl])) {
    let bundleText;
    try {
      bundleText = await fetchText(candidate);
    } catch {
      continue;
    }
    const lite = parseVolcPlanFromBundle(bundleText, "Coding_Plan_Lite_monthly");
    const pro = parseVolcPlanFromBundle(bundleText, "Coding_Plan_Pro_monthly");
    const plans = [lite, pro].filter(Boolean);
    if (plans.length < 2) {
      continue;
    }
    selectedSourceUrl = candidate;
    selectedPlans = plans;
    if (plans.every((plan) => plan.currentPriceText && plan.originalPriceText && (plan.serviceDetails || []).length >= 3)) {
      break;
    }
  }

  if (selectedPlans.length === 0) {
    throw new Error("Unable to parse Volcengine coding plan bundle");
  }

  return {
    provider: PROVIDER_IDS.VOLCENGINE,
    sourceUrls: unique([pageUrl, selectedSourceUrl]),
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(selectedPlans),
  };
}

function normalizeVolcCurrentPriceText(rawText) {
  const value = normalizeText(rawText);
  if (!value) {
    return null;
  }
  if (/免费|0\s*成本/i.test(value)) {
    return "免费";
  }
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(value)) {
    return `¥${value}/月`;
  }
  if (/^[0-9]+(?:\.[0-9]+)?\s*\/\s*月$/.test(value)) {
    return `¥${value.replace(/\s+/g, "")}`;
  }
  const normalized = value.replace(/元\s*\/\s*月/g, "/月").replace(/元\/月/g, "/月");
  if (!/[¥￥]/.test(normalized) && /^[0-9]/.test(normalized)) {
    return `¥${normalized}`;
  }
  return normalized;
}

function normalizeVolcOriginalPriceText(rawText) {
  const value = normalizeText(rawText);
  if (!value) {
    return null;
  }
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(value)) {
    return `¥${value}/月`;
  }
  const normalized = value.replace(/元\s*\/\s*月/g, "/月").replace(/元\/月/g, "/月");
  if (!/[¥￥]/.test(normalized) && /^[0-9]/.test(normalized)) {
    return `¥${normalized}`;
  }
  return normalized;
}

function parseVolcServiceDetails(decodedSnippet) {
  const details = [];
  const itemRegex = /title:"([^"]+)"\s*,\s*rightContents:\[\[\{text:"([^"]+)"/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(decodedSnippet)) !== null) {
    const title = normalizeText(itemMatch[1]);
    const text = normalizeText(itemMatch[2]);
    if (!title || !text) {
      continue;
    }
    if (/^[^：:]{1,12}[：:]/.test(text)) {
      details.push(text);
    } else {
      details.push(`${title}: ${text}`);
    }
  }
  return normalizeServiceDetails(details);
}

function parseVolcPlanFromBundle(bundleText, configurationCode) {
  const marker = `configurationCode:"${configurationCode}"`;
  const isLite = configurationCode.includes("Lite");
  const candidates = [];
  let index = bundleText.indexOf(marker);
  while (index >= 0) {
    const snippet = bundleText.slice(Math.max(0, index - 2600), index + 6200);
    const decoded = decodeUnicodeLiteral(snippet);
    const currentPriceText = normalizeVolcCurrentPriceText(decoded.match(/discountAmount:"([^"]+)"/)?.[1] || null);
    const originalPriceText = normalizeVolcOriginalPriceText(decoded.match(/originalAmount:"([^"]+)"/)?.[1] || null);
    const serviceDetails = parseVolcServiceDetails(decoded);
    const detailText = (serviceDetails || []).join(" ");

    const plan = asPlan({
      name: isLite ? "Coding Plan Lite 月套餐" : "Coding Plan Pro 月套餐",
      currentPriceText,
      originalPriceText,
      unit: "月",
      notes: null,
      serviceDetails,
    });
    const score =
      (plan.currentPriceText ? 4 : 0) +
      (plan.originalPriceText ? 3 : 0) +
      ((plan.serviceDetails || []).length >= 3 ? 3 : (plan.serviceDetails || []).length) +
      (/续费/.test(plan.originalPriceText || "") ? 2 : 0) +
      (isLite && /能力[:：].*Doubao.*GLM.*DeepSeek.*Kimi/i.test(detailText) ? 2 : 0) +
      (!isLite && /能力[:：].*Lite.*适配[:：].*高阶.*(升级[:：]|用量)/i.test(detailText) ? 2 : 0) +
      (!isLite && /Claude Max/i.test(detailText) ? 1 : 0);
    if (score > 0) {
      candidates.push({ index, score, plan });
    }

    index = bundleText.indexOf(marker, index + marker.length);
  }

  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((left, right) => right.score - left.score || right.index - left.index);
  return candidates[0].plan;
}

function volcBundleId(url) {
  const match = String(url).match(/fes2_app_(\d+)\//);
  return match ? Number(match[1]) : 0;
}

function volcBundleVersion(url) {
  const match = String(url).match(/\/(\d+\.\d+\.\d+\.\d+)\/index\.js/);
  if (!match) {
    return 0;
  }
  const parts = match[1].split(".").map((value) => Number(value));
  return parts.reduce((total, value) => total * 1_000 + (Number.isFinite(value) ? value : 0), 0);
}

function extractVolcBundleCandidatesFromHtml(html, pageUrl) {
  const scriptMatch = html.match(/window\.gfdatav1\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i);
  const urls = [];
  if (scriptMatch) {
    try {
      const payload = JSON.parse(scriptMatch[1]);
      const modules = Array.isArray(payload?.garrModules?.data) ? payload.garrModules.data : [];
      for (const item of modules) {
        const name = normalizeText(item?.name || "");
        const modulePath = normalizeText(item?.path || "");
        if (!/activity\/codingplan/i.test(`${name} ${modulePath}`)) {
          continue;
        }
        const sourceUrl = normalizeText(item?.source_url || "");
        if (!sourceUrl) {
          continue;
        }
        const normalized = sourceUrl.startsWith("//") ? `https:${sourceUrl}` : absoluteUrl(sourceUrl, pageUrl);
        urls.push(normalized);
      }
    } catch {
      // Keep fallback extraction below.
    }
  }

  if (urls.length === 0) {
    const fallbackMatches = html.match(/https?:\/\/[^"'\s]+fes2_app_[0-9]+\/[0-9.]+\/bundles\/js\/main\.js/gi) || [];
    urls.push(...fallbackMatches);
  }

  return unique(
    urls
      .map((url) => url.replace("/bundles/js/main.js", "/index.js"))
      .filter((url) => /\/index\.js$/i.test(url)),
  ).sort((left, right) => volcBundleVersion(right) - volcBundleVersion(left) || volcBundleId(right) - volcBundleId(left));
}

module.exports = parseVolcengineCodingPlans;
