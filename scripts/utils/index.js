"use strict";

const { AsyncLocalStorage } = require("node:async_hooks");

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

const CNY_CURRENCY_HINT = /(¥|￥|元|人民币|\b(?:CNY|RMB)\b)/i;

const USD_CURRENCY_HINT = /(\$|\b(?:USD|US\$)\b|美元|dollar)/i;

const COMMON_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
};

const REQUEST_CONTEXT = new AsyncLocalStorage();

const REQUEST_TIMEOUT_MS = 15_000;

const PROVIDER_IDS = {
  ZHIPU: "zhipu-ai",
  KIMI: "kimi-ai",
  VOLCENGINE: "volcengine-ai",
  MINIMAX: "minimax-ai",
  ALIYUN: "aliyun-ai",
  BAIDU: "baidu-qianfan-ai",
  KWAIKAT: "kwaikat-ai",
  XAIO: "x-aio",
  COMPSHARE: "compshare-ai",
  INFINI: "infini-ai",
  MTHREADS: "mthreads-ai",
  ZENMUX: "zenmux-ai",
};

function decodeHtml(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/&(lt|gt|amp|quot|#39|nbsp);/g, (match) => HTML_ENTITIES[match] || match)
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "));
}

function normalizeText(value) {
  return decodeHtml(decodeUnicodeLiteral(String(value || "")).replace(/\s+/g, " ")).trim();
}

function decodeUnicodeLiteral(value) {
  return String(value || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  );
}

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

function compactInlineText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

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

function normalizeProviderCurrencySymbols(providers) {
  return (providers || []).map((provider) => ({
    ...provider,
    plans: (provider?.plans || []).map((plan) => normalizePlanCurrencySymbols(plan)),
  }));
}

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

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON from ${url}: ${error.message}`);
  }
}

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

function formatAmount(amount) {
  if (!Number.isFinite(amount)) {
    return null;
  }
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, "");
}

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

function asPlan({
  name,
  currentPriceText,
  currentPrice = null,
  originalPriceText = null,
  originalPrice = null,
  unit = null,
  notes = null,
  serviceDetails = null,
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
  };
}

function absoluteUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

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

function isMonthlyUnit(value) {
  const unit = normalizeText(value).toLowerCase();
  if (!unit) {
    return false;
  }
  return /^(月|month|monthly)$/.test(unit);
}

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

function isStandardMonthlyPlan(plan) {
  const priceText = normalizeText(plan?.currentPriceText || "");
  const unit = normalizeText(plan?.unit || "").toLowerCase();
  const hasMonthlyUnit = isMonthlyUnit(plan?.unit);
  const hasMonthlyPriceText = isMonthlyPriceText(priceText);
  const hasQuarterlyUnit = /^(\u5b63\u5ea6|\u5b63|quarter|quarterly)$/.test(unit);
  const hasQuarterlyPriceText = /\/\s*(\u5b63\u5ea6|\u5b63|quarter)/i.test(priceText);
  // Reject first-month promo or annual/daily plans
  if (priceText && /\u9996\u6708|first\s*month/i.test(priceText)) {
    return false;
  }
  if (/^(\u5e74|year|annual|day|\u65e5)$/.test(unit)) {
    return false;
  }
  if (priceText && /\/\s*(\u5e74|year|annual|day|\u65e5)/i.test(priceText)) {
    return false;
  }
  return hasMonthlyUnit || hasMonthlyPriceText || hasQuarterlyUnit || hasQuarterlyPriceText;
}

function keepStandardMonthlyPlans(plans) {
  return dedupePlans((plans || []).filter((plan) => isStandardMonthlyPlan(plan)));
}

function stripSimpleMarkdown(text) {
  return normalizeText(text)
    .replace(/<label>\s*([^<]+)\s*<\/label>/gi, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

module.exports = {
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
};
