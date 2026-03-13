"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  fetchText,
  normalizeText,
  decodeUnicodeLiteral,
  normalizeServiceDetails,
  asPlan,
  dedupePlans,
  unique,
  absoluteUrl,
} = require("../utils");

/**
 * Fetches usage limits from Volcengine help documentation
 * @returns {Map<string, string[]>} Map of tier to usage limit details
 */
async function fetchVolcUsageLimitsFromHelpDoc() {
  const helpUrl = "https://www.volcengine.com/docs/82379/2165245";
  const usageLimitsByTier = new Map();

  try {
    const helpHtml = await fetchText(helpUrl);

    // The page uses a rich text editor format with JSON-encoded content
    // Look for the usage limits section in the HTML table structure
    // The table has: Lite 套餐 row, then Pro 套餐 row
    // We need to extract the numbers that appear AFTER each tier name

    // Find Lite 套餐 section and extract the first set of numbers after it
    const liteSectionMatch = helpHtml.match(/Lite\s*套餐[\s\S]{0,800}/i);
    const proSectionMatch = helpHtml.match(/Pro\s*套餐[\s\S]{0,800}/i);

    if (liteSectionMatch && proSectionMatch) {
      const liteSection = liteSectionMatch[0];
      const proSection = proSectionMatch[0];

      // Extract Lite limits from its section (first occurrence of each pattern)
      const liteHourly = liteSection.match(/每\s*5\s*小时[\s\S]{0,50}?([\d,]+)[\s\S]{0,20}?次请求/i);
      const liteWeekly = liteSection.match(/每周[\s\S]{0,50}?([\d,]+)[\s\S]{0,20}?次请求/i);
      const liteMonthly = liteSection.match(/每(?:订阅)?月[\s\S]{0,50}?([\d,]+)[\s\S]{0,20}?次请求/i);

      if (liteHourly && liteWeekly && liteMonthly) {
        usageLimitsByTier.set("Lite", [
          `每 5 小时限额: ${liteHourly[1].replace(/,/g, "")} 次请求`,
          `每周限额: ${liteWeekly[1].replace(/,/g, "")} 次请求`,
          `每月限额: ${liteMonthly[1].replace(/,/g, "")} 次请求`,
        ]);
      }

      // Extract Pro limits from its section (first occurrence of each pattern)
      const proHourly = proSection.match(/每\s*5\s*小时[\s\S]{0,50}?([\d,]+)[\s\S]{0,20}?次请求/i);
      const proWeekly = proSection.match(/每周[\s\S]{0,50}?([\d,]+)[\s\S]{0,20}?次请求/i);
      const proMonthly = proSection.match(/每(?:订阅)?月[\s\S]{0,50}?([\d,]+)[\s\S]{0,20}?次请求/i);

      if (proHourly && proWeekly && proMonthly) {
        usageLimitsByTier.set("Pro", [
          `每 5 小时限额: ${proHourly[1].replace(/,/g, "")} 次请求`,
          `每周限额: ${proWeekly[1].replace(/,/g, "")} 次请求`,
          `每月限额: ${proMonthly[1].replace(/,/g, "")} 次请求`,
        ]);
      }
    }

    // Fallback: extract all numbers after "每 5 小时", "每周", "每订阅月" patterns
    if (usageLimitsByTier.size === 0) {
      const hourlyMatches = [...helpHtml.matchAll(/每\s*5\s*小时[\s\S]{0,100}?([\d,]+)[\s\S]{0,50}?次请求/gi)];
      const weeklyMatches = [...helpHtml.matchAll(/每周[\s\S]{0,100}?([\d,]+)[\s\S]{0,50}?次请求/gi)];
      const monthlyMatches = [...helpHtml.matchAll(/每(?:订阅)?月[\s\S]{0,100}?([\d,]+)[\s\S]{0,50}?次请求/gi)];

      if (hourlyMatches.length >= 2 && weeklyMatches.length >= 2 && monthlyMatches.length >= 2) {
        usageLimitsByTier.set("Lite", [
          `每 5 小时限额: ${hourlyMatches[0][1].replace(/,/g, "")} 次请求`,
          `每周限额: ${weeklyMatches[0][1].replace(/,/g, "")} 次请求`,
          `每月限额: ${monthlyMatches[0][1].replace(/,/g, "")} 次请求`,
        ]);
        usageLimitsByTier.set("Pro", [
          `每 5 小时限额: ${hourlyMatches[1][1].replace(/,/g, "")} 次请求`,
          `每周限额: ${weeklyMatches[1][1].replace(/,/g, "")} 次请求`,
          `每月限额: ${monthlyMatches[1][1].replace(/,/g, "")} 次请求`,
        ]);
      }
    }
  } catch (error) {
    console.warn(`[pricing] Failed to fetch usage limits from help doc: ${error.message}`);
  }

  return usageLimitsByTier;
}

