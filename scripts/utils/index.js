#!/usr/bin/env node

"use strict";

/**
 * @fileoverview Utility functions for provider pricing data fetching and processing.
 * This module provides common utilities for HTML parsing, text normalization,
 * currency detection, and HTTP requests.
 */

const { AsyncLocalStorage } = require("node:async_hooks");

/**
 * HTML entity mappings for decoding
 * @constant {Object.<string, string>}
 */
const HTML_ENTITIES = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": "\"",
  "&#39;": "'",
  "&nbsp;": " ",
  "&yen;": "¥",
  "&reg;": "®",
};

/**
 * Regex pattern for detecting CNY currency indicators
 * @constant {RegExp}
 */
const CNY_CURRENCY_HINT = /(¥|￥|元|人民币|\b(?:CNY|RMB)\b)/i;

/**
 * Regex pattern for detecting USD currency indicators
 * @constant {RegExp}
 */
const USD_CURRENCY_HINT = /(\$|\b(?:USD|US\$)\b|美元|dollar)/i;

/**
 * Common HTTP headers for requests
 * @constant {Object.<string, string>}
 */
const COMMON_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
};

/**
 * AsyncLocalStorage for request context propagation
 * @constant {AsyncLocalStorage}
 */
const REQUEST_CONTEXT = new AsyncLocalStorage();

/**
 * Default request timeout in milliseconds
 * @constant {number}
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Provider ID constants
 * @constant {Object.<string, string>}
 */
const PROVIDER_IDS = {
  ZHIPU: "zhipu-ai",
  KIMI: "kimi-ai",
  MINIMAX: "minimax-ai",
  ALIYUN: "aliyun-ai",
  VOLCENGINE: "volcengine-ai",
  KWAIKAT: "kwaikat-ai",
  BAIDU: "baidu-qianfan-ai",
  INFINI: "infini-ai",
  COMPSHARE: "compshare-ai",
  MTHREADS: "mthreads-ai",
  XAIO: "x-aio",
  ZENMUX: "zenmux-ai",
};

/**
 * Provider display names mapping
 * @constant {Object.<string, string>}
 */
const PROVIDER_NAMES = {
  [PROVIDER_IDS.ZHIPU]: "智谱",
  [PROVIDER_IDS.KIMI]: "Kimi",
  [PROVIDER_IDS.MINIMAX]: "MiniMax",
  [PROVIDER_IDS.ALIYUN]: "阿里云百炼",
  [PROVIDER_IDS.VOLCENGINE]: "火山引擎",
  [PROVIDER_IDS.KWAIKAT]: "快手 KwaiKAT",
  [PROVIDER_IDS.BAIDU]: "百度智能云千帆",
  [PROVIDER_IDS.INFINI]: "无问芯穹",
  [PROVIDER_IDS.COMPSHARE]: "优云智算",
  [PROVIDER_IDS.MTHREADS]: "摩尔线程",
  [PROVIDER_IDS.XAIO]: "X-AIO",
  [PROVIDER_IDS.ZENMUX]: "Zenmux",
};

/**
 * Default provider URLs - used as fallback when README parsing fails
 * These should match the URLs in README.md
 * @constant {Object.<string, string>}
 */
const PROVIDER_URLS = {
  [PROVIDER_IDS.ZHIPU]: "https://www.bigmodel.cn/glm-coding?ic=BZRLCDAC1G",
  [PROVIDER_IDS.KIMI]: "https://www.kimi.com/code/zh",
  [PROVIDER_IDS.MINIMAX]: "https://platform.minimaxi.com/subscribe/coding-plan",
  [PROVIDER_IDS.ALIYUN]: "https://www.aliyun.com/benefit/scene/codingplan",
  [PROVIDER_IDS.VOLCENGINE]: "https://volcengine.com/L/AJgcLIP_-o4/",
  [PROVIDER_IDS.KWAIKAT]: "https://www.streamlake.com/marketing/coding-plan",
  [PROVIDER_IDS.BAIDU]: "https://cloud.baidu.com/product/codingplan.html",
  [PROVIDER_IDS.INFINI]: "https://cloud.infini-ai.com/platform/ai",
  [PROVIDER_IDS.COMPSHARE]: "https://www.compshare.cn/docs/modelverse/package_plan/package",
  [PROVIDER_IDS.MTHREADS]: "https://code.mthreads.com/",
  [PROVIDER_IDS.XAIO]: "https://code.x-aio.com/",
  [PROVIDER_IDS.ZENMUX]: "https://zenmux.ai/pricing/subscription",
};

