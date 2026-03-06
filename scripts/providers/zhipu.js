"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
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
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.ZHIPU, readmePath);
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
  const nextModuleMatch = pricingChunkText.slice(moduleStart + 1).match(/},"[0-9a-z]{4,6}":function/i);
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
    // Extract tier-specific service details from subscription page HTML
    // The service content is embedded in the page as JSON data
    const tierServiceMap = new Map();

    // Method 1: Try to extract from page HTML directly
    // Look for service descriptions in the HTML structure
    const serviceDescRegex = /"serviceDescriptions":\[([^\]]+)\]/g;
    let descMatch;
    const allServiceLists = [];
    while ((descMatch = serviceDescRegex.exec(html)) !== null) {
      const items = descMatch[1].match(/"([^"]+)"/g);
      if (items && items.length > 0) {
        const services = items.map(s => s.replace(/"/g, '')).filter(s => s.trim());
        if (services.length > 0) {
          allServiceLists.push(services);
        }
      }
    }

    // Map service lists to tiers based on content
    if (allServiceLists.length >= 3) {
      // Lite: contains "Claude Pro 套餐的" and "轻量级"
      // Pro: contains "Lite 套餐的" and "复杂工作负载"
      // Max: contains "Pro 套餐的" and "海量工作负载"
      for (const services of allServiceLists) {
        const content = services.join(' ');
        if (content.includes('Claude Pro 套餐的') && content.includes('轻量级')) {
          tierServiceMap.set('Lite', services);
        } else if (content.includes('Lite 套餐的') && content.includes('复杂工作负载')) {
          tierServiceMap.set('Pro', services);
        } else if (content.includes('Pro 套餐的') && content.includes('海量工作负载')) {
          tierServiceMap.set('Max', services);
        }
      }
    }

    // Method 2: If not found in HTML, try to extract from JS chunks
    if (tierServiceMap.size < 3) {
      // Look for the service content patterns in the pricing chunk
      // The pattern is like: "Claude Pro 套餐的 3倍 用量","面向处理轻量级工作负载的个人开发者"
      const servicePattern = /"(Claude Pro 套餐的 \d+倍 用量|Lite 套餐的 \d+倍 用量|Pro 套餐的 \d+倍 用量)"[,，]"(面向处理[^"]+的个人开发者)"[,，]"([^"]+)"/g;

      // Also look for the full service arrays
      const litePattern = /"(Claude Pro 套餐的 \d+倍 用量)"[,，]"(面向处理轻量级工作负载的个人开发者)"[,，]("[^"]+"[,，]?)+/;
      const proPattern = /"(Lite 套餐的 \d+倍 用量)"[,，]"(面向处理复杂工作负载的个人开发者)"[,，]("[^"]+"[,，]?)+/;
      const maxPattern = /"(Pro 套餐的 \d+倍 用量)"[,，]"(面向处理海量工作负载的个人开发者)"[,，]("[^"]+"[,，]?)+/;

      const extractServicesFromMatch = (match) => {
        if (!match) {return [];}
        const fullMatch = match[0];
        const services = [];
        const itemRegex = /"([^"]{10,})"/g;
        let item;
        while ((item = itemRegex.exec(fullMatch)) !== null) {
          const service = item[1].trim();
          if (service && !services.includes(service)) {
            services.push(service);
          }
        }
        return services;
      };

      if (!tierServiceMap.has('Lite')) {
        const liteMatch = pricingChunkText.match(litePattern) || html.match(litePattern);
        if (liteMatch) {
          const services = extractServicesFromMatch(liteMatch);
          if (services.length > 0) {tierServiceMap.set('Lite', services);}
        }
      }

      if (!tierServiceMap.has('Pro')) {
        const proMatch = pricingChunkText.match(proPattern) || html.match(proPattern);
        if (proMatch) {
          const services = extractServicesFromMatch(proMatch);
          if (services.length > 0) {tierServiceMap.set('Pro', services);}
        }
      }

      if (!tierServiceMap.has('Max')) {
        const maxMatch = pricingChunkText.match(maxPattern) || html.match(maxPattern);
        if (maxMatch) {
          const services = extractServicesFromMatch(maxMatch);
          if (services.length > 0) {tierServiceMap.set('Max', services);}
        }
      }
    }

    // Method 3: Extract from HTML using DOM patterns observed in browser
    if (tierServiceMap.size < 3) {
      // Look for the service list items in the HTML
      // Pattern: <li>服务内容</li> within each tier's card section
      const cardServiceRegex = /GLM Coding (Lite|Pro|Max)[\s\S]*?<li[^>]*>(面向处理[^<]+)<\/li>/gi;
      let cardMatch;
      while ((cardMatch = cardServiceRegex.exec(html)) !== null) {
        const tier = cardMatch[1];
        if (tierServiceMap.has(tier)) {continue;}

        // Extract all <li> items following this tier's card
        const cardStart = cardMatch.index;
        const cardEnd = html.indexOf('GLM Coding', cardStart + 10);
        const cardSection = html.slice(cardStart, cardEnd > 0 ? cardEnd : cardStart + 2000);

        const services = [];
        const liRegex = /<li[^>]*>([^<]+)<\/li>/g;
        let liMatch;
        while ((liMatch = liRegex.exec(cardSection)) !== null) {
          const service = liMatch[1].trim();
          if (service && service.length > 5 && !services.includes(service)) {
            services.push(service);
          }
        }

        if (services.length > 0) {
          tierServiceMap.set(tier, services);
        }
      }
    }

    // Fallback: manually define based on known structure if parsing fails
    if (tierServiceMap.size < 3) {
      tierServiceMap.set("Lite", [
        "Claude Pro 套餐的 3倍 用量",
        "面向处理轻量级工作负载的个人开发者",
        "新模型/功能持续更新",
        "适用于 Claude Code 等 20+编程工具"
      ]);
      tierServiceMap.set("Pro", [
        "Lite 套餐的 5倍 用量",
        "面向处理复杂工作负载的个人开发者",
        "享受 Lite 套餐所有权益",
        "新模型/功能优先升级",
        "生成速度高于 Lite",
        "视觉理解、联网搜索/读取、开源仓库 MCP"
      ]);
      tierServiceMap.set("Max", [
        "Pro 套餐的 4倍 用量",
        "面向处理海量工作负载的个人开发者",
        "享受 Pro 套餐所有权益",
        "新模型/功能首发升级",
        "用量高峰优先保障"
      ]);
    }

    // Now get usage limits from docs page and merge with service content
    const docsHtml = await fetchText(docsUrl);
    const docsRows = extractRows(docsHtml);
    const headerRow = docsRows.find((row) => normalizeText(row?.[0] || "") === "套餐类型" && row.length >= 3) || null;

    if (headerRow) {
      for (const row of docsRows) {
        const tierMatch = normalizeText(row?.[0] || "").match(/^(Lite|Pro|Max)\s*套餐$/i);
        if (!tierMatch) {
          continue;
        }
        const tier = tierMatch[1];
        const tierServices = tierServiceMap.get(tier) || [];
        const tierServiceDetails = [...tierServices];

        // Add usage limits from table
        for (let column = 1; column < Math.min(headerRow.length, row.length); column += 1) {
          const label = normalizeText(headerRow[column]);
          const value = normalizeText(row[column]);
          if (!label || !value) {
            continue;
          }
          tierServiceDetails.push(`${label}: ${value}`);
        }
        serviceDetailsByTier.set(tier, normalizeServiceDetails(tierServiceDetails));
      }
    }

    // If no table data, use just the service content
    if (serviceDetailsByTier.size === 0) {
      for (const [tier, services] of tierServiceMap) {
        serviceDetailsByTier.set(tier, normalizeServiceDetails(services));
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
