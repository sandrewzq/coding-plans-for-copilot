const DATA_PATH = "./provider-pricing.json";
const HISTORY_PATH = "./price-history.json";

const PROVIDER_LABELS = {
  "zhipu-ai": "智谱 z.ai",
  "kimi-ai": "Kimi",
  "volcengine-ai": "火山引擎",
  "minimax-ai": "MiniMax",
  "aliyun-ai": "阿里云百炼",
  "baidu-qianfan-ai": "百度智能云千帆",
  "kwaikat-ai": "快手 KwaiKAT",
  "x-aio": "X-AIO",
  "compshare-ai": "优云智算",
  "infini-ai": "无问芯穹",
  "mthreads-ai": "摩尔线程",
  "zenmux-ai": "Zenmux",
};

const PROVIDER_BUY_URLS = {
  "zhipu-ai": "https://www.bigmodel.cn/glm-coding?ic=BZRLCDAC1G",
  "kimi-ai": "https://www.kimi.com/code/zh",
  "volcengine-ai": "https://www.volcengine.com/activity/codingplan",
  "minimax-ai": "https://platform.minimaxi.com/subscribe/coding-plan",
  "aliyun-ai": "https://www.aliyun.com/benefit/scene/codingplan",
  "baidu-qianfan-ai": "https://cloud.baidu.com/product/codingplan.html",
  "kwaikat-ai": "https://www.streamlake.com/marketing/coding-plan",
  "x-aio": "https://code.x-aio.com/",
  "compshare-ai": "https://www.compshare.cn/docs/modelverse/package_plan/package",
  "infini-ai": "https://cloud.infini-ai.com/platform/ai",
  "mthreads-ai": "https://code.mthreads.com/",
  "zenmux-ai": "https://zenmux.ai/pricing/subscription",
};

const PROVIDER_ORDER = [
  "zhipu-ai",
  "kimi-ai",
  "minimax-ai",
  "aliyun-ai",
  "volcengine-ai",
  "kwaikat-ai",
  "baidu-qianfan-ai",
  "infini-ai",
  "compshare-ai",
  "mthreads-ai",
  "x-aio",
  "zenmux-ai",
];

const reloadButtonEl = document.querySelector("#reloadButton");
const providerGridEl = document.querySelector("#providerGrid");
const providerNavEl = document.querySelector("#providerNav");
const errorBannerEl = document.querySelector("#errorBanner");
const generatedAtEl = document.querySelector("#generatedAt");
const providerCountEl = document.querySelector("#providerCount");
const planCountEl = document.querySelector("#planCount");
const searchInputEl = document.querySelector("#searchInput");
const priceFilterEl = document.querySelector("#priceFilter");
const compareButtonEl = document.querySelector("#compareButton");
const comparePanelEl = document.querySelector("#comparePanel");
const closeCompareEl = document.querySelector("#closeCompare");
const compareContentEl = document.querySelector("#compareContent");

// Store original data for filtering
let originalData = null;

// Store selected plans for comparison
let selectedPlansForCompare = new Set();

function formatDate(isoText) {
  if (!isoText) {
    return "--";
  }
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined && textContent !== null) {
    element.textContent = textContent;
  }
  return element;
}

function setError(message) {
  if (!message) {
    errorBannerEl.classList.add("hidden");
    errorBannerEl.textContent = "";
    return;
  }
  errorBannerEl.classList.remove("hidden");
  errorBannerEl.textContent = message;
}

function normalizeUnit(unit) {
  return String(unit || "").trim() || "未标注";
}

function detectCurrencySymbol(text, fallbackSymbol = "$") {
  const value = String(text || "");
  if (/[¥￥]|人民币|\b(?:CNY|RMB)\b|元/i.test(value)) {
    return "¥";
  }
  if (/\$|美元|\b(?:USD|US\$)\b|dollar/i.test(value)) {
    return "$";
  }
  return fallbackSymbol;
}

function getPlanCurrencySymbol(plan) {
  const hintText = [plan?.currentPriceText, plan?.originalPriceText, plan?.notes]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" | ");
  return detectCurrencySymbol(hintText, "$");
}

function displayPrice(plan) {
  return plan.currentPriceText
    || (Number.isFinite(plan.currentPrice) ? `${getPlanCurrencySymbol(plan)}${plan.currentPrice}` : "价格待确认");
}

