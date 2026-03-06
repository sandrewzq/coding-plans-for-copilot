const DATA_PATH = "./provider-pricing.json";
const HISTORY_PATH = "./price-history.json";

const PROVIDER_LABELS = {
  "zhipu-ai": "智谱",
  "kimi-ai": "Kimi",
  "minimax-ai": "MiniMax",
  "aliyun-ai": "阿里云百炼",
  "volcengine-ai": "火山引擎",
  "kwaikat-ai": "快手 KwaiKAT",
  "baidu-qianfan-ai": "百度智能云千帆",
  "infini-ai": "无问芯穹",
  "compshare-ai": "优云智算",
  "mthreads-ai": "摩尔线程",
  "x-aio": "X-AIO",
  "zenmux-ai": "Zenmux",
};

const PROVIDER_BUY_URLS = {
  "zhipu-ai": "https://www.bigmodel.cn/glm-coding?ic=BZRLCDAC1G",
  "kimi-ai": "https://www.kimi.com/code/zh",
  "minimax-ai": "https://platform.minimaxi.com/subscribe/coding-plan",
  "aliyun-ai": "https://www.aliyun.com/benefit/scene/codingplan",
  "volcengine-ai": "https://volcengine.com/L/RUFlYNIKjD4/",
  "kwaikat-ai": "https://www.streamlake.com/marketing/coding-plan",
  "baidu-qianfan-ai": "https://cloud.baidu.com/product/codingplan.html",
  "infini-ai": "https://cloud.infini-ai.com/platform/ai",
  "compshare-ai": "https://www.compshare.cn/docs/modelverse/package_plan/package",
  "mthreads-ai": "https://code.mthreads.com/",
  "x-aio": "https://code.x-aio.com/",
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

// Capability keywords mapping
const CAPABILITY_KEYWORDS = {
  "code-completion": ["代码补全", "代码生成", "Code", "Claude Code", "Cursor", "Cline", "Kilo Code", "IDE", "插件"],
  "chat": ["对话", "Chat", "聊天", "问答"],
  "agent": ["Agent", "代理", "智能体", "Kimi Claw", "OpenClaw"],
  "api": ["API", "接口", "调用"],
  "ide-plugin": ["IDE", "插件", "VS Code", "JetBrains", "Cursor", "Claude Code"],
  "multi-model": ["多模型", "模型切换", "Qwen", "GLM", "Kimi", "DeepSeek", "MiniMax"],
};

const reloadButtonEl = document.querySelector("#reloadButton");
const providerGridEl = document.querySelector("#providerGrid");
const providerNavEl = document.querySelector("#providerNav");
const errorBannerEl = document.querySelector("#errorBanner");
const generatedAtEl = document.querySelector("#generatedAt");
const providerCountEl = document.querySelector("#providerCount");
const planCountEl = document.querySelector("#planCount");
const searchInputEl = document.querySelector("#searchInput");
const priceFilterEl = document.querySelector("#priceFilter");
const sortFilterEl = document.querySelector("#sortFilter");
const compareButtonEl = document.querySelector("#compareButton");
const comparePanelEl = document.querySelector("#comparePanel");
const closeCompareEl = document.querySelector("#closeCompare");
const clearCompareEl = document.querySelector("#clearCompare");
const compareContentEl = document.querySelector("#compareContent");
const compareCountEl = document.querySelector("#compareCount");
const calculatorButtonEl = document.querySelector("#calculatorButton");
const calculatorPanelEl = document.querySelector("#calculatorPanel");
const closeCalculatorEl = document.querySelector("#closeCalculator");
const monthlyRequestsEl = document.querySelector("#monthlyRequests");
const requestsPerHourEl = document.querySelector("#requestsPerHour");
const budgetLimitEl = document.querySelector("#budgetLimit");
const calculatorResultsEl = document.querySelector("#calculatorResults");

// Store original data for filtering
let originalData = null;

// Store selected plans for comparison
const selectedPlansForCompare = new Set();

// Store countdown intervals
const countdownIntervals = new Map();

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
  if (plan.currentPriceText) {
    return plan.currentPriceText;
  }
  if (Number.isFinite(plan.currentPrice)) {
    return `${getPlanCurrencySymbol(plan)}${plan.currentPrice}/月`;
  }
  return "价格待确认";
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
 * Detect plan capabilities based on service details and notes
 * @param {Object} plan - The plan object
 * @returns {Array} Array of capability tags
 */
function detectCapabilities(plan) {
  const capabilities = new Set();
  const textToAnalyze = [
    ...(plan.serviceDetails || []),
    plan.notes || "",
    plan.name || "",
  ].join(" ").toLowerCase();

  for (const [capability, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword.toLowerCase())) {
        capabilities.add(capability);
        break;
      }
    }
  }

  return Array.from(capabilities);
}

/**
 * Detect provider capabilities by aggregating all plan capabilities
 * @param {Object} provider - The provider object
 * @returns {Array} Array of capability tags
 */
function detectProviderCapabilities(provider) {
  const allCapabilities = new Set();

  // Aggregate capabilities from all plans
  for (const plan of provider.plans || []) {
    const planCapabilities = detectCapabilities(plan);
    for (const cap of planCapabilities) {
      allCapabilities.add(cap);
    }
  }

  return Array.from(allCapabilities);
}

/**
 * Get capability display info
 * @param {string} capability - Capability key
 * @returns {Object} Display info
 */
function getCapabilityInfo(capability) {
  const info = {
    "code-completion": { label: "代码补全", icon: "💻" },
    "chat": { label: "对话", icon: "💬" },
    "agent": { label: "Agent", icon: "🤖" },
    "api": { label: "API", icon: "🔌" },
    "ide-plugin": { label: "IDE插件", icon: "🛠️" },
    "multi-model": { label: "多模型", icon: "🔄" },
  };
  return info[capability] || { label: capability, icon: "✨" };
}

