"use strict";

const {
  PROVIDER_IDS,
  fetchText,
  extractRows,
  formatAmount,
  normalizeText,
  buildServiceDetailsFromRows,
  asPlan,
  dedupePlans,
} = require("../utils");

/**
 * Fallback data for Baidu when parsing fails
 * @returns {Object} Fallback provider data
 */
function getFallbackData() {
  return {
    provider: PROVIDER_IDS.BAIDU,
    sourceUrls: ["https://cloud.baidu.com/product/codingplan.html"],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Coding Plan Lite",
        currentPriceText: "40元/月",
        currentPrice: 40,
        unit: "月",
        notes: "新客首月 7.9元",
        serviceDetails: [
          "每 5 小时限额: 最多1200次请求",
          "每周限额: 最多9000次请求",
          "每月限额: 最多18000次请求",
          "支持模型: GLM-5、Kimi-K2.5、MiniMax-M2.1、DeepSeek-V3.2等",
        ],
      }),
      asPlan({
        name: "Coding Plan Pro",
        currentPriceText: "200元/月",
        currentPrice: 200,
        unit: "月",
        notes: "新客首月 39.9元",
        serviceDetails: [
          "每 5 小时限额: 最多6000次请求",
          "每周限额: 最多45000次请求",
          "每月限额: 最多90000次请求",
          "支持模型: GLM-5、Kimi-K2.5、MiniMax-M2.1、DeepSeek-V3.2等",
        ],
      }),
    ],
  };
}

async function parseBaiduCodingPlans() {
  const pageUrl = "https://cloud.baidu.com/product/codingplan.html";
  try {
    const html = await fetchText(pageUrl);

    const firstMonthByTier = new Map();
    const firstMonthRegex =
      /Coding\s*Plan\s*(Lite|Pro)[\s\S]{0,500}?<span[^>]*>\s*([0-9]+(?:\.[0-9]+)?)\s*<\/span>[\s\S]{0,120}?\/首月/gi;
    let firstMonthMatch;
    while ((firstMonthMatch = firstMonthRegex.exec(html)) !== null) {
      firstMonthByTier.set(firstMonthMatch[1], firstMonthMatch[2]);
    }

    const renewalByFirstMonth = new Map();
    const renewalRegex = /新客\s*([0-9]+(?:\.[0-9]+)?)\s*元\s*\/\s*首月\s*，\s*续费\s*([0-9]+(?:\.[0-9]+)?)\s*元\s*\/\s*月/gi;
    let renewalMatch;
    while ((renewalMatch = renewalRegex.exec(html)) !== null) {
      renewalByFirstMonth.set(renewalMatch[1], renewalMatch[2]);
    }
    const serviceDetailsByTier = new Map();
    const rows = extractRows(html);
    const planHeaderIndex = rows.findIndex(
      (row) => /coding\s*plan\s*lite/i.test(row.join(" ")) && /coding\s*plan\s*pro/i.test(row.join(" ")),
    );
    if (planHeaderIndex >= 0) {
      const planHeaderRow = rows[planHeaderIndex];
      const tierColumns = new Map();
      for (let column = 0; column < planHeaderRow.length; column += 1) {
        const value = normalizeText(planHeaderRow[column]);
        if (/coding\s*plan\s*lite/i.test(value)) {
          tierColumns.set("Lite", column);
        } else if (/coding\s*plan\s*pro/i.test(value)) {
          tierColumns.set("Pro", column);
        }
      }
      for (const tier of ["Lite", "Pro"]) {
        const column = tierColumns.get(tier);
        if (!Number.isInteger(column)) {
          continue;
        }
        const serviceRows = [];
        for (let rowIndex = planHeaderIndex + 1; rowIndex < rows.length; rowIndex += 1) {
          const rowLabel = normalizeText(rows[rowIndex]?.[0] || "");
          if (rowLabel === "开始使用") {
            break;
          }
          serviceRows.push(rows[rowIndex]);
        }
        const details = buildServiceDetailsFromRows(serviceRows, column, { excludeLabels: ["套餐价格"] });
        if (details) {
          serviceDetailsByTier.set(tier, details);
        }
      }
    }

    const plans = [];
    for (const tier of ["Lite", "Pro"]) {
      const firstMonth = firstMonthByTier.get(tier) || null;
      let renewal = firstMonth ? renewalByFirstMonth.get(firstMonth) || null : null;
      if (!renewal) {
        const tierRenewal = html.match(
          new RegExp(
            `Coding\\s*Plan\\s*${tier}[\\s\\S]{0,2400}?续费\\s*([0-9]+(?:\\.[0-9]+)?)\\s*元\\s*\\/\\s*月`,
            "i",
          ),
        );
        renewal = tierRenewal?.[1] || null;
      }
      const renewalAmount = renewal ? Number(renewal) : null;
      if (!Number.isFinite(renewalAmount)) {
        continue;
      }

      plans.push(
        asPlan({
          name: `Coding Plan ${tier}`,
          currentPriceText: `${formatAmount(renewalAmount)}元/月`,
          currentPrice: renewalAmount,
          unit: "月",
          notes: firstMonth ? `新客首月 ${firstMonth}元` : null,
          serviceDetails: serviceDetailsByTier.get(tier) || null,
        }),
      );
    }

    if (plans.length === 0) {
      throw new Error("Unable to parse Baidu coding plan standard monthly prices");
    }

    return {
      provider: PROVIDER_IDS.BAIDU,
      sourceUrls: [pageUrl],
      fetchedAt: new Date().toISOString(),
      plans: dedupePlans(plans),
    };
  } catch (error) {
    console.warn(`[pricing] Baidu fetch failed: ${error.message}. Returning fallback.`);
    return getFallbackData();
  }
}

module.exports = parseBaiduCodingPlans;
