/**
 * 价格计算器模块
 * 按需加载，用于计算推荐套餐
 */

// Calculator functions
function initCalculator() {
  const calculatorButtonEl = document.querySelector("#calculatorButton");
  const calculatorPanelEl = document.querySelector("#calculatorPanel");
  const closeCalculatorEl = document.querySelector("#closeCalculator");
  const monthlyRequestsEl = document.querySelector("#monthlyRequests");
  const requestsPerHourEl = document.querySelector("#requestsPerHour");
  const budgetLimitEl = document.querySelector("#budgetLimit");
  const calculatorResultsEl = document.querySelector("#calculatorResults");

  if (!calculatorButtonEl || !calculatorPanelEl) return;

  calculatorButtonEl.addEventListener("click", () => {
    calculatorPanelEl.classList.add("open");
    runCalculator();
  });

  closeCalculatorEl?.addEventListener("click", () => {
    calculatorPanelEl.classList.remove("open");
  });

  // Auto-calculate on input change
  [monthlyRequestsEl, requestsPerHourEl, budgetLimitEl].forEach((el) => {
    el?.addEventListener("input", debounce(runCalculator, 300));
  });
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function runCalculator() {
  const monthlyRequestsEl = document.querySelector("#monthlyRequests");
  const requestsPerHourEl = document.querySelector("#requestsPerHour");
  const budgetLimitEl = document.querySelector("#budgetLimit");
  const calculatorResultsEl = document.querySelector("#calculatorResults");

  if (!calculatorResultsEl) return;

  const monthlyRequests = parseInt(monthlyRequestsEl?.value || "0", 10);
  const requestsPerHour = parseInt(requestsPerHourEl?.value || "0", 10);
  const budgetLimit = parseFloat(budgetLimitEl?.value || "0");

  // Get current data from global
  const data = window._pricingData;
  if (!data || !data.providers) {
    calculatorResultsEl.innerHTML = "<p>请先等待数据加载完成</p>";
    return;
  }

  // Calculate recommendations
  const recommendations = calculateRecommendations(
    data.providers,
    monthlyRequests,
    requestsPerHour,
    budgetLimit
  );

  renderCalculatorResults(recommendations, calculatorResultsEl);
}

function calculateRecommendations(providers, monthlyRequests, requestsPerHour, budgetLimit) {
  const allPlans = [];

  for (const provider of providers) {
    for (const plan of provider.plans) {
      const price = plan.currentPrice || 0;
      if (budgetLimit > 0 && price > budgetLimit) continue;

      allPlans.push({
        provider: provider.provider,
        plan: plan.name,
        price: price,
        priceText: plan.currentPriceText || `¥${price}`,
        score: calculatePlanScore(plan, monthlyRequests, requestsPerHour, price),
      });
    }
  }

  // Sort by score (higher is better)
  return allPlans.sort((a, b) => b.score - a.score).slice(0, 5);
}

function calculatePlanScore(plan, monthlyRequests, requestsPerHour, price) {
  let score = 100;

  // Price efficiency (lower price = higher score)
  if (price > 0) {
    score += 100 / price;
  }

  // Check plan notes for usage limits
  const notes = (plan.notes || "").toLowerCase();

  // If user has high hourly requests, prefer plans with higher limits
  if (requestsPerHour > 100) {
    if (notes.includes("无限") || notes.includes("不限") || notes.includes("unlimited")) {
      score += 50;
    }
  }

  // If user has high monthly requests, prefer plans with higher limits
  if (monthlyRequests > 1000) {
    if (notes.includes("无限") || notes.includes("不限") || notes.includes("unlimited")) {
      score += 50;
    }
  }

  return score;
}

function renderCalculatorResults(recommendations, container) {
  if (recommendations.length === 0) {
    container.innerHTML = "<p>没有找到符合条件的套餐，请调整筛选条件</p>";
    return;
  }

  const html = recommendations
    .map(
      (rec, index) => `
    <div class="calculator-result-item ${index === 0 ? "best-match" : ""}">
      <div class="result-rank">${index === 0 ? "🥇 最佳匹配" : `#${index + 1}`}</div>
      <div class="result-provider">${rec.provider}</div>
      <div class="result-plan">${rec.plan}</div>
      <div class="result-price">${rec.priceText}</div>
    </div>
  `
    )
    .join("");

  container.innerHTML = html;
}

// Export for global access
window.initCalculator = initCalculator;
window.runCalculator = runCalculator;
