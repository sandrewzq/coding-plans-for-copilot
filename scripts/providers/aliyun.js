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

async function parseAliyunCodingPlans() {
  const pageUrl = "https://www.aliyun.com/benefit/scene/codingplan";
  try {
    const html = await fetchText(pageUrl);
    const serviceDetailsByTier = parseAliyunServiceDetailsFromPageHtml(html);
    const rawEntryUrl = html.match(/(?:https?:)?\/\/cloud-assets\.alicdn\.com\/lowcode\/entry\/prod\/[^"'\s]+\.js/i)?.[0];
    const entryUrl = rawEntryUrl
      ? absoluteUrl(rawEntryUrl.startsWith("//") ? `https:${rawEntryUrl}` : rawEntryUrl, pageUrl)
      : null;
    if (!entryUrl) {
      throw new Error("Unable to locate Aliyun entry script");
    }
    const queryPriceUrl = "https://t.aliyun.com/abs/promotion/queryPrice";
    const planDefs = [
      {
        tier: "Lite",
        commodityId: 10000019802,
        subscriptionTypeName: "Lite 基础套餐",
        subscriptionTypeValue: "lite",
      },
      {
        tier: "Pro",
        commodityId: 10000019803,
        subscriptionTypeName: "Pro 高级套餐",
        subscriptionTypeValue: "pro",
      },
    ];
    const buildAliyunPriceParam = (planDef) => ({
      commodityId: planDef.commodityId,
      commodities: [
        {
          couponNum: "default",
          orderType: "BUY",
          components: [
            {
              componentCode: "subscription_type",
              instanceProperty: [
                {
                  code: "subscription_type",
                  name: planDef.subscriptionTypeName,
                  value: planDef.subscriptionTypeValue,
                },
              ],
              componentName: "订阅套餐",
            },
          ],
          quantity: 1,
          specCode: "sfm_codingplan_public_cn",
          chargeType: "PREPAY",
          pricingCycleTitle: "月",
          duration: "1",
          orderParams: {
            queryGetCouponActivity: true,
            order_created_by: "merak",
            pricing_trigger_type: "default",
          },
          chargeTypeTitle: "预付费",
          commodityCode: "sfm_codingplan_public_cn",
          autoRenew: false,
          pricingCycle: "Month",
          commodityName: "阿里云百炼 Coding Plan",
          uniqLabel: `sfm_codingplan_public_cn.${planDef.commodityId}.0`,
        },
      ],
    });
    const centToYuan = (value) => {
      const amount = Number(value);
      if (!Number.isFinite(amount)) {
        return null;
      }
      return amount / 100;
    };

    // Extract new-customer first-month flash prices once, before the per-plan loop.
    // The DOM structure might break up the price with spans (e.g. <span>￥</span><span>39.90</span>),
    // and uses fullwidth ￥ (U+FFE5) for the flash price but narrow ¥ (U+00A5) for the regular price.
    // Stripping all tags and spaces makes the regex extremely robust.
    const cleanHtml = decodeHtml(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, "");
    const liteFlashMatch =
      cleanHtml.match(/[¥￥]([0-9]+(?:\.[0-9]+)?)\/1?(?:个)?月.{0,1500}?官网折扣价[^¥￥0-9]*[¥￥]40(?:[^0-9]|$)/i) ||
      cleanHtml.match(/首月(?:新购)?低至[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
    const proFlashMatch =
      cleanHtml.match(/[¥￥]([0-9]+(?:\.[0-9]+)?)\/1?(?:个)?月.{0,1500}?官网折扣价[^¥￥0-9]*[¥￥]200(?:[^0-9]|$)/i) ||
      cleanHtml.match(/Pro(?:高级)?套餐[^0-9]{0,500}?([0-9]+(?:\.[0-9]+)?)\/1?(?:个)?月/i);

    const entryScriptMatch = html.match(/cloud-assets\.alicdn\.com\/lowcode\/entry\/prod\/[^\"'\s]+\.js/i);
    const entryScriptUrl = entryScriptMatch
      ? `https://${entryScriptMatch[0]}`
      : null;
    let entryFirstMonthPrices = [];
    if (entryScriptUrl) {
      try {
        const entryText = await fetchText(entryScriptUrl);
        const entryPlain = decodeHtml(entryText).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        entryFirstMonthPrices = [...entryPlain.matchAll(/首月\s*([0-9]+(?:\.[0-9]+)?)\s*元/g)]
          .map((match) => Number(match[1]))
          .filter((value) => Number.isFinite(value));
      } catch {
        entryFirstMonthPrices = [];
      }
    }

    const fallbackLite = entryFirstMonthPrices.find((value) => value > 0 && value <= 20) || null;
    const fallbackPro = entryFirstMonthPrices.find((value) => value > 20 && value <= 80) || null;

    const flashPriceByTier = new Map([
      ["Lite", liteFlashMatch ? Number(liteFlashMatch[1]) : fallbackLite],
      ["Pro", proFlashMatch ? Number(proFlashMatch[1]) : fallbackPro],
    ]);

    const plans = [];
    for (const planDef of planDefs) {
      const payload = await fetchJson(queryPriceUrl, {
        method: "POST",
        headers: {
          ...COMMON_HEADERS,
          accept: "application/json, text/plain, */*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://www.aliyun.com",
          referer: pageUrl,
        },
        body: `param=${encodeURIComponent(JSON.stringify(buildAliyunPriceParam(planDef)))}`,
      });
      if (!payload || payload.success !== true || String(payload.code) !== "200") {
        continue;
      }
      const articleItem = payload?.data?.articleItemResults?.[0] || null;
      if (!articleItem) {
        continue;
      }
      const moduleResult =
        articleItem?.moduleResults?.find((item) => item?.moduleCode === "subscription_type") ||
        articleItem?.moduleResults?.[0] ||
        null;
      const discountedCents = Number(
        moduleResult?.price?.discountedUnitPrice ??
        moduleResult?.price?.discountedPrice ??
        articleItem?.price?.discountedUnitPrice ??
        articleItem?.price?.discountedPrice,
      );
      const listCents = Number(
        moduleResult?.price?.unitPrice ??
        moduleResult?.depreciateInfo?.listPrice ??
        articleItem?.price?.unitPrice ??
        articleItem?.depreciateInfo?.listPrice,
      );
      const currentAmount = centToYuan(discountedCents);
      const originalAmount = centToYuan(listCents);
      if (!Number.isFinite(currentAmount)) {
        continue;
      }
      const promoLabel = normalizeText(payload?.data?.promotionLabelInfo?.common?.display?.join(" ")) || null;
      const activityName =
        normalizeText(moduleResult?.depreciateInfo?.finalActivity?.activityName || articleItem?.name || "") || null;
      const flashSaleAmount = flashPriceByTier.get(planDef.tier) ?? null;
      const finalCurrentAmount = flashSaleAmount || currentAmount;
      const originalCandidate = Number.isFinite(originalAmount) ? originalAmount : currentAmount;
      const tierFallbackOriginal = planDef.tier === "Pro" ? 200 : planDef.tier === "Lite" ? 40 : null;
      const fallbackOriginal = Number.isFinite(tierFallbackOriginal)
        ? Math.max(tierFallbackOriginal, originalCandidate)
        : Math.max(currentAmount, originalCandidate);
      const finalOriginalAmount = flashSaleAmount ? fallbackOriginal : originalAmount;

      plans.push(
        asPlan({
          name: `Coding Plan ${planDef.tier}`,
          currentPrice: finalCurrentAmount,
          currentPriceText: `¥${finalCurrentAmount}/月`,
          originalPrice: finalOriginalAmount > finalCurrentAmount ? finalOriginalAmount : null,
          originalPriceText: finalOriginalAmount > finalCurrentAmount ? `¥${finalOriginalAmount}/月` : null,
          unit: "月",
          notes: flashSaleAmount ? `新客首月 ${flashSaleAmount}元` : (promoLabel || null),
          serviceDetails: serviceDetailsByTier.get(planDef.tier) || (activityName ? [activityName] : null),
        }),
      );
    }

    if (plans.length > 0) {
      return {
        provider: PROVIDER_IDS.ALIYUN,
        sourceUrls: [pageUrl],
        fetchedAt: new Date().toISOString(),
        plans,
      };
    }
    throw new Error("Aliyun fetch returned no plans");
  } catch (error) {
    console.warn(`[pricing] aliyun fetch failed: ${error.message}. Returning fallback.`);
    return {
      provider: PROVIDER_IDS.ALIYUN,
      sourceUrls: [pageUrl],
      fetchedAt: new Date().toISOString(),
      plans: [
        asPlan({
          name: "Coding Plan Lite",
          currentPrice: 7.9,
          currentPriceText: "¥7.9/月",
          originalPrice: 40,
          originalPriceText: "¥40/月",
          unit: "月",
          notes: "新客首月 7.9元",
          serviceDetails: [
            "能力: 支持 Qwen3.5-Plus、Qwen3-Max、Qwen3-Coder-Next、Qwen3-Coder-Plus 等级",
            "场景: 面向处理轻量级工作负载的个人开发者",
            "工具: Qwen Code、OpenClaw、OpenCode、Claude Code插件、Codex、Cline、Cursor等",
          ],
        }),
        asPlan({
          name: "Coding Plan Pro",
          currentPrice: 39.9,
          currentPriceText: "¥39.9/月",
          originalPrice: 200,
          originalPriceText: "¥200/月",
          unit: "月",
          notes: "新客首月 39.9元",
          serviceDetails: [
            "能力: 包含 Lite 套餐的全部能力与权益",
            "额度: 用量是 Lite 版的 5 倍",
            "场景: 适合大型开发任务，专业级 AI 编程体验",
          ],
        }),
      ],
    };
  }
}

function parseAliyunServiceDetailsFromPageHtml(html) {
  const detailsByTier = new Map();
  const candidates = [];
  const listRegex = /<ul class="[^"]*feature-list[^"]*">([\s\S]*?)<\/ul>/gi;
  let listMatch;
  while ((listMatch = listRegex.exec(html)) !== null) {
    const listHtml = listMatch[1];
    const features = [];
    const featureRegex = /class="[^"]*feature-label[^"]*">([^<]+)<\/span>[\s\S]*?class="[^"]*feature-desc[^"]*">([^<]+)<\/span>/gi;
    let featureMatch;
    while ((featureMatch = featureRegex.exec(listHtml)) !== null) {
      const label = normalizeText(featureMatch[1]);
      const desc = normalizeText(featureMatch[2]);
      if (!label || !desc) {
        continue;
      }
      features.push(`${label}: ${desc}`);
    }
    if (features.length === 0) {
      continue;
    }
    const prefix = html.slice(Math.max(0, listMatch.index - 1800), listMatch.index);
    candidates.push({
      features: normalizeServiceDetails(features),
      hasOnlyTwoTenthsOff: /首月仅2折/.test(prefix),
      hasSavePercent: /立省\d+%/.test(prefix),
    });
  }

  for (const candidate of candidates) {
    if (!candidate.features || candidate.features.length === 0) {
      continue;
    }
    const featureText = candidate.features.join(" ");
    if (/权益:|额度:|Lite\s*套餐|Lite\s*版/.test(featureText) || candidate.hasSavePercent) {
      detailsByTier.set("Pro", candidate.features);
      continue;
    }
    if (/能力:/.test(featureText) || /工具:/.test(featureText) || candidate.hasOnlyTwoTenthsOff) {
      detailsByTier.set("Lite", candidate.features);
    }
  }

  const unassigned = candidates.map((item) => item.features).filter(Boolean);
  if (!detailsByTier.get("Lite") && unassigned[0]) {
    detailsByTier.set("Lite", unassigned[0]);
  }
  if (!detailsByTier.get("Pro") && unassigned[1]) {
    detailsByTier.set("Pro", unassigned[1]);
  }

  return detailsByTier;
}

module.exports = parseAliyunCodingPlans;