function priceTextHasUnit(text) {
  const value = String(text || "");
  if (!value) {
    return false;
  }
  if (/\/\s*(月|季|年|month|quarter|year)/i.test(value)) {
    return true;
  }
  return /(每月|每季|每年)/.test(value);
}

function getPlanServices(plan) {
  const rawList = Array.isArray(plan?.serviceDetails)
    ? plan.serviceDetails
    : plan?.serviceDetails
      ? [plan.serviceDetails]
      : [];
  const normalized = [...new Set(rawList.map((item) => String(item || "").trim()).filter(Boolean))];
  return normalized;
}

function formatOfferPriceText(rawValue, fallbackSymbol = "$") {
  const rawText = String(rawValue || "").trim();
  if (!rawText) {
    return null;
  }
  const numberMatch = rawText.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!numberMatch) {
    return null;
  }
  const amount = numberMatch[1];
  const symbol = detectCurrencySymbol(rawText, fallbackSymbol);
  const unitMatch = rawText.match(/\/\s*(月|季|年|month|quarter|year)/i) ||
    rawText.match(/(每月|每季|每年)/);
  let unitLabel = "";
  if (unitMatch) {
    const unitToken = unitMatch[1] || unitMatch[0];
    if (/月|month/i.test(unitToken)) {
      unitLabel = "/月";
    } else if (/季|quarter/i.test(unitToken)) {
      unitLabel = "/季";
    } else if (/年|year/i.test(unitToken)) {
      unitLabel = "/年";
    }
  }
  return `${symbol}${amount}${unitLabel}`;
}

function getPlanOffer(provider, plan) {
  const fallbackSymbol = getPlanCurrencySymbol(plan);

  if (plan && plan.offerName) {
    const explicitPriceText = formatOfferPriceText(plan.offerPriceText || plan.offerPrice || "", fallbackSymbol);
    if (explicitPriceText) {
      return {
        title: String(plan.offerName),
        priceText: explicitPriceText,
      };
    }
  }

  if (plan && plan.firstMonthPriceText) {
    const firstMonthPriceText = formatOfferPriceText(plan.firstMonthPriceText, fallbackSymbol);
    if (firstMonthPriceText) {
      return {
        title: "首月特惠",
        priceText: firstMonthPriceText,
      };
    }
  }
  if (plan && Number.isFinite(plan.firstMonthPrice)) {
    return {
      title: "首月特惠",
      priceText: `${fallbackSymbol}${plan.firstMonthPrice}/月`,
    };
  }

  const notesText = String(plan?.notes || "");
  const offerPatterns = [
    /((?:新客|新人|新用户)?\s*首月(?:特惠|优惠)?)[^0-9¥￥$]*((?:USD|US\$)?\s*[¥￥$]?\s*[0-9]+(?:\.[0-9]+)?(?:\s*元)?(?:\s*\/\s*(?:月|month|monthly))?)/i,
    /((?:首购优惠|首购特惠))[:：]?\s*((?:USD|US\$)?\s*[¥￥$]?\s*[0-9]+(?:\.[0-9]+)?(?:\s*元)?(?:\s*\/\s*(?:月|month|monthly))?)/i,
    /((?:新人专享|新客专享|新用户专享))[^0-9¥￥$]*((?:USD|US\$)?\s*[¥￥$]?\s*[0-9]+(?:\.[0-9]+)?(?:\s*元)?(?:\s*\/\s*(?:月|month|monthly))?)/i,
    /((?:官网折扣价|限时限购|限时特惠|限时抢购))[:：]?\s*((?:USD|US\$)?\s*[¥￥$]?\s*[0-9]+(?:\.[0-9]+)?(?:\s*元)?(?:\s*\/\s*(?:月|month|monthly))?)/i,
  ];
  for (const pattern of offerPatterns) {
    const matched = notesText.match(pattern);
    if (!matched) {
      continue;
    }
    const priceText = formatOfferPriceText(matched[2], fallbackSymbol);
    if (!priceText) {
      continue;
    }
    return {
      title: String(matched[1]).replace(/\s+/g, ""),
      priceText,
    };
  }

  const labelOnlyMatch = notesText.match(/(新人专享|新客专享|新用户专享|新客首月|新人首月)/i);
  if (labelOnlyMatch && plan?.currentPriceText && plan?.originalPriceText) {
    const currentAsOffer = formatOfferPriceText(plan.currentPriceText, fallbackSymbol);
    if (currentAsOffer) {
      return {
        title: String(labelOnlyMatch[1]).replace(/\s+/g, ""),
        priceText: currentAsOffer,
      };
    }
  }

  return null;
}