/**
 * Gets the URL for a provider
 * First tries to parse from README.md, falls back to PROVIDER_URLS
 * @param {string} providerId - The provider ID
 * @param {string} [readmePath] - Path to README.md (for Node.js environment)
 * @returns {string} The provider URL
 */
function getProviderUrl(providerId, readmePath = null) {
  // If readmePath is provided, try to parse from README
  if (readmePath && typeof require !== "undefined") {
    try {
      const fs = require("fs");
      const path = require("path");
      const readmeContent = fs.readFileSync(readmePath, "utf-8");
      const providerName = PROVIDER_NAMES[providerId];
      if (providerName) {
        // Match table row: | 智谱 | https://... |
        const regex = new RegExp(`\\|\\s*${providerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|\\s*(https?://[^\\s|]+)\\s*\\|`, "i");
        const match = readmeContent.match(regex);
        if (match) {
          return match[1].trim();
        }
      }
    } catch {
      // Fall through to default
    }
  }
  return PROVIDER_URLS[providerId] || "";
}

/**
 * Decodes HTML entities in a string
 * @param {string} value - The string to decode
 * @returns {string} The decoded string
 * @example
 * decodeHtml("&lt;div&gt;Hello&lt;/div&gt;") // returns "<div>Hello</div>"
 */