/**
 * Render capability tags
 * @param {Array} capabilities - Array of capability keys
 * @returns {HTMLElement} Capability container
 */
function renderCapabilityTags(capabilities) {
  const container = createElement("div", "plan-capabilities");
  for (const capability of capabilities) {
    const info = getCapabilityInfo(capability);
    const tag = createElement("span", `capability-tag ${capability}`, `${info.icon} ${info.label}`);
    container.append(tag);
  }
  return container;
}

/**
 * Check if plan has a limited time offer and calculate countdown
 * @param {Object} plan - The plan object
 * @returns {Object|null} Countdown info or null
 */
function getOfferCountdown(plan) {
  const notes = String(plan?.notes || "");
  
  // Check for various offer patterns
  const offerPatterns = [
    /(?:新客|新人|新用户)?\s*首月(?:特惠|优惠)?/i,
    /(?:首购优惠|首购特惠)/i,
    /(?:新人专享|新客专享|新用户专享)/i,
    /(?:官网折扣价|限时限购|限时特惠|限时抢购)/i,
  ];

  const hasOffer = offerPatterns.some(pattern => pattern.test(notes));
  
  if (!hasOffer) {return null;}

  // For demo purposes, assume offers end at end of current month
  // In production, this would come from actual offer end dates
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  return {
    endDate: endOfMonth,
    label: "限时优惠截止",
  };
}

/**
 * Render countdown timer
 * @param {Object} countdown - Countdown info
 * @param {string} planKey - Unique plan key
 * @returns {HTMLElement} Countdown element
 */
function renderCountdown(countdown, planKey) {
  const container = createElement("div", "countdown-timer");
  container.dataset.planKey = planKey;
  
  const label = createElement("span", "countdown-label", countdown.label);
  const value = createElement("span", "countdown-value", "");
  
  container.append(label, value);
  
  // Start countdown
  updateCountdown(value, countdown.endDate, container);
  const interval = setInterval(() => {
    updateCountdown(value, countdown.endDate, container);
  }, 1000);
  
  countdownIntervals.set(planKey, interval);
  
  return container;
}

/**
 * Update countdown display
 * @param {HTMLElement} element - Value element
 * @param {Date} endDate - End date
 * @param {HTMLElement} container - Container element
 */
