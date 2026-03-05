"use strict";

const {
  PROVIDER_IDS,
  fetchText,
  normalizeText,
  normalizeServiceDetails,
  formatAmount,
  asPlan,
  absoluteUrl,
  unique,
  dedupePlans,
} = require("../utils");

function extractPlanBlocks(source) {
  const blocks = [];
  let index = source.indexOf("{id:\"");
  while (index >= 0) {
    const start = index;
    let depth = 0;
    let end = -1;
    for (let i = start; i < source.length; i += 1) {
      const char = source[i];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end > start) {
      blocks.push(source.slice(start, end));
    }
    index = source.indexOf("{id:\"", start + 1);
  }
  return blocks;
}

function extractStringValue(block, key) {
  const match = block.match(new RegExp(`${key}:"([^"]+)"`));
  return match ? match[1] : null;
}

function extractNumberValue(block, key) {
  if (!block) {
    return null;
  }
  const match = block.match(new RegExp(`${key}:([0-9]+(?:\\.[0-9]+)?)`));
  return match ? Number(match[1]) : null;
}

function extractObjectBlock(block, key) {
  const keyIndex = block.indexOf(`${key}:{`);
  if (keyIndex < 0) {
    return null;
  }
  const start = block.indexOf("{", keyIndex);
  if (start < 0) {
    return null;
  }
  let depth = 0;
  for (let i = start; i < block.length; i += 1) {
    const char = block[i];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return block.slice(start, i + 1);
      }
    }
  }
  return null;
}

function extractArrayItems(block, key) {
  const keyIndex = block.indexOf(`${key}:[`);
  if (keyIndex < 0) {
    return [];
  }
  const start = block.indexOf("[", keyIndex);
  if (start < 0) {
    return [];
  }
  let depth = 0;
  let end = -1;
  for (let i = start; i < block.length; i += 1) {
    const char = block[i];
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) {
    return [];
  }
  const content = block.slice(start + 1, end);
  const items = [...content.matchAll(/"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'/g)]
    .map((match) => normalizeText(match[1] || match[2] || ""))
    .filter(Boolean);
  return unique(items);
}

async function parseXAioCodingPlans() {
  const pageUrl = "https://code.x-aio.com/";
  const html = await fetchText(pageUrl);
  const appPath = html.match(/\/assets\/index-[^"'\s]+\.js/i)?.[0];
  if (!appPath) {
    throw new Error("Unable to locate X-AIO app script");
  }
  const appUrl = absoluteUrl(appPath, pageUrl);
  const appJs = await fetchText(appUrl);

  const planBlocks = extractPlanBlocks(appJs)
    .filter((block) => ["lite", "pro", "max"].includes(String(extractStringValue(block, "id") || "").toLowerCase()));

  const plans = [];
  for (const block of planBlocks) {
    const name = normalizeText(extractStringValue(block, "name") || "");
    const nameCn = normalizeText(extractStringValue(block, "nameCN") || "");
    const description = normalizeText(extractStringValue(block, "description") || "");
    const priceBlock = extractObjectBlock(block, "price");
    const promoBlock = extractObjectBlock(block, "promo");
    const monthlyPrice = extractNumberValue(priceBlock, "monthly");
    if (!Number.isFinite(monthlyPrice)) {
      continue;
    }

    const promoMonthly = extractNumberValue(promoBlock, "monthly");
    const currentMonthly = Number.isFinite(promoMonthly) ? promoMonthly : monthlyPrice;
    const originalMonthly =
      Number.isFinite(promoMonthly) && Number.isFinite(monthlyPrice) && promoMonthly < monthlyPrice
        ? monthlyPrice
        : null;

    const features = extractArrayItems(block, "features");
    const serviceDetails = normalizeServiceDetails([
      description ? `适用场景: ${description}` : null,
      ...features,
    ]);

    // X-AIO 已取消首购优惠，仅保留邀请码优惠
    const notes = null;

    plans.push(
      asPlan({
        name: nameCn ? `${name}（${nameCn}）` : name,
        currentPriceText: `¥${formatAmount(currentMonthly)}/月`,
        currentPrice: currentMonthly,
        originalPriceText: originalMonthly ? `¥${formatAmount(originalMonthly)}/月` : null,
        originalPrice: originalMonthly,
        unit: "月",
        notes,
        serviceDetails,
      }),
    );
  }

  if (plans.length === 0) {
    throw new Error("Unable to parse X-AIO coding plan standard monthly prices");
  }

  return {
    provider: PROVIDER_IDS.XAIO,
    sourceUrls: [pageUrl, appUrl],
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
}

module.exports = parseXAioCodingPlans;
