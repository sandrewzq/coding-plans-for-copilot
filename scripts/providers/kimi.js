"use strict";

const path = require("path");
const {
  COMMON_HEADERS,
  PROVIDER_IDS,
  getProviderUrl,
  fetchText,
  fetchJson,
  formatAmount,
  normalizeText,
  asPlan,
  absoluteUrl,
  unique,
  timeUnitLabel,
  stripSimpleMarkdown,
  dedupePlans,
} = require("../utils");

const KIMI_MEMBERSHIP_LEVEL_LABELS = {
  LEVEL_FREE: "免费试用",
  LEVEL_BASIC: "基础会员",
  LEVEL_INTERMEDIATE: "进阶会员",
  LEVEL_ADVANCED: "高级会员",
  LEVEL_STANDARD: "旗舰会员",
};

async function parseKimiCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.KIMI, readmePath);
  const apiUrl = "https://www.kimi.com/apiv2/kimi.gateway.order.v1.GoodsService/ListGoods";
  const pageHtml = await fetchText(pageUrl);
  const commonScriptRaw =
    pageHtml.match(/\/\/statics\.moonshot\.cn\/kimi-web-seo\/assets\/common-[^"'\s]+\.js/i)?.[0] || null;
  const commonScriptUrl = commonScriptRaw ? absoluteUrl(commonScriptRaw, pageUrl) : null;
  let featureCandidates = [];
  if (commonScriptUrl) {
    try {
      const commonScriptText = await fetchText(commonScriptUrl);
      featureCandidates = parseKimiFeatureCandidates(commonScriptText);
    } catch {
      featureCandidates = [];
    }
  }
  const payload = await fetchJson(apiUrl, {
    method: "POST",
    headers: {
      ...COMMON_HEADERS,
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      origin: "https://www.kimi.com",
      referer: pageUrl,
    },
    body: "{}",
  });

  const plans = [];
  for (const goods of payload.goods || []) {
    const title = normalizeText(goods?.title || "");
    if (!title) {
      continue;
    }
    const unitLabel = timeUnitLabel(goods?.billingCycle?.timeUnit);
    if (unitLabel !== "月") {
      continue;
    }
    const amounts = Array.isArray(goods?.amounts) ? goods.amounts : [];
    for (const amount of amounts) {
      const cents = Number(amount?.priceInCents);
      if (!Number.isFinite(cents)) {
        continue;
      }
      const yuan = cents / 100;
      const suffix = unitLabel ? `/${unitLabel}` : "";
      const isTrialPlan = /^adagio$/i.test(title) || yuan === 0;
      const membershipLevel = normalizeText(goods?.membershipLevel || "");
      const membershipLabel = KIMI_MEMBERSHIP_LEVEL_LABELS[membershipLevel] || membershipLevel;
      const planFeatures = pickKimiFeaturesByTitleAndPrice(featureCandidates, title, yuan);
      plans.push(
        asPlan({
          name: unitLabel ? `${title} (${unitLabel})` : title,
          currentPriceText: `¥${formatAmount(yuan)}${suffix}`,
          currentPrice: yuan,
          unit: unitLabel || null,
          notes: isTrialPlan ? "试用计划" : null,
          serviceDetails: [
            membershipLabel ? `会员等级: ${membershipLabel}` : null,
            ...(planFeatures || []),
            !planFeatures && isTrialPlan ? "Kimi Code 试用套餐权益" : null,
            !planFeatures && !isTrialPlan ? "Kimi Code 月度订阅权益" : null,
          ],
        }),
      );
    }
  }

  // Kimi API can return stale plans (old membership data) when called without browser cookies.
  // If no plan named "Andante" is found (which is a new Kimi Code-specific plan), fall back to
  // known good prices from the official code page.
  const hasNewPlans = plans.some((p) => /^andante/i.test(p.name));
  if (!hasNewPlans && plans.length > 0) {
    console.warn("[pricing] Kimi API returned old membership plans; using hardcoded Kimi Code fallback.");
    return {
      provider: PROVIDER_IDS.KIMI,
      sourceUrls: [pageUrl, apiUrl],
      fetchedAt: new Date().toISOString(),
      plans: [
        asPlan({
          name: "Andante (月)",
          currentPriceText: "¥49/月",
          currentPrice: 49,
          unit: "月",
          notes: "连续包月 ¥39/月，按年计费 ¥468/年",
          serviceDetails: [
            "更多 Agent 额度",
            "Agent 4倍速优先用",
            "K2.5 提速并提升额度",
            "Kimi Code 可调用",
          ],
        }),
        asPlan({
          name: "Moderato (月)",
          currentPriceText: "¥99/月",
          currentPrice: 99,
          unit: "月",
          notes: "连续包月 ¥79/月，按年计费 ¥948/年",
          serviceDetails: [
            "Andante 权益基础上",
            "2倍 Agent 额度",
            "Agent 多任务并行",
            "2倍 K2.5 模型使用额度",
            "Kimi Code 4倍额度",
          ],
        }),
        asPlan({
          name: "Allegretto (月)",
          currentPriceText: "¥199/月",
          currentPrice: 199,
          unit: "月",
          notes: "连续包月 ¥159/月，按年计费 ¥1,908/年",
          serviceDetails: [
            "Andante 权益基础上",
            "4倍 Agent 额度",
            "Agent 多任务并行",
            "4倍 K2.5 模型使用额度",
            "Kimi Code 20倍额度",
            "专属助理 一键部署 Kimi Claw",
            "实验性功能 Agent 集群：多 Agent 并行，数倍生产力，适用海量搜索、长文写作、批量处理",
          ],
        }),
        asPlan({
          name: "Allegro (月)",
          currentPriceText: "¥699/月",
          currentPrice: 699,
          unit: "月",
          notes: "连续包月 ¥559/月，按年计费 ¥6,708/年",
          serviceDetails: [
            "Andante 权益基础上",
            "10倍 Agent 额度",
            "Agent 多任务并行",
            "10倍 K2.5 模型使用额度",
            "Kimi Code 60倍额度",
            "专属助理 一键部署 Kimi Claw",
            "实验性功能 Agent 集群：多 Agent 并行，数倍生产力，适用海量搜索、长文写作、批量处理",
          ],
        }),
      ],
    };
  }

  return {
    provider: PROVIDER_IDS.KIMI,
    sourceUrls: unique([pageUrl, apiUrl, commonScriptUrl]),
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
}

function parseKimiFeatureCandidates(bundleText) {
  const candidates = [];
  const planRegex = /title:"([^"]+)",price:([0-9]+),features:\{"zh-CN":\[((?:\{text:"[^"]*"(?:,group:!0)?\},?)*)\]/g;
  let planMatch;
  while ((planMatch = planRegex.exec(bundleText)) !== null) {
    const title = normalizeText(planMatch[1]);
    const price = Number(planMatch[2]);
    const featureBlob = planMatch[3] || "";
    const features = unique(
      [...featureBlob.matchAll(/text:"([^"]+)"/g)]
        .map((item) => stripSimpleMarkdown(item[1]))
        .filter(Boolean),
    );
    if (!title || features.length === 0) {
      continue;
    }
    candidates.push({
      title,
      price: Number.isFinite(price) ? price : null,
      features,
    });
  }
  return candidates;
}

function pickKimiFeaturesByTitleAndPrice(candidates, title, currentPrice) {
  const normalizedTitle = normalizeText(title).toLowerCase();
  const matches = (candidates || []).filter((item) => normalizeText(item.title).toLowerCase() === normalizedTitle);
  if (matches.length === 0) {
    return null;
  }
  const exact = matches.find((item) => Number.isFinite(item.price) && Number.isFinite(currentPrice) && item.price === currentPrice);
  if (exact) {
    return exact.features;
  }
  return matches[0].features;
}

module.exports = parseKimiCodingPlans;