function getProviderPurchaseUrl(provider) {
  if (provider && Array.isArray(provider.plans)) {
    const planWithBuyUrl = provider.plans.find((plan) => plan && plan.buyUrl);
    if (planWithBuyUrl && planWithBuyUrl.buyUrl) {
      return String(planWithBuyUrl.buyUrl);
    }
  }
  if (provider && PROVIDER_BUY_URLS[provider.provider]) {
    return PROVIDER_BUY_URLS[provider.provider];
  }
  if (provider && Array.isArray(provider.sourceUrls) && provider.sourceUrls.length > 0) {
    return provider.sourceUrls[0];
  }
  return null;
}

/**
 * Filters providers and plans based on search query and price range
 * @param {Object} data - The pricing data
 * @param {string} searchQuery - The search query
 * @param {string} priceRange - The price range filter
 * @returns {Object} Filtered data
 */
function filterData(data, searchQuery, priceRange) {
  const query = searchQuery.toLowerCase().trim();
  const providers = Array.isArray(data.providers) ? data.providers : [];

  return {
    ...data,
    providers: providers
      .map((provider) => {
        const providerName = (PROVIDER_LABELS[provider.provider] || provider.provider).toLowerCase();
        const matchesProvider = providerName.includes(query);

        const filteredPlans = (provider.plans || []).filter((plan) => {
          // Check if plan name matches search
          const planNameMatch = (plan.name || "").toLowerCase().includes(query);
          // Check if service details match search
          const serviceDetailsMatch = (plan.serviceDetails || []).some((detail) =>
            detail.toLowerCase().includes(query),
          );
          // Check if notes match search
          const notesMatch = (plan.notes || "").toLowerCase().includes(query);

          const matchesSearch = matchesProvider || planNameMatch || serviceDetailsMatch || notesMatch;

          // Check price range
          let matchesPrice = true;
          if (priceRange && plan.currentPrice !== null && plan.currentPrice !== undefined) {
            const price = plan.currentPrice;
            switch (priceRange) {
              case "0-50":
                matchesPrice = price >= 0 && price <= 50;
                break;
              case "50-100":
                matchesPrice = price > 50 && price <= 100;
                break;
              case "100-200":
                matchesPrice = price > 100 && price <= 200;
                break;
              case "200+":
                matchesPrice = price > 200;
                break;
            }
          }

          return matchesSearch && matchesPrice;
        });

        return {
          ...provider,
          plans: filteredPlans,
        };
      })
      .filter((provider) => provider.plans.length > 0),
  };
}

