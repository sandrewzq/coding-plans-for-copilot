"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
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
        currentPriceText: "¥7.9/月",
        currentPrice: 7.9,
        originalPriceText: "¥40/月",
        originalPrice: 40,
        unit: "月",
        notes: "新客首月 7.9",
        serviceDetails: [
          "每月最多18,000次请求",
          "适配Claude Code等AI开发工具",
          "GLM-5、MiniMax-M2.5等模型",
        ],
      }),
      asPlan({
        name: "Coding Plan Pro",
        currentPriceText: "¥39.9/月",
        currentPrice: 39.9,
        originalPriceText: "¥200/月",
        originalPrice: 200,
        unit: "月",
        notes: "新客首月 39.9",
        serviceDetails: [
          "每月最多90,000次请求",
          "适配Claude Code等AI开发工具",
          "GLM-5、MiniMax-M2.5等模型",
        ],
      }),
    ],
  };
}

/**
 * Parse prices from HTML using the specific class pattern
 * @param {string} html - Page HTML content
 * @returns {Map<string, {firstMonth: number, renewal: number}>} Price info by tier
 */
function parsePricesFromHtml(html) {
  const priceInfoByTier = new Map();
  
  // Find prices using the specific class pattern from browser inspection
  // Pattern: class="NTV6xJko">7.9</span>
  const pricePattern = /class="[^"]*NTV6xJko[^"]*">([0-9]+(?:\.[0-9]+)?)</g;
  const prices = [];
  let match;
  while ((match = pricePattern.exec(html)) !== null) {
    prices.push(Number(match[1]));
  }
  
  // Also try to find renewal prices
  // Look for prices in the context of "续费" or near the original price display
  const renewalPattern = /续费\s*([0-9]+(?:\.[0-9]+)?)\s*元/g;
  const renewalPrices = [];
  while ((match = renewalPattern.exec(html)) !== null) {
    renewalPrices.push(Number(match[1]));
  }
  
  // If we found prices with the class pattern, assign them to tiers
  if (prices.length >= 2) {
    // First price is Lite, second is Pro
    priceInfoByTier.set("Lite", {
      firstMonth: prices[0],
      renewal: renewalPrices[0] || 40,
    });
    priceInfoByTier.set("Pro", {
      firstMonth: prices[1],
      renewal: renewalPrices[1] || 200,
    });
  }
  
  return priceInfoByTier;
}

async function parseBaiduCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.BAIDU, readmePath);
  try {
    const html = await fetchText(pageUrl);

    // Parse prices from HTML
    const priceInfoByTier = parsePricesFromHtml(html);
    
    // If HTML parsing didn't work, try the old pattern
    if (priceInfoByTier.size === 0) {
      // Fallback: Look for "新客 XX 元 / 首月 ， 续费 YY 元 / 月" pattern
      const priceRegex = /新客\s*([0-9]+(?:\.[0-9]+)?)\s*元\s*\/\s*首月\s*，\s*续费\s*([0-9]+(?:\.[0-9]+)?)\s*元\s*\/\s*月/gi;
      let priceMatch;
      const pricePairs = [];
      while ((priceMatch = priceRegex.exec(html)) !== null) {
        pricePairs.push({
          firstMonth: Number(priceMatch[1]),
          renewal: Number(priceMatch[2]),
        });
      }

      // Assign price pairs to tiers (Lite first, then Pro)
      if (pricePairs.length >= 2) {
        priceInfoByTier.set("Lite", pricePairs[0]);
        priceInfoByTier.set("Pro", pricePairs[1]);
      } else if (pricePairs.length === 1) {
        priceInfoByTier.set("Lite", pricePairs[0]);
      }
    }

    // Parse service details from table
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

    // If we couldn't parse prices from HTML, use fallback
    if (priceInfoByTier.size === 0) {
      console.warn("[pricing] Baidu: Could not parse prices from HTML, using fallback");
      return getFallbackData();
    }

    const plans = [];
    for (const tier of ["Lite", "Pro"]) {
      const priceInfo = priceInfoByTier.get(tier);
      if (!priceInfo) {
        continue;
      }

      plans.push(
        asPlan({
          name: `Coding Plan ${tier}`,
          currentPriceText: `¥${formatAmount(priceInfo.firstMonth)}/月`,
          currentPrice: priceInfo.firstMonth,
          originalPriceText: `¥${formatAmount(priceInfo.renewal)}/月`,
          originalPrice: priceInfo.renewal,
          unit: "月",
          notes: `新客首月 ${priceInfo.firstMonth}`,
          serviceDetails: serviceDetailsByTier.get(tier) || null,
        }),
      );
    }

    if (plans.length === 0) {
      throw new Error("Unable to parse Baidu coding plan prices");
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
