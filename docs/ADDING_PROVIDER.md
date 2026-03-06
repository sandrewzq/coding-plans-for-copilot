# 新增厂商开发指南

本文档详细介绍如何为项目添加新的 Coding 套餐厂商。

## 目录

- [前置准备](#前置准备)
- [开发步骤](#开发步骤)
- [厂商套餐变动处理](#厂商套餐变动处理)
- [调试技巧](#调试技巧)
- [常见问题](#常见问题)

---

## 前置准备

### 1. 确认厂商信息

在开始前，请确认以下信息：

- [ ] 厂商是否提供 Coding 套餐（不是通用 API 套餐）
- [ ] 套餐页面的公开访问 URL
- [ ] 套餐是否有月付选项（项目目前只关注月付套餐）

### 2. 分析页面结构

打开浏览器开发者工具（F12），分析页面：

1. **套餐数据是如何渲染的？**
   - 静态 HTML 直接渲染
   - JavaScript 动态加载（AJAX/fetch）
   - 嵌在 JS 文件中的数据

2. **数据格式是什么？**
   - JSON API 接口
   - HTML 表格
   - JavaScript 变量

---

## 开发步骤

### 步骤 1：添加 Provider ID

在 `scripts/utils/index.js` 的 `PROVIDER_IDS` 中添加新厂商：

```javascript
const PROVIDER_IDS = {
  // ... 已有厂商
  ZHIPU: "zhipu-ai",
  KIMI: "kimi-ai",
  // 添加新厂商
  NEWPROVIDER: "newprovider-ai",  // 使用小写和连字符
};
```

**命名规范**：
- 使用小写字母和连字符
- 以 `-ai` 结尾（如果是 AI 厂商）
- 保持简洁，如 `deepseek-ai`、`tencent-hunyuan`

### 步骤 2：创建 Provider 解析文件

在 `scripts/providers/` 目录下创建新的解析文件，如 `newprovider.js`：

```javascript
"use strict";

const {
  PROVIDER_IDS,
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

/**
 * 解析新厂商的 Coding 套餐
 * @returns {Promise<{provider: string, sourceUrls: string[], plans: Plan[]}>}
 */
async function parseNewproviderCodingPlans() {
  const pageUrl = "https://example.com/coding-plan";
  const html = await fetchText(pageUrl);
  
  // 根据页面结构编写解析逻辑
  // 以下是几种常见场景的示例
  
  // ===== 场景 1: 从 HTML 中直接提取 =====
  const plans = extractFromHtml(html, pageUrl);
  
  // ===== 场景 2: 从 API 接口获取 =====
  // const apiUrl = "https://api.example.com/pricing";
  // const data = await fetchJson(apiUrl);
  // const plans = parseApiResponse(data);
  
  // ===== 场景 3: 从 JS 文件提取 =====
  // const scriptUrl = extractScriptUrl(html);
  // const scriptContent = await fetchText(scriptUrl);
  // const plans = extractFromScript(scriptContent);
  
  return {
    provider: PROVIDER_IDS.NEWPROVIDER,
    sourceUrls: unique([pageUrl]),
    plans: dedupePlans(plans),
  };
}

/**
 * 从 HTML 提取套餐数据
 */
function extractFromHtml(html, baseUrl) {
  const plans = [];
  
  // 使用正则或 DOM 解析提取数据
  // 示例：提取表格数据
  const tableRegex = /<table[^>]*class="pricing-table"[^>]*>([\s\S]*?)<\/table>/i;
  const tableMatch = html.match(tableRegex);
  
  if (tableMatch) {
    const rows = extractRows(tableMatch[1]);
    for (const row of rows) {
      const plan = asPlan({
        name: extractName(row),
        currentPrice: extractPrice(row),
        currentPriceText: extractPriceText(row),
        unit: "月",
        notes: extractNotes(row),
        serviceDetails: extractServiceDetails(row),
      });
      plans.push(plan);
    }
  }
  
  return plans;
}

// 辅助函数
function extractName(row) {
  const match = row.match(/<td[^>]*class="name"[^>]*>(.*?)<\/td>/i);
  return match ? normalizeText(match[1]) : null;
}

function extractPrice(row) {
  const match = row.match(/<td[^>]*class="price"[^>]*>.*?([\d.]+).*?<\/td>/i);
  return match ? formatAmount(match[1]) : null;
}

module.exports = parseNewproviderCodingPlans;
```

### 步骤 3：注册 Provider

在 `scripts/fetch-provider-pricing.js` 中注册新厂商：

```javascript
// 1. 导入解析函数
const parseNewproviderCodingPlans = require("./providers/newprovider");

// 2. 添加到任务列表
const tasks = [
  // ... 已有厂商
  { provider: PROVIDER_IDS.NEWPROVIDER, fn: parseNewproviderCodingPlans },
];
```

### 步骤 4：本地测试

运行以下命令测试新厂商：

```bash
# 运行所有厂商的抓取
npm run pricing:fetch

# 查看输出结果
cat docs/provider-pricing.json | grep -A 20 "newprovider-ai"
```

### 步骤 5：验证数据

检查生成的数据格式是否正确：

```json
{
  "provider": "newprovider-ai",
  "sourceUrls": ["https://example.com/coding-plan"],
  "fetchedAt": "2026-03-06T10:00:00.000Z",
  "plans": [
    {
      "name": "基础版",
      "currentPrice": 9.9,
      "currentPriceText": "¥9.9/月",
      "originalPrice": 19.9,
      "originalPriceText": "¥19.9/月",
      "unit": "月",
      "notes": "新用户首月优惠",
      "serviceDetails": [
        "每月 1000 次代码补全",
        "支持 Python、JavaScript"
      ]
    }
  ]
}
```

### 步骤 6：同步厂商列表

运行同步命令更新相关文件：

```bash
npm run pricing:sync
```

这会同步更新：
- `docs/app.js` 中的厂商列表
- `README.md` 中的表格

### 步骤 7：提交代码

```bash
git add scripts/providers/newprovider.js scripts/fetch-provider-pricing.js
git commit -m "feat: add newprovider-ai coding plans support"
git push
```

---

## 厂商套餐变动处理

当厂商页面结构变化导致抓取失败时，按以下流程处理：

### 1. 发现问题

GitHub Actions 会自动创建 Issue，标题格式：
```
抓取失败：{厂商名称} 套餐解析失败
```

### 2. 分析原因

在本地复现问题：

```bash
# 单独测试某个厂商
node -e "
const parse = require('./scripts/providers/newprovider');
parse().then(console.log).catch(console.error);
"
```

常见变动类型：

| 变动类型 | 示例 | 处理方式 |
|---------|------|---------|
| URL 变更 | 页面路径改变 | 更新 `pageUrl` |
| 选择器变更 | CSS class 改名 | 更新正则表达式或选择器 |
| 数据结构变更 | JSON 字段改名 | 更新字段映射 |
| 反爬机制 | 添加验证码 | 评估是否需要调整请求头或使用其他方式 |
| 页面重构 | 整体改版 | 重新分析页面结构，重写解析逻辑 |

### 3. 修复代码

根据变动类型修改解析逻辑，保持向后兼容（如果可能）：

```javascript
// 示例：兼容新旧两种选择器
function extractPrice(html) {
  // 尝试新选择器
  const newMatch = html.match(/data-price="([\d.]+)"/);
  if (newMatch) return formatAmount(newMatch[1]);
  
  // 回退到旧选择器
  const oldMatch = html.match(/class="price[^"]*">\s*¥?\s*([\d.]+)/);
  if (oldMatch) return formatAmount(oldMatch[1]);
  
  return null;
}
```

### 4. 测试验证

```bash
# 本地测试
npm run pricing:fetch

# 验证数据完整性
node scripts/schema-validator.js
```

### 5. 提交修复

```bash
git add scripts/providers/newprovider.js
git commit -m "fix: adapt to newprovider page structure changes"
git push
```

### 6. 关闭 Issue

修复成功后，GitHub Actions 下次运行时会自动更新数据，可以关闭相关的 Issue。

---

## 调试技巧

### 1. 使用浏览器开发者工具

1. **Network 面板**：查看 API 请求和响应
2. **Elements 面板**：查看 DOM 结构
3. **Sources 面板**：查找 JavaScript 数据源

### 2. 本地调试脚本

创建临时调试文件 `debug.js`：

```javascript
const parse = require('./scripts/providers/newprovider');

async function debug() {
  try {
    const result = await parse();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debug();
```

运行：`node debug.js`

### 3. 保存原始响应

在解析函数中添加调试代码：

```javascript
const fs = require('fs');

async function parseNewproviderCodingPlans() {
  const html = await fetchText(pageUrl);
  
  // 保存原始响应用于调试
  if (process.env.DEBUG) {
    fs.writeFileSync('debug_response.html', html);
  }
  
  // ... 解析逻辑
}
```

### 4. 使用 Playwright 调试

对于复杂页面，可以使用 Playwright：

```javascript
const { chromium } = require('playwright');

async function debugWithBrowser() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://example.com/coding-plan');
  
  // 等待数据加载
  await page.waitForSelector('.pricing-card');
  
  // 提取数据
  const plans = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.pricing-card')).map(card => ({
      name: card.querySelector('.title').textContent,
      price: card.querySelector('.price').textContent,
    }));
  });
  
  console.log(plans);
  await browser.close();
}
```

---

## 常见问题

### Q1: 页面需要登录怎么办？

**A**: 本项目只抓取公开页面。如果套餐信息需要登录才能查看，目前不支持。

### Q2: 数据是动态加载的，怎么抓取？

**A**: 检查 Network 面板找到 API 接口，直接请求接口数据。如果接口需要认证，可能需要使用 Playwright 模拟浏览器行为。

### Q3: 如何处理多个套餐类型？

**A**: 只抓取 Coding 相关的月付套餐，过滤掉：
- 年付/季付套餐（只保留月付）
- API 调用套餐
- 通用算力套餐

使用 `keepStandardMonthlyPlans` 工具函数：

```javascript
const { keepStandardMonthlyPlans } = require('../utils');

const monthlyPlans = keepStandardMonthlyPlans(allPlans);
```

### Q4: 价格有多种货币怎么办？

**A**: 统一转换为人民币。使用 `normalizeProviderCurrencySymbols` 工具函数处理货币符号。

### Q5: 如何测试解析函数？

**A**: 编写单元测试：

```javascript
// tests/providers/newprovider.test.js
const parse = require('../../scripts/providers/newprovider');

describe('newprovider parser', () => {
  it('should return valid plan structure', async () => {
    const result = await parse();
    
    expect(result.provider).toBe('newprovider-ai');
    expect(result.plans).toBeInstanceOf(Array);
    expect(result.plans.length).toBeGreaterThan(0);
    
    const plan = result.plans[0];
    expect(plan).toHaveProperty('name');
    expect(plan).toHaveProperty('currentPrice');
    expect(plan).toHaveProperty('unit', '月');
  });
});
```

---

## 工具函数参考

### 数据提取

| 函数 | 用途 | 示例 |
|------|------|------|
| `fetchText(url)` | 获取文本内容 | `const html = await fetchText(url)` |
| `fetchJson(url)` | 获取 JSON 数据 | `const data = await fetchJson(apiUrl)` |
| `extractRows(html)` | 提取表格行 | `const rows = extractRows(tableHtml)` |

### 数据清洗

| 函数 | 用途 | 示例 |
|------|------|------|
| `normalizeText(text)` | 清理文本 | `normalizeText("  Hello  ") // "Hello"` |
| `formatAmount(value)` | 格式化金额 | `formatAmount("1,299.00") // 1299` |
| `decodeHtml(html)` | 解码 HTML 实体 | `decodeHtml("&lt;div&gt;") // "<div>"` |

### 数据构造

| 函数 | 用途 | 示例 |
|------|------|------|
| `asPlan(plan)` | 标准化套餐对象 | `asPlan({ name, price })` |
| `normalizeServiceDetails(notes)` | 标准化服务详情 | `normalizeServiceDetails("支持: Python")` |

### 工具

| 函数 | 用途 | 示例 |
|------|------|------|
| `absoluteUrl(path, base)` | 转换相对 URL | `absoluteUrl("/api", "https://a.com")` |
| `unique(array)` | 去重 | `unique([1,1,2]) // [1,2]` |
| `dedupePlans(plans)` | 套餐去重 | `dedupePlans(plans)` |

---

## 示例：完整的新增厂商流程

以添加 "DeepSeek" 为例：

1. **确认页面**: https://www.deepseek.com/coding
2. **分析结构**: 发现数据在 `window.__INITIAL_STATE__` 中
3. **编写解析器** (`scripts/providers/deepseek.js`):

```javascript
async function parseDeepseekCodingPlans() {
  const pageUrl = "https://www.deepseek.com/coding";
  const html = await fetchText(pageUrl);
  
  // 提取 JSON 数据
  const dataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
  if (!dataMatch) throw new Error("Data not found");
  
  const data = JSON.parse(dataMatch[1]);
  const plans = data.pricing.codingPlans.map(plan => asPlan({
    name: plan.name,
    currentPrice: plan.price,
    currentPriceText: `¥${plan.price}/月`,
    unit: "月",
    notes: plan.description,
    serviceDetails: plan.features,
  }));
  
  return {
    provider: PROVIDER_IDS.DEEPSEEK,
    sourceUrls: [pageUrl],
    plans: dedupePlans(plans),
  };
}
```

4. **注册并测试**: 按照步骤 3-7 完成

---

## 贡献规范

提交新厂商支持时，请确保：

- [ ] 代码通过 ESLint 检查 (`npm run lint`)
- [ ] 本地测试通过 (`npm run pricing:fetch`)
- [ ] 数据通过 schema 验证
- [ ] 提交信息符合规范：`feat: add {provider} coding plans support`

---

如有问题，欢迎提交 Issue 或 PR！