/**
 * Fallback data for Volcengine when parsing fails
 * @returns {Object} Fallback provider data
 */
function getFallbackData() {
  return {
    provider: PROVIDER_IDS.VOLCENGINE,
    sourceUrls: [
      "https://www.volcengine.com/activity/codingplan",
      "https://lf6-cdn2-tos.bytegoofy.com/gftar/toutiao/fe_arch/fes2_app_1761224550685339/1.0.0.156/index.js",
      "https://www.volcengine.com/docs/82379/2165245",
    ],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Coding Plan Lite 月套餐",
        currentPriceText: "¥9.9/月",
        originalPriceText: "¥40/月",
        currentPrice: 9.9,
        originalPrice: 40,
        unit: "月",
        notes: null,
        serviceDetails: [
          "能力: 支持 Doubao、GLM、DeepSeek、Kimi等模型",
          "适配: 支持自由切换模型，或开启Auto模式",
          "工具: 支持 Claude Code、Cursor等主流编程工具",
          "每 5 小时限额: 1200 次请求",
          "每周限额: 9000 次请求",
          "每月限额: 18000 次请求",
        ],
        offerEndDate: "2026-07-09T23:59:59+08:00",
      }),
      asPlan({
        name: "Coding Plan Pro 月套餐",
        currentPriceText: "¥49.9/月",
        originalPriceText: "¥200/月",
        currentPrice: 49.9,
        originalPrice: 200,
        unit: "月",
        notes: null,
        serviceDetails: [
          "能力: 包含lite套餐全部权益",
          "适配: 满足高阶用户的大规模编程需求",
          "用量: 用量达 Claude Max（5x）的 3 倍，lite 套餐用量的5倍",
          "每 5 小时限额: 6000 次请求",
          "每周限额: 45000 次请求",
          "每月限额: 90000 次请求",
        ],
        offerEndDate: "2026-07-09T23:59:59+08:00",
      }),
    ],
  };
}

async function parseVolcengineCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.VOLCENGINE, readmePath);
  try {
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

    // Fetch usage limits from help documentation
    const usageLimitsByTier = await fetchVolcUsageLimitsFromHelpDoc();

    // Merge usage limits into plans
    for (const plan of selectedPlans) {
      const tier = plan.name.includes("Lite") ? "Lite" : "Pro";
      const usageLimits = usageLimitsByTier.get(tier);
      if (usageLimits && usageLimits.length > 0) {
        plan.serviceDetails = [...(plan.serviceDetails || []), ...usageLimits];
      }
    }

    return {
      provider: PROVIDER_IDS.VOLCENGINE,
      sourceUrls: unique([pageUrl, selectedSourceUrl, "https://www.volcengine.com/docs/82379/2165245"]),
      fetchedAt: new Date().toISOString(),
      plans: dedupePlans(selectedPlans),
    };
  } catch (error) {
    console.warn(`[pricing] Volcengine fetch failed: ${error.message}. Returning fallback.`);
    return getFallbackData();
  }
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
      offerEndDate: "2026-07-09T23:59:59+08:00",
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