function decodeHtml(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/&(lt|gt|amp|quot|#39|nbsp);/g, (match) => HTML_ENTITIES[match] || match)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Removes HTML tags from a string
 * @param {string} value - The string containing HTML
 * @returns {string} The string without HTML tags
 * @example
 * stripTags("<p>Hello <b>World</b></p>") // returns "Hello World"
 */
function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "));
}

/**
 * Normalizes text by decoding HTML entities, unicode literals, and whitespace
 * @param {string} value - The text to normalize
 * @returns {string} The normalized text
 */
function normalizeText(value) {
  return decodeHtml(decodeUnicodeLiteral(String(value || "")).replace(/\s+/g, " ")).trim();
}

/**
 * Decodes unicode escape sequences (\uXXXX) in a string
 * @param {string} value - The string containing unicode escapes
 * @returns {string} The decoded string
 * @example
 * decodeUnicodeLiteral("\\u4e2d\\u6587") // returns "中文"
 */
function decodeUnicodeLiteral(value) {
  return String(value || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  );
}

/**
 * Checks if a text appears to contain price information
 * @param {string} text - The text to check
 * @returns {boolean} True if the text looks like a price
 */
function isPriceLike(text) {
  const value = normalizeText(text);
  if (!value) {
    return false;
  }
  if (/(免费|free|0\s*成本)/i.test(value)) {
    return true;
  }
  if (!/\d/.test(value)) {
    return false;
  }
  return /(¥|￥|元|首月|\/\s*[年月日次])/i.test(value);
}

/**
 * Parses price text to extract amount, text, and unit
 * @param {string} text - The price text to parse
 * @returns {Object} Object containing amount, text, and unit
 * @returns {number|null} returns.amount - The numeric amount
 * @returns {string|null} returns.text - The normalized text
 * @returns {string|null} returns.unit - The time unit (月/年/日等)
 * @example
 * parsePriceText("¥99/月") // returns { amount: 99, text: "¥99/月", unit: "月" }
 */
function parsePriceText(text) {
  const value = normalizeText(text);
  if (!value) {
    return {
      amount: null,
      text: null,
      unit: null,
    };
  }
  if (/(免费|free|0\s*成本)/i.test(value)) {
    return {
      amount: 0,
      text: value,
      unit: null,
    };
  }
  const numberMatch = value.match(/([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/);
  const amount = numberMatch ? Number(numberMatch[1].replace(/,/g, "")) : null;
  const unitMatch = value.match(/\/\s*([^\s)）]+)/);
  const unit = unitMatch ? unitMatch[1].trim() : null;
  return {
    amount: Number.isFinite(amount) ? amount : null,
    text: value,
    unit,
  };
}

/**
 * Compacts inline text by normalizing whitespace
 * @param {string} value - The text to compact
 * @returns {string} The compacted text
 */
function compactInlineText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

/**
 * Detects currency type from text
 * @param {string} text - The text to analyze
 * @param {string} [fallback="USD"] - The fallback currency if detection fails
 * @returns {string} The detected currency ("CNY" or "USD")
 */
function detectCurrencyFromText(text, fallback = "USD") {
  const value = compactInlineText(text);
  if (!value) {
    return fallback;
  }
  if (CNY_CURRENCY_HINT.test(value)) {
    return "CNY";
  }
  if (USD_CURRENCY_HINT.test(value)) {
    return "USD";
  }
  return fallback;
}

/**
 * Normalizes money text based on detected currency
 * @param {string} rawValue - The raw money text
 * @param {string} [fallbackCurrency="USD"] - Fallback currency for normalization
 * @returns {string|null} The normalized money text
 * @example
 * normalizeMoneyTextByCurrency("99元/月", "CNY") // returns "¥99/月"
 */
function normalizeMoneyTextByCurrency(rawValue, fallbackCurrency = "USD") {
  const text = compactInlineText(rawValue);
  if (!text) {
    return null;
  }
  if (/(免费|free)/i.test(text)) {
    return text;
  }

  const currency = detectCurrencyFromText(text, fallbackCurrency);
  const normalizedText = text.replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();

  if (currency === "CNY") {
    let normalized = normalizedText
      .replace(/[￥]/g, "¥")
      .replace(/人民币/gi, "")
      .replace(/\s*元(?=\s*\/|\s*$)/g, "")
      .trim();
    if (!/^¥/.test(normalized) && /^[0-9]/.test(normalized)) {
      normalized = `¥${normalized}`;
    }
    return normalized.replace(/^¥\s+/, "¥");
  }

  let normalized = normalizedText
    .replace(/[￥¥]/g, "")
    .replace(/人民币|元/g, "")
    .replace(/\b(?:USD|US\$)\b/gi, "")
    .trim();
  if (!/^\$/.test(normalized) && /^[0-9]/.test(normalized)) {
    normalized = `$${normalized}`;
  }
  return normalized.replace(/^\$\s+/, "$");
}

/**
 * Normalizes currency symbols in a plan object
 * @param {Object} plan - The plan object to normalize
 * @returns {Object} The normalized plan object
 */
function normalizePlanCurrencySymbols(plan) {
  if (!plan || typeof plan !== "object") {
    return plan;
  }
  const currencyHintText = [plan.currentPriceText, plan.originalPriceText, plan.notes]
    .map((value) => compactInlineText(value))
    .filter(Boolean)
    .join(" | ");
  const fallbackCurrency = detectCurrencyFromText(currencyHintText, "USD");

  return {
    ...plan,
    currentPriceText: normalizeMoneyTextByCurrency(plan.currentPriceText, fallbackCurrency),
    originalPriceText: normalizeMoneyTextByCurrency(plan.originalPriceText, fallbackCurrency),
    notes:
      typeof plan.notes === "string" && plan.notes.trim()
        ? plan.notes
          .split(/([；;])/)
          .map((part) => {
            if (part === "；" || part === ";") {
              return part;
            }
            return normalizeMoneyTextByCurrency(part, fallbackCurrency) || compactInlineText(part);
          })
          .join("")
          .replace(/\s+/g, " ")
          .trim()
        : plan.notes || null,
  };
}

/**
 * Normalizes currency symbols for all providers
 * @param {Object[]} providers - Array of provider objects
 * @returns {Object[]} Array of normalized provider objects
 */
function normalizeProviderCurrencySymbols(providers) {
  return (providers || []).map((provider) => ({
    ...provider,
    plans: (provider?.plans || []).map((plan) => normalizePlanCurrencySymbols(plan)),
  }));
}

/**
 * Removes duplicate plans based on key fields
 * @param {Object[]} plans - Array of plan objects
 * @returns {Object[]} Array of deduplicated plans
 */
function dedupePlans(plans) {
  const seen = new Set();
  const result = [];
  for (const plan of plans) {
    const key = [
      String(plan.name || "").toLowerCase(),
      String(plan.currentPriceText || "").toLowerCase(),
      String(plan.originalPriceText || "").toLowerCase(),
      String(plan.notes || "").toLowerCase(),
      (Array.isArray(plan.serviceDetails) ? plan.serviceDetails : [])
        .map((item) => String(item || "").toLowerCase())
        .join("|"),
    ].join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(plan);
  }
  return result;
}

/**
 * Fetches text content from a URL with retry logic
 * @param {string} url - The URL to fetch
 * @param {Object} [options={}] - Fetch options
 * @param {number} [options.retries=1] - Number of retries
 * @param {number} [options.retryDelayMs=400] - Delay between retries
 * @returns {Promise<string>} The fetched text content
 * @throws {Error} If all retry attempts fail
 */
async function fetchText(url, options = {}) {
  const context = REQUEST_CONTEXT.getStore() || {};
  const {
    timeoutMs: timeoutOverride,
    signal: optionSignal,
    retries = 1,
    retryDelayMs = 400,
    ...fetchOptions
  } = options;
  const timeoutMs = Number.isFinite(timeoutOverride) ? timeoutOverride : context.timeoutMs || REQUEST_TIMEOUT_MS;
  const maxAttempts = Number.isFinite(retries) ? Math.max(1, retries + 1) : 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const linkedSignals = [context.signal, optionSignal].filter(Boolean);
    const linkedAbortHandlers = [];
    let timedOut = false;

    for (const linkedSignal of linkedSignals) {
      if (linkedSignal.aborted) {
        controller.abort();
        break;
      }
      const onAbort = () => controller.abort();
      linkedSignal.addEventListener("abort", onAbort, { once: true });
      linkedAbortHandlers.push({ linkedSignal, onAbort });
    }
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        headers: COMMON_HEADERS,
        ...fetchOptions,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${url} -> ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      if (timedOut) {
        lastError = new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
      } else if (controller.signal.aborted) {
        lastError = new Error(`Request aborted: ${url}`);
      } else {
        lastError = error;
      }
      if (attempt < maxAttempts) {
        const backoff = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    } finally {
      clearTimeout(timeoutHandle);
      for (const { linkedSignal, onAbort } of linkedAbortHandlers) {
        linkedSignal.removeEventListener("abort", onAbort);
      }
    }
  }

  throw lastError;
}

/**
 * Fetches and parses JSON from a URL
 * @param {string} url - The URL to fetch
 * @param {Object} [options={}] - Fetch options
 * @returns {Promise<Object>} The parsed JSON data
 * @throws {Error} If fetch or parse fails
 */
async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON from ${url}: ${error.message}`);
  }
}

/**
 * Extracts table rows from HTML
 * @param {string} html - The HTML content
 * @returns {string[][]} Array of rows, each row is an array of cell texts
 */
function extractRows(html) {
  const rows = [];
  const matches = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const match of matches) {
    const cells = [...match[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => stripTags(cell[1]));
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
}

/**
 * Formats a numeric amount as a string
 * @param {number} amount - The amount to format
 * @returns {string|null} The formatted amount or null if invalid
 */
function formatAmount(amount) {
  if (!Number.isFinite(amount)) {
    return null;
  }
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Normalizes service details from various input formats
 * @param {string|string[]|null|undefined} values - The service details to normalize
 * @returns {string[]|null} Array of normalized service details or null
 */
function normalizeServiceDetails(values) {
  const list = Array.isArray(values) ? values : values ? [values] : [];
  const normalized = unique(
    list
      .flatMap((value) => String(value || "").split(/[\r\n;；]+/))
      .map((value) => normalizeText(value))
      .filter(Boolean),
  );
  return normalized.length > 0 ? normalized : null;
}

/**
 * Builds service details from table rows
 * @param {string[][]} rows - Table rows
 * @param {number} column - Column index to extract values from
 * @param {Object} [options={}] - Options
 * @param {string[]} [options.excludeLabels=[]] - Labels to exclude
 * @returns {string[]|null} Array of service details or null
 */
function buildServiceDetailsFromRows(rows, column, options = {}) {
  const excludeLabels = new Set(
    (options.excludeLabels || []).map((value) => normalizeText(value).toLowerCase()).filter(Boolean),
  );
  const details = [];
  for (const row of rows || []) {
    const label = normalizeText(row?.[0] || "");
    const value = normalizeText(row?.[column] || "");
    if (!label || !value) {
      continue;
    }
    if (excludeLabels.has(label.toLowerCase())) {
      continue;
    }
    details.push(`${label}: ${value}`);
  }
  return normalizeServiceDetails(details);
}

/**
 * Creates a standardized plan object
 * @param {Object} params - Plan parameters
 * @param {string} params.name - Plan name
 * @param {string} params.currentPriceText - Current price text
 * @param {number} [params.currentPrice=null] - Current price amount
 * @param {string} [params.originalPriceText=null] - Original price text
 * @param {number} [params.originalPrice=null] - Original price amount
 * @param {string} [params.unit=null] - Time unit
 * @param {string} [params.notes=null] - Additional notes
 * @param {string[]} [params.serviceDetails=null] - Service details
 * @param {string} [params.offerEndDate=null] - Offer end date (ISO 8601 format)
 * @returns {Object} Standardized plan object
 */
function asPlan({
  name,
  currentPriceText,
  currentPrice = null,
  originalPriceText = null,
  originalPrice = null,
  unit = null,
  notes = null,
  serviceDetails = null,
  offerEndDate = null,
}) {
  const current = parsePriceText(currentPriceText);
  const original = parsePriceText(originalPriceText);
  return {
    name: normalizeText(name),
    currentPrice: Number.isFinite(currentPrice) ? currentPrice : current.amount,
    currentPriceText: current.text,
    originalPrice: Number.isFinite(originalPrice) ? originalPrice : original.amount,
    originalPriceText: original.text,
    unit: unit || current.unit || original.unit || null,
    notes: normalizeText(notes) || null,
    serviceDetails: normalizeServiceDetails(serviceDetails),
    offerEndDate: offerEndDate || null,
  };
}

/**
 * Converts a relative URL to absolute URL
 * @param {string} url - The URL (relative or absolute)
 * @param {string} baseUrl - The base URL
 * @returns {string} The absolute URL
 */
function absoluteUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

/**
 * Returns unique values from an array
 * @param {Array} values - Array of values
 * @returns {Array} Array of unique values
 */
function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Converts time unit constant to label
 * @param {string} value - Time unit constant (e.g., "TIME_UNIT_MONTH")
 * @returns {string|null} The corresponding label (e.g., "月") or null
 */
function timeUnitLabel(value) {
  if (value === "TIME_UNIT_MONTH") {
    return "月";
  }
  if (value === "TIME_UNIT_YEAR") {
    return "年";
  }
  if (value === "TIME_UNIT_DAY") {
    return "日";
  }
  return null;
}

/**
 * Checks if a unit represents a monthly period
 * @param {string} value - The unit to check
 * @returns {boolean} True if the unit is monthly
 */
function isMonthlyUnit(value) {
  const unit = normalizeText(value).toLowerCase();
  if (!unit) {
    return false;
  }
  return /^(月|month|monthly)$/.test(unit);
}

/**
 * Checks if price text represents a monthly price
 * @param {string} value - The price text to check
 * @returns {boolean} True if the price is monthly
 */
function isMonthlyPriceText(value) {
  const text = normalizeText(value);
  if (!text) {
    return false;
  }
  if (/首月|first\s*month/i.test(text)) {
    return false;
  }
  return /\/\s*(月|month|monthly)/i.test(text);
}

/**
 * Checks if a plan is a standard monthly/quarterly plan
 * Filters out first-month promos, annual, and daily plans
 * @param {Object} plan - The plan to check
 * @returns {boolean} True if the plan is a standard monthly/quarterly plan
 */
function isStandardMonthlyPlan(plan) {
  const priceText = normalizeText(plan?.currentPriceText || "");
  const unit = normalizeText(plan?.unit || "").toLowerCase();
  const hasMonthlyUnit = isMonthlyUnit(plan?.unit);
  const hasMonthlyPriceText = isMonthlyPriceText(priceText);
  const hasQuarterlyUnit = /^(季度|季|quarter|quarterly)$/.test(unit);
  const hasQuarterlyPriceText = /\/\s*(季度|季|quarter)/i.test(priceText);
  // Reject first-month promo or annual/daily plans
  if (priceText && /首月|first\s*month/i.test(priceText)) {
    return false;
  }
  if (/^(年|year|annual|day|日)$/.test(unit)) {
    return false;
  }
  if (priceText && /\/\s*(年|year|annual|day|日)/i.test(priceText)) {
    return false;
  }
  return hasMonthlyUnit || hasMonthlyPriceText || hasQuarterlyUnit || hasQuarterlyPriceText;
}

/**
 * Filters and deduplicates standard monthly plans
 * @param {Object[]} plans - Array of plan objects
 * @returns {Object[]} Filtered and deduplicated plans
 */
function keepStandardMonthlyPlans(plans) {
  return dedupePlans((plans || []).filter((plan) => isStandardMonthlyPlan(plan)));
}

/**
 * Strips simple markdown formatting from text
 * @param {string} text - The text containing markdown
 * @returns {string} The text without markdown
 */
function stripSimpleMarkdown(text) {
  return normalizeText(text)
    .replace(/<label>\s*([^<]+)\s*<\/label>/gi, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

// Export error handling utilities
const errors = require("./errors");

module.exports = {
  HTML_ENTITIES,
  CNY_CURRENCY_HINT,
  USD_CURRENCY_HINT,
  COMMON_HEADERS,
  REQUEST_CONTEXT,
  REQUEST_TIMEOUT_MS,
  PROVIDER_IDS,
  PROVIDER_NAMES,
  PROVIDER_URLS,
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
  stripSimpleMarkdown,
  // Error handling exports
  ...errors,
};