function updateCountdown(element, endDate, container) {
  const now = new Date();
  const diff = endDate - now;
  
  if (diff <= 0) {
    element.textContent = "已结束";
    container.classList.add("ended");
    return;
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (days > 0) {
    element.textContent = `${days}天 ${hours}小时`;
  } else {
    element.textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  
  // Add urgent class if less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    container.classList.add("urgent");
  }
}

/**
 * Clear all countdown intervals
 */
function clearAllCountdowns() {
  for (const interval of countdownIntervals.values()) {
    clearInterval(interval);
  }
  countdownIntervals.clear();
}

/**
 * Filters providers and plans based on search query and price range
 * @param {Object} data - The pricing data
 * @param {string} searchQuery - The search query
 * @param {string} priceRange - The price range filter
 * @param {string} sortBy - Sort option
 * @returns {Object} Filtered data
 */
function filterData(data, searchQuery, priceRange, sortBy = "") {
  const query = searchQuery.toLowerCase().trim();
  const providers = Array.isArray(data.providers) ? data.providers : [];

  let filteredProviders = providers
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
    .filter((provider) => provider.plans.length > 0);

  // Apply sorting
  if (sortBy) {
    filteredProviders = sortProviders(filteredProviders, sortBy);
  }

  return {
    ...data,
    providers: filteredProviders,
  };
}

/**
 * Sort providers and plans
 * @param {Array} providers - Array of providers
 * @param {string} sortBy - Sort option
 * @returns {Array} Sorted providers
 */
function sortProviders(providers, sortBy) {
  const sortedProviders = [...providers];
  
  switch (sortBy) {
    case "price-asc":
      // Flatten all plans, sort by price, then group by provider
      return sortPlansByPrice(sortedProviders, true);
    case "price-desc":
      return sortPlansByPrice(sortedProviders, false);
    case "name":
      sortedProviders.sort((a, b) => {
        const nameA = PROVIDER_LABELS[a.provider] || a.provider;
        const nameB = PROVIDER_LABELS[b.provider] || b.provider;
        return nameA.localeCompare(nameB, "zh-CN");
      });
      return sortedProviders;
    default:
      return sortedProviders;
  }
}

/**
 * Sort plans by price
 * @param {Array} providers - Array of providers
 * @param {boolean} ascending - Sort ascending
 * @returns {Array} Sorted providers
 */
function sortPlansByPrice(providers, ascending) {
  // Create a flat list of all plans with provider info
  const allPlans = [];
  for (const provider of providers) {
    for (const plan of provider.plans) {
      allPlans.push({
        ...plan,
        provider: provider.provider,
        providerName: PROVIDER_LABELS[provider.provider] || provider.provider,
        sourceUrls: provider.sourceUrls,
        fetchedAt: provider.fetchedAt,
      });
    }
  }
  
  // Sort by price
  allPlans.sort((a, b) => {
    const priceA = a.currentPrice ?? Number.POSITIVE_INFINITY;
    const priceB = b.currentPrice ?? Number.POSITIVE_INFINITY;
    return ascending ? priceA - priceB : priceB - priceA;
  });
  
  // Group back by provider (but now providers will have plans in price order)
  const providerMap = new Map();
  for (const plan of allPlans) {
    if (!providerMap.has(plan.provider)) {
      providerMap.set(plan.provider, {
        provider: plan.provider,
        sourceUrls: plan.sourceUrls,
        fetchedAt: plan.fetchedAt,
        plans: [],
      });
    }
    providerMap.get(plan.provider).plans.push(plan);
  }
  
  return Array.from(providerMap.values());
}

function renderProviders(data) {
  // Clear existing countdowns
  clearAllCountdowns();

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
    
    // For X-AIO, use special layout with invite code
    if (provider.provider === "x-aio") {
      const titleRow = createElement("div", "provider-title-row");
      const title = createElement("h2", "provider-title", providerName);
      titleRow.append(title);
      
      const providerBuyUrl = getProviderPurchaseUrl(provider);
      if (providerBuyUrl) {
        const buyLink = createElement("a", "buy-link", "前往了解");
        buyLink.href = providerBuyUrl;
        buyLink.target = "_blank";
        buyLink.rel = "noopener noreferrer";
        titleRow.append(buyLink);
      }
      head.append(titleRow);
      
      const inviteRow = createElement("div", "provider-invite-row");
      const inviteCodeEl = createElement("div", "invite-code");
      inviteCodeEl.innerHTML = `
        <span class="invite-code-label">邀请码：</span>
        <code class="invite-code-value" onclick="navigator.clipboard.writeText('b3d7ebff9c11472eb4f4').then(() => alert('邀请码已复制！'))">b3d7ebff9c11472eb4f4</code>
        <span class="invite-code-hint">（点击复制）</span>
      `;
      inviteRow.append(inviteCodeEl);
      head.append(inviteRow);
    } else {
      // Normal layout for other providers
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
    }

    // Add provider-level capability tags (aggregated from all plans)
    const providerCapabilities = detectProviderCapabilities(provider);
    if (providerCapabilities.length > 0) {
      head.append(renderCapabilityTags(providerCapabilities));
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

      // Toggle selection function
      const planKey = `${provider.provider}:${plan.name}`;
      const toggleSelection = () => {
        if (selectedPlansForCompare.has(planKey)) {
          selectedPlansForCompare.delete(planKey);
          compareCheckbox.checked = false;
          item.classList.remove("selected");
        } else {
          if (selectedPlansForCompare.size >= 4) {
            alert("最多只能选择 4 个套餐进行对比");
            return;
          }
          selectedPlansForCompare.add(planKey);
          compareCheckbox.checked = true;
          item.classList.add("selected");
        }
        updateCompareCount();
      };

      // Checkbox change event
      compareCheckbox.addEventListener("change", (e) => {
        e.stopPropagation();
        if (e.target.checked) {
          if (selectedPlansForCompare.size >= 4) {
            alert("最多只能选择 4 个套餐进行对比");
            e.target.checked = false;
            return;
          }
          selectedPlansForCompare.add(planKey);
          item.classList.add("selected");
        } else {
          selectedPlansForCompare.delete(planKey);
          item.classList.remove("selected");
        }
        updateCompareCount();
      });

      // Click on card to toggle selection
      item.addEventListener("click", (e) => {
        // Don't toggle if clicking on links or buttons
        if (e.target.tagName === "A" || e.target.tagName === "BUTTON" || e.target.closest("a") || e.target.closest("button")) {
          return;
        }
        toggleSelection();
      });

      // Set initial state if already selected
      if (selectedPlansForCompare.has(planKey)) {
        compareCheckbox.checked = true;
        item.classList.add("selected");
      }

      compareWrapper.append(compareCheckbox);
      item.append(compareWrapper);

      // Add countdown timer for offers
      const countdown = getOfferCountdown(plan);
      if (countdown) {
        item.append(renderCountdown(countdown, planKey));
      }

      // Add price trend indicator
      const trend = getPlanPriceTrend(provider.provider, plan.name);
      if (trend.length > 0) {
        const trendEl = renderPriceTrend(trend, provider.provider, plan.name);
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

/**
 * Renders skeleton loading cards with improved visual feedback
 */
function renderSkeletonProviders() {
  providerGridEl.replaceChildren();

  // Create loading status indicator
  const loadingStatus = createElement("div", "loading-status");
  loadingStatus.innerHTML = `
    <div class="loading-spinner"></div>
    <span class="loading-text">正在加载套餐数据...</span>
  `;
  providerGridEl.append(loadingStatus);

  // Create skeleton cards
  const skeletonContainer = createElement("div", "skeleton-container");
  for (let i = 0; i < 3; i++) {
    const card = createElement("article", "provider-card skeleton-card");
    card.setAttribute("aria-busy", "true");
    card.setAttribute("aria-label", "加载中");

    const head = createElement("header", "provider-head");
    const title = createElement("h2", "provider-title skeleton-shimmer", "正在加载厂商信息...");
    head.append(title);

    const planList = createElement("ul", "plan-list");
    for (let j = 0; j < 2; j++) {
      const item = createElement("li", "plan-item skeleton-item");
      const name = createElement("h3", "plan-name skeleton-shimmer", "套餐名称加载中");
      const priceRow = createElement("p", "price-row");
      const price = createElement("span", "price-now skeleton-shimmer", "价格计算中...");
      const details = createElement("span", "plan-details skeleton-shimmer", "详情加载中");
      priceRow.append(price, details);
      item.append(name, priceRow);
      planList.append(item);
    }
    card.append(head, planList);
    skeletonContainer.append(card);
  }
  providerGridEl.append(skeletonContainer);
}

/**
 * Shows a progress indicator for long loading operations
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Status message
 */
function showLoadingProgress(progress, message) {
  const existingProgress = document.querySelector(".loading-progress");
  if (existingProgress) {
    existingProgress.remove();
  }

  const progressEl = createElement("div", "loading-progress");
  progressEl.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress}%"></div>
    </div>
    <span class="progress-text">${message} (${progress}%)</span>
  `;
  providerGridEl.prepend(progressEl);
}

/**
 * Hides the loading progress indicator
 */
function hideLoadingProgress() {
  const progressEl = document.querySelector(".loading-progress");
  if (progressEl) {
    progressEl.remove();
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
    if (!response.ok) {return null;}
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
  if (!priceHistoryData || !priceHistoryData.history) {return [];}

  const trend = [];
  for (const snapshot of priceHistoryData.history) {
    for (const provider of snapshot.providers || []) {
      if (provider.provider !== providerId) {continue;}
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
 * Creates an SVG mini sparkline chart
 * @param {Array} trend - Price trend data
 * @param {number} width - Chart width
 * @param {number} height - Chart height
 * @returns {string} SVG HTML string
 */
function createSparkline(trend, width = 60, height = 24) {
  if (trend.length < 2) {return '';}

  const prices = trend.map(t => t.currentPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // Calculate points
  const points = trend.map((t, i) => {
    const x = (i / (trend.length - 1)) * width;
    const y = height - ((t.currentPrice - minPrice) / priceRange) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  // Determine color based on trend
  const firstPrice = trend[0].currentPrice;
  const lastPrice = trend[trend.length - 1].currentPrice;
  const isIncrease = lastPrice > firstPrice;
  const strokeColor = isIncrease ? '#c62828' : '#2e7d32';

  return `
    <svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline
        fill="none"
        stroke="${strokeColor}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        points="${points}"
      />
      <circle cx="${width}" cy="${height - ((lastPrice - minPrice) / priceRange) * (height - 4) - 2}" r="2.5" fill="${strokeColor}" />
    </svg>
  `;
}

/**
 * Renders a mini price trend chart with sparkline
 * @param {Array} trend - Price trend data
 * @param {string} providerId - Provider ID
 * @param {string} planName - Plan name
 * @returns {HTMLElement} Trend element
 */
function renderPriceTrend(trend, providerId, planName) {
  const container = createElement("div", "price-trend");

  if (trend.length < 2) {
    container.innerHTML = '<span class="trend-no-data">暂无历史数据</span>';
    return container;
  }

  const firstPrice = trend[0].currentPrice;
  const lastPrice = trend[trend.length - 1].currentPrice;
  const hasChanged = firstPrice !== lastPrice;

  if (!hasChanged) {
    container.innerHTML = `
      <span class="trend-stable">价格稳定</span>
      ${createSparkline(trend)}
    `;
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

  const sparklineContainer = createElement("span", "sparkline-container");
  sparklineContainer.innerHTML = createSparkline(trend);

  const trendTooltip = createElement("span", "trend-tooltip");
  trendTooltip.textContent = `历史价格: ${trend.map((t) => t.currentPriceText || t.currentPrice).join(" → ")}`;

  // Add click handler to show detailed chart
  container.style.cursor = 'pointer';
  container.title = '点击查看详细价格历史';
  container.addEventListener('click', () => showPriceHistoryModal(trend, providerId, planName));

  container.append(trendBadge, sparklineContainer, trendTooltip);
  return container;
}

/**
 * Shows a modal with detailed price history chart
 * @param {Array} trend - Price trend data
 * @param {string} providerId - Provider ID
 * @param {string} planName - Plan name
 */
function showPriceHistoryModal(trend, providerId, planName) {
  // Remove existing modal if any
  const existingModal = document.querySelector('.price-history-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const providerName = PROVIDER_LABELS[providerId] || providerId;

  const modal = createElement('div', 'price-history-modal');
  modal.innerHTML = `
    <div class="price-history-overlay"></div>
    <div class="price-history-content">
      <div class="price-history-header">
        <h3>${providerName} - ${planName}</h3>
        <button class="price-history-close" aria-label="关闭">&times;</button>
      </div>
      <div class="price-history-chart-container">
        ${createDetailedChart(trend)}
      </div>
      <div class="price-history-stats">
        ${createPriceStats(trend)}
      </div>
    </div>
  `;

  // Close handlers
  const closeBtn = modal.querySelector('.price-history-close');
  const overlay = modal.querySelector('.price-history-overlay');

  const closeModal = () => modal.remove();
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {closeModal();}
  }, { once: true });

  document.body.appendChild(modal);
}

/**
 * Creates a detailed SVG line chart
 * @param {Array} trend - Price trend data
 * @returns {string} SVG HTML string
 */
function createDetailedChart(trend) {
  if (trend.length < 1) {return '<p>暂无数据</p>';}

  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const prices = trend.map(t => t.currentPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const pricePadding = priceRange * 0.1;
  const yMin = Math.max(0, minPrice - pricePadding);
  const yMax = maxPrice + pricePadding;

  // Generate chart points
  const points = trend.map((t, i) => {
    const x = padding.left + (i / Math.max(1, trend.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((t.currentPrice - yMin) / (yMax - yMin)) * chartHeight;
    return { x, y, price: t.currentPrice, date: new Date(t.timestamp) };
  });

  // Create path for line
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Create area path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  // Generate Y-axis labels
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = yMin + (yMax - yMin) * (i / 4);
    const y = padding.top + chartHeight - (i / 4) * chartHeight;
    yLabels.push({ value, y });
  }

  // Generate X-axis labels (show first, middle, last dates)
  const xLabels = [];
  const labelIndices = [0, Math.floor((trend.length - 1) / 2), trend.length - 1];
  labelIndices.forEach(i => {
    if (i >= 0 && i < trend.length) {
      const date = new Date(trend[i].timestamp);
      xLabels.push({
        x: padding.left + (i / Math.max(1, trend.length - 1)) * chartWidth,
        label: `${date.getMonth() + 1}/${date.getDate()}`
      });
    }
  });

  const firstPrice = trend[0].currentPrice;
  const lastPrice = trend[trend.length - 1].currentPrice;
  const isIncrease = lastPrice > firstPrice;
  const strokeColor = isIncrease ? '#c62828' : '#2e7d32';
  const fillColor = isIncrease ? 'rgba(198, 40, 40, 0.1)' : 'rgba(46, 125, 50, 0.1)';

  return `
    <svg class="price-history-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <!-- Grid lines -->
      ${yLabels.map(l => `
        <line x1="${padding.left}" y1="${l.y}" x2="${width - padding.right}" y2="${l.y}"
          stroke="var(--line)" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>
      `).join('')}

      <!-- Y-axis labels -->
      ${yLabels.map(l => `
        <text x="${padding.left - 10}" y="${l.y + 4}" text-anchor="end" font-size="11" fill="var(--muted)">
          ¥${l.value.toFixed(0)}
        </text>
      `).join('')}

      <!-- X-axis labels -->
      ${xLabels.map(l => `
        <text x="${l.x}" y="${height - 10}" text-anchor="middle" font-size="11" fill="var(--muted)">
          ${l.label}
        </text>
      `).join('')}

      <!-- Area fill -->
      <path d="${areaD}" fill="${fillColor}" />

      <!-- Line -->
      <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Data points -->
      ${points.map((p, i) => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="${strokeColor}" stroke="white" stroke-width="2"
          class="chart-point" data-price="¥${p.price}" data-date="${p.date.toLocaleDateString('zh-CN')}"/>
      `).join('')}

      <!-- Current price label -->
      <text x="${points[points.length - 1].x}" y="${points[points.length - 1].y - 10}"
        text-anchor="end" font-size="12" font-weight="bold" fill="${strokeColor}">
        ¥${lastPrice}
      </text>
    </svg>
  `;
}

/**
 * Creates price statistics HTML
 * @param {Array} trend - Price trend data
 * @returns {string} Stats HTML string
 */
function createPriceStats(trend) {
  if (trend.length < 2) {return '';}

  const prices = trend.map(t => t.currentPrice);
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const change = lastPrice - firstPrice;
  const changePercent = firstPrice > 0 ? ((change / firstPrice) * 100).toFixed(1) : 0;

  const firstDate = new Date(trend[0].timestamp).toLocaleDateString('zh-CN');
  const lastDate = new Date(trend[trend.length - 1].timestamp).toLocaleDateString('zh-CN');

  return `
    <div class="price-stat-grid">
      <div class="price-stat-item">
        <span class="price-stat-label">起始价格</span>
        <span class="price-stat-value">¥${firstPrice}</span>
        <span class="price-stat-date">${firstDate}</span>
      </div>
      <div class="price-stat-item">
        <span class="price-stat-label">当前价格</span>
        <span class="price-stat-value ${change >= 0 ? 'price-up' : 'price-down'}">¥${lastPrice}</span>
        <span class="price-stat-date">${lastDate}</span>
      </div>
      <div class="price-stat-item">
        <span class="price-stat-label">价格变化</span>
        <span class="price-stat-value ${change >= 0 ? 'price-up' : 'price-down'}">
          ${change >= 0 ? '↑' : '↓'} ${Math.abs(changePercent)}%
        </span>
        <span class="price-stat-date">¥${Math.abs(change).toFixed(1)}</span>
      </div>
      <div class="price-stat-item">
        <span class="price-stat-label">最低 / 最高</span>
        <span class="price-stat-value">¥${minPrice} / ¥${maxPrice}</span>
        <span class="price-stat-date">平均: ¥${avgPrice.toFixed(1)}</span>
      </div>
    </div>
  `;
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

    // Store data globally for modules
    window._pricingData = data;

    generatedAtEl.textContent = formatDate(data.generatedAt);
    renderProviders(data);
    renderFailures(data);

    // Dynamically load feature modules

  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    renderErrorState(isTimeout, error);
  } finally {
    clearTimeout(timeoutHandle);
    reloadButtonEl.disabled = false;
    reloadButtonEl.textContent = "重新加载";
  }
}

reloadButtonEl.addEventListener("click", () => {
  // Reset filters when reloading
  if (searchInputEl) {searchInputEl.value = "";}
  if (priceFilterEl) {priceFilterEl.value = "";}
  if (sortFilterEl) {sortFilterEl.value = "";}
  originalData = null;
  // Keyboard shortcuts
document.addEventListener("keydown", handleKeyboardShortcuts);

function handleKeyboardShortcuts(event) {
  // Ignore if user is typing in an input
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  const key = event.key.toLowerCase();

  switch (key) {
    case "/":
      // Focus search
      event.preventDefault();
      searchInputEl?.focus();
      break;

    case "r":
      // Reload data
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        loadData();
        showToast("数据已刷新", "success");
      }
      break;

    case "escape":
      // Close panels
      comparePanelEl?.classList.add("hidden");
      calculatorPanelEl?.classList.add("hidden");
      // Close keyboard shortcuts panel if open
      document.querySelector(".keyboard-shortcuts-panel")?.classList.remove("open");
      break;

    case "c":
      // Toggle compare panel
      if (!event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        compareButtonEl?.click();
      }
      break;

    case "x":
      // Toggle calculator panel
      event.preventDefault();
      calculatorButtonEl?.click();
      break;

    case "t":
      // Toggle theme
      event.preventDefault();
      themeToggleEl?.click();
      break;

    case "?":
      // Show keyboard shortcuts help
      event.preventDefault();
      toggleKeyboardShortcutsPanel();
      break;

    case "s":
      // Scroll to top
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;

    case "f":
      // Focus price filter
      event.preventDefault();
      priceFilterEl?.focus();
      break;
  }
}

/**
 * Toggle keyboard shortcuts help panel
 */
function toggleKeyboardShortcutsPanel() {
  let panel = document.querySelector(".keyboard-shortcuts-panel");
  let backdrop = document.querySelector(".shortcuts-backdrop");

  if (panel?.classList.contains("open")) {
    panel.classList.remove("open");
    backdrop?.remove();
  } else {
    if (!panel) {
      createKeyboardShortcutsPanel();
      panel = document.querySelector(".keyboard-shortcuts-panel");
    }

    // Create backdrop
    backdrop = createElement("div", "shortcuts-backdrop");
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 999;
    `;
    backdrop.addEventListener("click", toggleKeyboardShortcutsPanel);
    document.body.append(backdrop);

    panel.classList.add("open");
  }
}

/**
 * Create keyboard shortcuts help panel
 */
function createKeyboardShortcutsPanel() {
  const container = createElement("div", "keyboard-shortcuts");

  const toggle = createElement("button", "keyboard-shortcuts-toggle", "⌨️");
  toggle.title = "键盘快捷键 (?)";
  toggle.addEventListener("click", toggleKeyboardShortcutsPanel);

  const panel = createElement("div", "keyboard-shortcuts-panel");
  panel.innerHTML = `
    <div class="keyboard-shortcuts-title">⌨️ 键盘快捷键</div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">搜索套餐</span>
      <span class="keyboard-shortcut-key"><kbd>/</kbd></span>
    </div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">刷新数据</span>
      <span class="keyboard-shortcut-key"><kbd>Ctrl</kbd>+<kbd>R</kbd></span>
    </div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">对比套餐</span>
      <span class="keyboard-shortcut-key"><kbd>C</kbd></span>
    </div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">价格计算器</span>
      <span class="keyboard-shortcut-key"><kbd>X</kbd></span>
    </div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">切换主题</span>
      <span class="keyboard-shortcut-key"><kbd>T</kbd></span>
    </div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">回到顶部</span>
      <span class="keyboard-shortcut-key"><kbd>S</kbd></span>
    </div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">价格筛选</span>
      <span class="keyboard-shortcut-key"><kbd>F</kbd></span>
    </div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">关闭面板</span>
      <span class="keyboard-shortcut-key"><kbd>Esc</kbd></span>
    </div>
    <div class="keyboard-shortcut">
      <span class="keyboard-shortcut-desc">显示快捷键帮助</span>
      <span class="keyboard-shortcut-key"><kbd>?</kbd></span>
    </div>
  `;

  container.append(toggle, panel);
  document.body.append(container);
}

// Initialize keyboard shortcuts panel on load
createKeyboardShortcutsPanel();

// Initial data load
loadData();
});

/**
 * Renders an enhanced error state with retry options
 * @param {boolean} isTimeout - Whether the error was a timeout
 * @param {Error} error - The error object
 */
function renderErrorState(isTimeout, error) {
  providerGridEl.replaceChildren();

  const errorContainer = createElement("div", "error-container");

  const errorIcon = createElement("div", "error-icon", isTimeout ? "⏱️" : "⚠️");

  const errorTitle = createElement("h2", "error-title",
    isTimeout ? "加载超时" : "加载失败"
  );

  const errorMessage = createElement("p", "error-message",
    isTimeout
      ? "数据加载时间超过 8 秒，可能是网络连接较慢或服务器响应延迟。"
      : `无法读取数据：${error?.message || "未知错误"}`
  );

  const errorActions = createElement("div", "error-actions");

  const retryButton = createElement("button", "error-button primary", "🔄 重新加载");
  retryButton.addEventListener("click", () => {
    loadData();
  });

  const reportButton = createElement("button", "error-button secondary", "🐛 报告问题");
  reportButton.addEventListener("click", () => {
    window.open("https://github.com/sandrewzq/coding-plans-for-copilot/issues/new", "_blank");
  });

  errorActions.append(retryButton, reportButton);
  errorContainer.append(errorIcon, errorTitle, errorMessage, errorActions);
  providerGridEl.append(errorContainer);

  generatedAtEl.textContent = "--";
  providerCountEl.textContent = "0";
  planCountEl.textContent = "0";
  setError(
    isTimeout
      ? `加载超时（8 秒）：${DATA_PATH}`
      : `无法读取 ${DATA_PATH}：${error?.message || "未知错误"}`
  );
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info'
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = "info", duration = 3000) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = createElement("div", "toast-container");
    document.body.append(container);
  }

  const toast = createElement("div", `toast ${type}`);
  const icon = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

  container.append(toast);

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}



// Search and filter handling
function applyFilters() {
  if (!originalData) {return;}
  const searchQuery = searchInputEl ? searchInputEl.value : "";
  const priceRange = priceFilterEl ? priceFilterEl.value : "";
  const sortBy = sortFilterEl ? sortFilterEl.value : "";
  const filteredData = filterData(originalData, searchQuery, priceRange, sortBy);
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

if (sortFilterEl) {
  sortFilterEl.addEventListener("change", () => {
    applyFilters();
  });
}

// Compare functionality
function updateCompareCount() {
  if (compareCountEl) {
    compareCountEl.textContent = `已选择 ${selectedPlansForCompare.size}/4 个套餐`;
  }
}

function renderCompareTable() {
  if (!compareContentEl || !originalData) {return;}

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
          providerId: provider.provider,
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

  // Price row - highlight best (lowest) price
  const priceRow = document.createElement("tr");
  priceRow.append(createElement("td", "", "价格"));
  const prices = selectedPlans.map(p => p.currentPrice ?? Number.POSITIVE_INFINITY);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices.filter(p => p !== Number.POSITIVE_INFINITY));
  
  for (const plan of selectedPlans) {
    const priceText = plan.currentPriceText || (plan.currentPrice ? `¥${plan.currentPrice}` : "-");
    const cell = createElement("td", "", priceText);
    if (plan.currentPrice === minPrice && selectedPlans.length > 1) {
      cell.classList.add("highlight-best");
    } else if (plan.currentPrice === maxPrice && selectedPlans.length > 1) {
      cell.classList.add("highlight-worst");
    }
    priceRow.append(cell);
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

  // Capabilities row
  const capabilitiesRow = document.createElement("tr");
  capabilitiesRow.append(createElement("td", "", "模型能力"));
  for (const plan of selectedPlans) {
    const capabilities = detectCapabilities(plan);
    const capabilityTexts = capabilities.map(c => getCapabilityInfo(c).label);
    capabilitiesRow.append(createElement("td", "", capabilityTexts.join("、") || "-"));
  }
  tbody.append(capabilitiesRow);

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

  // Buy link row
  const buyRow = document.createElement("tr");
  buyRow.append(createElement("td", "", "购买链接"));
  for (const plan of selectedPlans) {
    const buyUrl = PROVIDER_BUY_URLS[plan.providerId] || "";
    if (buyUrl) {
      const link = createElement("a", "buy-link", "前往购买");
      link.href = buyUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const cell = createElement("td", "");
      cell.append(link);
      buyRow.append(cell);
    } else {
      buyRow.append(createElement("td", "", "-"));
    }
  }
  tbody.append(buyRow);

  table.append(tbody);
  
  // Add legend
  const legend = createElement("div", "compare-highlight-legend");
  legend.innerHTML = `
    <span><span class="legend-best"></span> 最优价格</span>
    <span><span class="legend-worst"></span> 最高价格</span>
  `;
  
  compareContentEl.replaceChildren(table, legend);
}

if (compareButtonEl) {
  compareButtonEl.addEventListener("click", () => {
    if (comparePanelEl) {
      const isHidden = comparePanelEl.classList.contains("hidden");
      // Hide calculator if open
      if (calculatorPanelEl && !calculatorPanelEl.classList.contains("hidden")) {
        calculatorPanelEl.classList.add("hidden");
      }
      if (isHidden) {
        comparePanelEl.classList.remove("hidden");
        renderCompareTable();
      } else {
        comparePanelEl.classList.add("hidden");
      }
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

if (clearCompareEl) {
  clearCompareEl.addEventListener("click", () => {
    selectedPlansForCompare.clear();
    updateCompareCount();
    renderCompareTable();
    // Re-render to clear selection UI
    applyFilters();
  });
}

// Calculator functionality
if (calculatorButtonEl) {
  calculatorButtonEl.addEventListener("click", () => {
    if (calculatorPanelEl) {
      const isHidden = calculatorPanelEl.classList.contains("hidden");
      // Hide compare if open
      if (comparePanelEl && !comparePanelEl.classList.contains("hidden")) {
        comparePanelEl.classList.add("hidden");
      }
      if (isHidden) {
        calculatorPanelEl.classList.remove("hidden");
      } else {
        calculatorPanelEl.classList.add("hidden");
      }
    }
  });
}

if (closeCalculatorEl) {
  closeCalculatorEl.addEventListener("click", () => {
    if (calculatorPanelEl) {
      calculatorPanelEl.classList.add("hidden");
    }
  });
}

/**
 * Parse request limit from service details
 * @param {Object} plan - Plan object
 * @returns {Object} Parsed limits
 */
function parseRequestLimits(plan) {
  const serviceDetails = (plan.serviceDetails || []).join(" ");
  const notes = plan.notes || "";
  const allText = `${serviceDetails} ${notes}`;
  
  const limits = {
    monthly: null,
    weekly: null,
    hourly: null,
    per5Hours: null,
    per4Hours: null,
  };
  
  // Match patterns like "1000次/月", "1200次/5小时", "500 Prompts/4小时"
  const monthlyMatch = allText.match(/(\d+(?:,\d{3})*)\s*(?:次|Prompts).*?(?:\/月|每月|月限额)/i);
  if (monthlyMatch) {
    limits.monthly = parseInt(monthlyMatch[1].replace(/,/g, ""));
  }
  
  const weeklyMatch = allText.match(/(\d+(?:,\d{3})*)\s*(?:次|Prompts).*?(?:\/周|每周|周限额)/i);
  if (weeklyMatch) {
    limits.weekly = parseInt(weeklyMatch[1].replace(/,/g, ""));
  }
  
  const per5HoursMatch = allText.match(/(\d+(?:,\d{3})*)\s*(?:次|Prompts).*?(?:\/\s*5\s*小时|每\s*5\s*小时)/i);
  if (per5HoursMatch) {
    limits.per5Hours = parseInt(per5HoursMatch[1].replace(/,/g, ""));
    limits.hourly = limits.per5Hours / 5;
  }
  
  const per4HoursMatch = allText.match(/(\d+(?:,\d{3})*)\s*(?:次|Prompts).*?(?:\/\s*4\s*小时|每\s*4\s*小时)/i);
  if (per4HoursMatch) {
    limits.per4Hours = parseInt(per4HoursMatch[1].replace(/,/g, ""));
    limits.hourly = limits.per4Hours / 4;
  }
  
  const hourlyMatch = allText.match(/(\d+(?:,\d{3})*)\s*(?:次|Prompts).*?(?:\/小时|每小时)/i);
  if (hourlyMatch && !limits.hourly) {
    limits.hourly = parseInt(hourlyMatch[1].replace(/,/g, ""));
  }
  
  return limits;
}

/**
 * Calculate plan suitability score
 * @param {Object} plan - Plan object
 * @param {number} monthlyRequests - User's monthly requests
 * @param {number} requestsPerHour - User's hourly requests
 * @param {number} budgetLimit - User's budget limit
 * @returns {Object} Score and recommendation info
 */
function calculatePlanSuitability(plan, monthlyRequests, requestsPerHour, budgetLimit) {
  const limits = parseRequestLimits(plan);
  const price = plan.currentPrice ?? Number.POSITIVE_INFINITY;
  
  let score = 0;
  const reasons = [];
  const warnings = [];
  
  // Budget check
  if (budgetLimit && price > budgetLimit) {
    return { score: -1, reasons: ["超出预算"], warnings: [], isRecommended: false };
  }
  
  // Check monthly limits
  if (monthlyRequests && limits.monthly) {
    const monthlyRatio = monthlyRequests / limits.monthly;
    if (monthlyRatio <= 0.5) {
      score += 30;
      reasons.push("月额度充足");
    } else if (monthlyRatio <= 0.8) {
      score += 20;
      reasons.push("月额度合适");
    } else if (monthlyRatio <= 1) {
      score += 10;
      reasons.push("月额度刚好");
    } else {
      score -= 20;
      warnings.push("月额度可能不足");
    }
  }
  
  // Check hourly limits
  if (requestsPerHour && limits.hourly) {
    const hourlyRatio = requestsPerHour / limits.hourly;
    if (hourlyRatio <= 0.5) {
      score += 30;
      reasons.push("小时额度充足");
    } else if (hourlyRatio <= 0.8) {
      score += 20;
      reasons.push("小时额度合适");
    } else if (hourlyRatio <= 1) {
      score += 10;
    } else {
      score -= 20;
      warnings.push("小时额度可能不足");
    }
  }
  
  // Price factor (lower is better)
  if (price !== Number.POSITIVE_INFINITY) {
    const allPlans = originalData?.providers?.flatMap(p => p.plans) || [];
    const allPrices = allPlans.map(p => p.currentPrice).filter(p => p !== null && p !== undefined);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;
    
    // Normalize price score (0-20 points for being affordable)
    const priceScore = 20 * (1 - (price - minPrice) / priceRange);
    score += Math.max(0, priceScore);
  }
  
  // Capabilities bonus
  const capabilities = detectCapabilities(plan);
  if (capabilities.includes("code-completion")) {
    score += 10;
    reasons.push("支持代码补全");
  }
  if (capabilities.includes("multi-model")) {
    score += 5;
    reasons.push("多模型支持");
  }
  
  return {
    score,
    reasons,
    warnings,
    isRecommended: score > 30,
    limits,
  };
}

/**
 * Update calculator results
 */
function updateCalculatorResults() {
  if (!calculatorResultsEl || !originalData) {return;}
  
  const monthlyRequests = parseInt(monthlyRequestsEl?.value) || 0;
  const requestsPerHour = parseInt(requestsPerHourEl?.value) || 0;
  const budgetLimit = parseInt(budgetLimitEl?.value) || 0;
  
  if (!monthlyRequests && !requestsPerHour) {
    calculatorResultsEl.innerHTML = '<p class="calc-hint">输入使用量参数，查看最适合的套餐推荐</p>';
    return;
  }
  
  // Calculate suitability for all plans
  const allPlans = [];
  for (const provider of originalData.providers) {
    for (const plan of provider.plans) {
      const suitability = calculatePlanSuitability(plan, monthlyRequests, requestsPerHour, budgetLimit);
      allPlans.push({
        ...plan,
        provider: PROVIDER_LABELS[provider.provider] || provider.provider,
        providerId: provider.provider,
        suitability,
      });
    }
  }
  
  // Sort by score
  allPlans.sort((a, b) => b.suitability.score - a.suitability.score);
  
  // Get top recommendations
  const topPlans = allPlans.filter(p => p.suitability.score > 0).slice(0, 5);
  
  if (topPlans.length === 0) {
    calculatorResultsEl.innerHTML = '<p class="calc-hint">没有找到符合条件的套餐，请调整筛选条件</p>';
    return;
  }
  
  // Render recommendations
  const container = createElement("div", "calc-recommendations");
  
  for (let i = 0; i < topPlans.length; i++) {
    const plan = topPlans[i];
    const isBestMatch = i === 0;
    
    const recEl = createElement("div", `calc-recommendation ${isBestMatch ? 'best-match' : ''}`);
    
    const header = createElement("div", "calc-recommendation-header");
    const title = createElement("span", "calc-recommendation-title", `${plan.provider} - ${plan.name}`);
    const price = createElement("span", "calc-recommendation-price", plan.currentPriceText || `¥${plan.currentPrice}`);
    header.append(title, price);
    
    const matchInfo = createElement("div", "calc-recommendation-match");
    if (isBestMatch) {
      matchInfo.textContent = `⭐ 最佳匹配 (匹配度: ${Math.round(plan.suitability.score)})`;
    } else {
      matchInfo.textContent = `匹配度: ${Math.round(plan.suitability.score)}`;
    }
    
    const details = createElement("div", "calc-recommendation-details");
    const reasons = [...plan.suitability.reasons, ...plan.suitability.warnings];
    if (reasons.length > 0) {
      details.textContent = reasons.join(" · ");
    }
    
    recEl.append(header, matchInfo, details);
    container.append(recEl);
  }
  
  calculatorResultsEl.replaceChildren(container);
}

// Calculator input listeners
if (monthlyRequestsEl) {
  monthlyRequestsEl.addEventListener("input", updateCalculatorResults);
}
if (requestsPerHourEl) {
  requestsPerHourEl.addEventListener("input", updateCalculatorResults);
}
if (budgetLimitEl) {
  budgetLimitEl.addEventListener("input", updateCalculatorResults);
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

// Back to top functionality
const backToTopBtn = document.querySelector("#backToTop");

if (backToTopBtn) {
  // Show/hide button based on scroll position
  const toggleBackToTop = () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.remove("hidden");
    } else {
      backToTopBtn.classList.add("hidden");
    }
  };

  // Throttle scroll event
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        toggleBackToTop();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Scroll to top on click
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

loadData();
