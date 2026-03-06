/**
 * 套餐比较模块
 * 按需加载，用于套餐对比功能
 */

// Store selected plans for comparison
const selectedPlansForCompare = new Set();

function initCompare() {
  const compareButtonEl = document.querySelector("#compareButton");
  const comparePanelEl = document.querySelector("#comparePanel");
  const closeCompareEl = document.querySelector("#closeCompare");
  const clearCompareEl = document.querySelector("#clearCompare");

  if (!compareButtonEl || !comparePanelEl) return;

  compareButtonEl.addEventListener("click", () => {
    if (selectedPlansForCompare.size < 2) {
      alert("请至少选择 2 个套餐进行比较");
      return;
    }
    comparePanelEl.classList.add("open");
    renderComparePanel();
  });

  closeCompareEl?.addEventListener("click", () => {
    comparePanelEl.classList.remove("open");
  });

  clearCompareEl?.addEventListener("click", () => {
    selectedPlansForCompare.clear();
    updateCompareCount();
    renderComparePanel();
    // Uncheck all checkboxes
    document.querySelectorAll(".compare-checkbox").forEach((cb) => {
      cb.checked = false;
    });
  });
}

function togglePlanCompare(provider, planName, checked) {
  const key = `${provider}::${planName}`;
  if (checked) {
    selectedPlansForCompare.add(key);
  } else {
    selectedPlansForCompare.delete(key);
  }
  updateCompareCount();
}

function updateCompareCount() {
  const compareCountEl = document.querySelector("#compareCount");
  const compareButtonEl = document.querySelector("#compareButton");

  if (compareCountEl) {
    compareCountEl.textContent = selectedPlansForCompare.size;
  }

  if (compareButtonEl) {
    compareButtonEl.disabled = selectedPlansForCompare.size < 2;
    compareButtonEl.textContent =
      selectedPlansForCompare.size < 2
        ? `对比 (${selectedPlansForCompare.size})`
        : `开始对比 (${selectedPlansForCompare.size})`;
  }
}

function renderComparePanel() {
  const compareContentEl = document.querySelector("#compareContent");
  if (!compareContentEl) return;

  const data = window._pricingData;
  if (!data || !data.providers) {
    compareContentEl.innerHTML = "<p>数据加载中...</p>";
    return;
  }

  // Get selected plans data
  const selectedPlans = [];
  for (const key of selectedPlansForCompare) {
    const [providerId, planName] = key.split("::");
    const provider = data.providers.find((p) => p.provider === providerId);
    if (provider) {
      const plan = provider.plans.find((p) => p.name === planName);
      if (plan) {
        selectedPlans.push({
          provider: providerId,
          ...plan,
        });
      }
    }
  }

  if (selectedPlans.length === 0) {
    compareContentEl.innerHTML = "<p>请先选择要对比的套餐</p>";
    return;
  }

  // Render comparison table
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
  const prices = selectedPlans.map((p) => p.currentPrice ?? Number.POSITIVE_INFINITY);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices.filter((p) => p !== Number.POSITIVE_INFINITY));

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

  // Notes row
  const notesRow = document.createElement("tr");
  notesRow.append(createElement("td", "", "备注"));
  for (const plan of selectedPlans) {
    notesRow.append(createElement("td", "", plan.notes || "-"));
  }
  tbody.append(notesRow);

  table.append(tbody);

  compareContentEl.innerHTML = "";
  compareContentEl.append(table);
}

function createElement(tag, className, textContent) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined && textContent !== null) {
    element.textContent = textContent;
  }
  return element;
}

// Export for global access
window.initCompare = initCompare;
window.togglePlanCompare = togglePlanCompare;
window.updateCompareCount = updateCompareCount;
window.renderComparePanel = renderComparePanel;