function renderProviders(data) {
  // Store original data for filtering
  if (!originalData) {
    originalData = JSON.parse(JSON.stringify(data));
  }

  const providers = Array.isArray(data.providers) ? data.providers : [];
  const visibleProviders = providers
    .filter((provider) => (provider.plans || []).length > 0)
    .sort((left, right) => {
      const leftIndex = PROVIDER_ORDER.indexOf(left?.provider);
      const rightIndex = PROVIDER_ORDER.indexOf(right?.provider);
      const safeLeft = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
      const safeRight = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;
      if (safeLeft !== safeRight) {
        return safeLeft - safeRight;
      }
      return String(left?.provider || "").localeCompare(String(right?.provider || ""));
    });

  providerGridEl.replaceChildren();
  if (providerNavEl) {
    providerNavEl.replaceChildren();
  }

  if (visibleProviders.length === 0) {
    providerGridEl.append(createElement("article", "empty", "暂无可展示的标准月费数据。"));
    providerCountEl.textContent = "0";
    planCountEl.textContent = "0";
    return;
  }

  let totalPlans = 0;
  for (const provider of visibleProviders) {
    totalPlans += provider.plans.length;

    const providerName = PROVIDER_LABELS[provider.provider] || provider.provider;
    const providerId = `provider-${String(provider.provider || "").replace(/[^a-z0-9-]/gi, "-")}`;

    const card = createElement("article", "provider-card");
    card.id = providerId;
    const head = createElement("header", "provider-head");
    const title = createElement("h2", "provider-title", providerName);
    head.append(title);

    const providerBuyUrl = getProviderPurchaseUrl(provider);
    if (providerBuyUrl) {
      const buyLink = createElement("a", "buy-link", "前往了解");
      buyLink.href = providerBuyUrl;
      buyLink.target = "_blank";
      buyLink.rel = "noopener noreferrer";
      head.append(buyLink);
    }

    const planList = createElement("ul", "plan-list");
    for (const plan of provider.plans) {
      const item = createElement("li", "plan-item");
      const name = createElement("h3", "plan-name", plan.name || "未命名套餐");
      const priceRow = createElement("p", "price-row");
      const priceText = displayPrice(plan);

      const isDiscount =
        plan.originalPriceText &&
        plan.originalPriceText !== plan.currentPriceText &&
        String(plan.originalPriceText).trim() !== "";

      if (isDiscount) {
        priceRow.append(createElement("span", "price-original", `原价 ${plan.originalPriceText}`));
        priceRow.append(createElement("span", "price-discount", `优惠价 ${priceText}`));
      } else {
        priceRow.append(createElement("span", "price-now", priceText));
      }

      if (plan.unit && !priceTextHasUnit(priceText)) {
        priceRow.append(createElement("span", "unit-tag", normalizeUnit(plan.unit)));
      }

      item.append(name, priceRow);

      // Add compare checkbox
      const compareWrapper = createElement("div", "plan-compare");
      const compareCheckbox = document.createElement("input");
      compareCheckbox.type = "checkbox";
      compareCheckbox.title = "加入对比";
      compareCheckbox.dataset.provider = provider.provider;
      compareCheckbox.dataset.planName = plan.name;
      compareCheckbox.addEventListener("change", (e) => {
        const planKey = `${provider.provider}:${plan.name}`;
        if (e.target.checked) {
          if (selectedPlansForCompare.size >= 4) {
            alert("最多只能选择 4 个套餐进行对比");
            e.target.checked = false;
            return;
          }
          selectedPlansForCompare.add(planKey);
        } else {
          selectedPlansForCompare.delete(planKey);
        }
      });
      compareWrapper.append(compareCheckbox);
      item.append(compareWrapper);

      // Add price trend indicator
      const trend = getPlanPriceTrend(provider.provider, plan.name);
      if (trend.length > 0) {
        const trendEl = renderPriceTrend(trend);
        item.append(trendEl);
      }

      const offerInfo = getPlanOffer(provider, plan);
      if (offerInfo) {
        const offerCard = createElement("div", "offer-card");
        offerCard.append(
          createElement("span", "offer-name", offerInfo.title),
          createElement("span", "offer-price", offerInfo.priceText),
        );
        item.append(offerCard);
      }

      const serviceItems = getPlanServices(plan);
      if (serviceItems.length > 0) {
        const serviceBlock = createElement("section", "plan-services");
        serviceBlock.append(createElement("p", "plan-services-title", "服务内容"));
        const serviceList = createElement("ul", "plan-service-list");
        for (const serviceText of serviceItems) {
          serviceList.append(createElement("li", "plan-service-item", serviceText));
        }
        serviceBlock.append(serviceList);
        item.append(serviceBlock);
      }

      if (plan.notes) {
        item.append(createElement("p", "plan-notes", plan.notes));
      }

      planList.append(item);
    }

    card.append(head, planList);

    // Footer: fetchedAt + source link
    const hasMeta = provider.fetchedAt || (Array.isArray(provider.sourceUrls) && provider.sourceUrls.length > 0);
    if (hasMeta) {
      const meta = createElement("div", "provider-meta");
      if (provider.fetchedAt) {
        meta.append(createElement("span", "provider-fetched-at", `更新于 ${formatDate(provider.fetchedAt)}`));
      }
      const firstSource = Array.isArray(provider.sourceUrls) ? provider.sourceUrls[0] : null;
      if (firstSource) {
        const srcLink = createElement("a", "source-link", "数据来源");
        srcLink.href = firstSource;
        srcLink.target = "_blank";
        srcLink.rel = "noopener noreferrer";
        meta.append(srcLink);
      }
      card.append(meta);
    }

    providerGridEl.append(card);

    if (providerNavEl) {
      const item = createElement("li", "sidebar-item");
      const link = createElement("a", "sidebar-link", providerName);
      link.href = `#${providerId}`;
      item.append(link);
      providerNavEl.append(item);
    }
  }

  providerCountEl.textContent = String(visibleProviders.length);
  planCountEl.textContent = String(totalPlans);
}

function renderFailures(data) {
  const failures = Array.isArray(data.failures) ? data.failures : [];
  if (failures.length === 0) {
    setError("");
    return;
  }
  setError(`抓取存在 ${failures.length} 个失败项：${failures.join("；")}`);
}

function renderSkeletonProviders() {
  providerGridEl.replaceChildren();
  for (let i = 0; i < 3; i++) {
    const card = createElement("article", "provider-card");
    const head = createElement("header", "provider-head");
    const title = createElement("h2", "provider-title skeleton-shimmer", "Loading Provider API");
    head.append(title);

    const planList = createElement("ul", "plan-list");
    for (let j = 0; j < 2; j++) {
      const item = createElement("li", "plan-item");
      const name = createElement("h3", "plan-name skeleton-shimmer", "Awesome Plan Title Here");
      const priceRow = createElement("p", "price-row");
      priceRow.append(createElement("span", "price-now skeleton-shimmer", "¥999.00/月"));
      item.append(name, priceRow);
      planList.append(item);
    }
    card.append(head, planList);
    providerGridEl.append(card);
  }
}

// Store price history data
let priceHistoryData = null;

/**
 * Loads price history data
 * @returns {Promise<Object|null>} Price history data
 */
async function loadPriceHistory() {
  try {
    const response = await fetch(HISTORY_PATH, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Gets price trend for a specific plan
 * @param {string} providerId - Provider ID
 * @param {string} planName - Plan name
 * @returns {Array} Price trend data
 */
function getPlanPriceTrend(providerId, planName) {
  if (!priceHistoryData || !priceHistoryData.history) return [];

  const trend = [];
  for (const snapshot of priceHistoryData.history) {
    for (const provider of snapshot.providers || []) {
      if (provider.provider !== providerId) continue;
      for (const plan of provider.plans || []) {
        if (plan.name === planName) {
          trend.push({
            timestamp: snapshot.timestamp,
            currentPrice: plan.currentPrice,
            currentPriceText: plan.currentPriceText,
          });
        }
      }
    }
  }
  return trend;
}

/**
 * Renders a mini price trend chart
 * @param {Array} trend - Price trend data
 * @returns {HTMLElement} Trend element
 */
function renderPriceTrend(trend) {
  const container = createElement("div", "price-trend");

  if (trend.length < 2) {
    container.innerHTML = '<span class="trend-no-data">暂无历史数据</span>';
    return container;
  }

  const firstPrice = trend[0].currentPrice;
  const lastPrice = trend[trend.length - 1].currentPrice;
  const hasChanged = firstPrice !== lastPrice;

  if (!hasChanged) {
    container.innerHTML = '<span class="trend-stable">价格稳定</span>';
    return container;
  }

  const change = lastPrice - firstPrice;
  const changePercent = firstPrice > 0 ? ((change / firstPrice) * 100).toFixed(1) : 0;
  const isIncrease = change > 0;

  const trendBadge = createElement(
    "span",
    `trend-badge ${isIncrease ? "trend-up" : "trend-down"}`,
    `${isIncrease ? "↑" : "↓"} ${Math.abs(changePercent)}%`
  );

  const trendTooltip = createElement("span", "trend-tooltip");
  trendTooltip.textContent = `历史价格: ${trend.map((t) => t.currentPriceText || t.currentPrice).join(" → ")}`;

  container.append(trendBadge, trendTooltip);
  return container;
}

async function loadData() {
  setError("");
  reloadButtonEl.disabled = true;
  reloadButtonEl.textContent = "加载中...";
  renderSkeletonProviders();

  // Load price history in parallel
  priceHistoryData = await loadPriceHistory();

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(DATA_PATH, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    generatedAtEl.textContent = formatDate(data.generatedAt);
    renderProviders(data);
    renderFailures(data);
  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    providerGridEl.replaceChildren();
    providerGridEl.append(createElement("article", "empty", "加载失败，请稍后重试。"));
    generatedAtEl.textContent = "--";
    providerCountEl.textContent = "0";
    planCountEl.textContent = "0";
    setError(
      isTimeout
        ? `加载超时（8 秒）：${DATA_PATH}`
        : `无法读取 ${DATA_PATH}：${error.message}`,
    );
  } finally {
    clearTimeout(timeoutHandle);
    reloadButtonEl.disabled = false;
    reloadButtonEl.textContent = "重新加载";
  }
}

reloadButtonEl.addEventListener("click", () => {
  // Reset filters when reloading
  if (searchInputEl) searchInputEl.value = "";
  if (priceFilterEl) priceFilterEl.value = "";
  originalData = null;
  loadData();
});

// Search and filter handling
function applyFilters() {
  if (!originalData) return;
  const searchQuery = searchInputEl ? searchInputEl.value : "";
  const priceRange = priceFilterEl ? priceFilterEl.value : "";
  const filteredData = filterData(originalData, searchQuery, priceRange);
  renderProviders(filteredData);
  renderFailures(filteredData);
}

if (searchInputEl) {
  searchInputEl.addEventListener("input", () => {
    applyFilters();
  });
}

if (priceFilterEl) {
  priceFilterEl.addEventListener("change", () => {
    applyFilters();
  });
}

// Compare functionality
function renderCompareTable() {
  if (!compareContentEl || !originalData) return;

  if (selectedPlansForCompare.size === 0) {
    compareContentEl.innerHTML = '<p class="compare-select-hint">请至少选择一个套餐进行对比</p>';
    return;
  }

  const selectedPlans = [];
  for (const provider of originalData.providers) {
    for (const plan of provider.plans) {
      const planKey = `${provider.provider}:${plan.name}`;
      if (selectedPlansForCompare.has(planKey)) {
        selectedPlans.push({
          provider: PROVIDER_LABELS[provider.provider] || provider.provider,
          ...plan,
        });
      }
    }
  }

  const table = document.createElement("table");
  table.className = "compare-table";

  // Header row
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.append(createElement("th", "", "项目"));
  for (const plan of selectedPlans) {
    headerRow.append(createElement("th", "", `${plan.provider} - ${plan.name}`));
  }
  thead.append(headerRow);
  table.append(thead);

  // Data rows
  const tbody = document.createElement("tbody");

  // Price row
  const priceRow = document.createElement("tr");
  priceRow.append(createElement("td", "", "价格"));
  for (const plan of selectedPlans) {
    const priceText = plan.currentPriceText || (plan.currentPrice ? `¥${plan.currentPrice}` : "-");
    priceRow.append(createElement("td", "", priceText));
  }
  tbody.append(priceRow);

  // Original price row
  const originalPriceRow = document.createElement("tr");
  originalPriceRow.append(createElement("td", "", "原价"));
  for (const plan of selectedPlans) {
    const originalText = plan.originalPriceText || (plan.originalPrice ? `¥${plan.originalPrice}` : "-");
    originalPriceRow.append(createElement("td", "", originalText));
  }
  tbody.append(originalPriceRow);

  // Unit row
  const unitRow = document.createElement("tr");
  unitRow.append(createElement("td", "", "计费周期"));
  for (const plan of selectedPlans) {
    unitRow.append(createElement("td", "", plan.unit || "-"));
  }
  tbody.append(unitRow);

  // Notes row
  const notesRow = document.createElement("tr");
  notesRow.append(createElement("td", "", "备注"));
  for (const plan of selectedPlans) {
    notesRow.append(createElement("td", "", plan.notes || "-"));
  }
  tbody.append(notesRow);

  // Service details row
  const serviceRow = document.createElement("tr");
  serviceRow.append(createElement("td", "", "服务内容"));
  for (const plan of selectedPlans) {
    const serviceText = (plan.serviceDetails || []).join("；") || "-";
    serviceRow.append(createElement("td", "", serviceText));
  }
  tbody.append(serviceRow);

  table.append(tbody);
  compareContentEl.replaceChildren(table);
}

if (compareButtonEl) {
  compareButtonEl.addEventListener("click", () => {
    if (comparePanelEl) {
      comparePanelEl.classList.remove("hidden");
      renderCompareTable();
    }
  });
}

if (closeCompareEl) {
  closeCompareEl.addEventListener("click", () => {
    if (comparePanelEl) {
      comparePanelEl.classList.add("hidden");
    }
  });
}

// Theme handling
const themeToggleEl = document.querySelector("#themeToggle");
const currentTheme = localStorage.getItem("theme") ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

if (currentTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  themeToggleEl.textContent = "☀️ 亮色模式";
}

themeToggleEl.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    themeToggleEl.textContent = "🌙 暗色模式";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    themeToggleEl.textContent = "☀️ 亮色模式";
  }
});

loadData();
