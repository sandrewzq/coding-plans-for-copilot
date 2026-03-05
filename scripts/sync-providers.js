#!/usr/bin/env node

"use strict";

/**
 * @fileoverview 自动同步 README.md 中的厂商列表到项目各配置文件
 *
 * 使用方法:
 *   node scripts/sync-providers.js
 *   或
 *   npm run pricing:sync
 *
 * 该脚本会:
 * 1. 从 README.md 解析厂商列表表格
 * 2. 生成 provider ID（根据厂商名称）
 * 3. 更新 docs/app.js 中的 PROVIDER_LABELS, PROVIDER_BUY_URLS, PROVIDER_ORDER
 * 4. 更新 scripts/utils/index.js 中的 PROVIDER_IDS
 * 5. 更新 scripts/fetch-provider-pricing.js 中的任务列表和导入语句
 * 6. 为新厂商自动创建解析器文件模板
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const README_PATH = path.resolve(__dirname, "..", "README.md");
const APP_JS_PATH = path.resolve(__dirname, "..", "docs", "app.js");
const UTILS_PATH = path.resolve(__dirname, "..", "scripts", "utils", "index.js");
const FETCH_PRICING_PATH = path.resolve(__dirname, "..", "scripts", "fetch-provider-pricing.js");
const PROVIDERS_DIR = path.resolve(__dirname, "..", "scripts", "providers");

/**
 * 厂商名称到 ID 的映射表（用于保持一致性）
 * 新厂商将根据规则自动生成 ID
 */
const NAME_TO_ID_MAPPING = {
  "智谱": "zhipu-ai",
  "Kimi": "kimi-ai",
  "MiniMax": "minimax-ai",
  "阿里云百炼": "aliyun-ai",
  "火山引擎": "volcengine-ai",
  "快手 KwaiKAT": "kwaikat-ai",
  "百度智能云千帆": "baidu-qianfan-ai",
  "无问芯穹": "infini-ai",
  "优云智算": "compshare-ai",
  "摩尔线程": "mthreads-ai",
  "X-AIO": "x-aio",
  "Zenmux": "zenmux-ai",
};

/**
 * 厂商名称到常量名的映射
 */
const NAME_TO_CONSTANT_MAPPING = {
  "智谱": "ZHIPU",
  "Kimi": "KIMI",
  "MiniMax": "MINIMAX",
  "阿里云百炼": "ALIYUN",
  "火山引擎": "VOLCENGINE",
  "快手 KwaiKAT": "KWAIKAT",
  "百度智能云千帆": "BAIDU",
  "无问芯穹": "INFINI",
  "优云智算": "COMPSHARE",
  "摩尔线程": "MTHREADS",
  "X-AIO": "XAIO",
  "Zenmux": "ZENMUX",
};

/**
 * 从 README.md 解析厂商列表
 * @returns {Promise<Array<{name: string, url: string, id: string, constant: string}>>}
 */
async function parseProvidersFromReadme() {
  const content = await fs.readFile(README_PATH, "utf-8");

  // 查找厂商列表表格
  const tableMatch = content.match(/\| 厂商 \| 链接 \|[\s\S]*?(?=\n## |\n### |$)/);
  if (!tableMatch) {
    throw new Error("无法在 README.md 中找到厂商列表表格");
  }

  const tableContent = tableMatch[0];
  const lines = tableContent.split("\n").filter((line) => line.startsWith("|") && !line.includes("---"));

  // 跳过表头
  const dataLines = lines.slice(1);

  const providers = [];
  for (const line of dataLines) {
    const cells = line
      .split("|")
      .map((cell) => cell.trim().replace(/\r$/g, ""))  // 移除 Windows 换行符
      .filter(Boolean);

    if (cells.length >= 2) {
      const name = cells[0];
      const url = cells[1];
      const id = NAME_TO_ID_MAPPING[name] || generateProviderId(name);
      const constant = NAME_TO_CONSTANT_MAPPING[name] || generateConstantName(name);

      providers.push({ name, url, id, constant });
    }
  }

  return providers;
}

/**
 * 根据厂商名称生成 provider ID
 * @param {string} name - 厂商名称
 * @returns {string}
 */
function generateProviderId(name) {
  // 转换为小写，移除非字母数字字符，添加 -ai 后缀
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-ai`;
}

/**
 * 根据厂商名称生成常量名
 * @param {string} name - 厂商名称
 * @returns {string}
 */
function generateConstantName(name) {
  // 如果是纯中文，使用拼音转换（简单处理）
  const pinyinMap = {
    "测试厂商": "TEST_PROVIDER",
  };

  if (pinyinMap[name]) {
    return pinyinMap[name];
  }

  // 转换为大写，移除非字母数字字符
  const result = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  // 如果结果为空（全是中文），生成一个基于时间的唯一标识
  if (!result) {
    return `PROVIDER_${Date.now().toString(36).toUpperCase()}`;
  }

  return result;
}

/**
 * 生成解析器文件名（小写）
 * @param {string} constant - 常量名
 * @returns {string}
 */
function generateProviderFileName(constant) {
  return constant.toLowerCase().replace(/_/g, "-");
}

/**
 * 生成解析器函数名
 * @param {string} constant - 常量名
 * @returns {string}
 */
function generateFunctionName(constant) {
  // 将常量名转换为驼峰式函数名
  const lower = constant.toLowerCase();
  return `parse${lower.charAt(0).toUpperCase() + lower.slice(1)}CodingPlans`;
}

/**
 * 创建解析器文件模板
 * @param {string} fileName - 文件名（不含扩展名）
 * @param {string} functionName - 函数名
 * @param {string} url - 厂商页面 URL
 * @param {string} providerName - 厂商名称
 * @returns {string}
 */
function createProviderTemplate(fileName, functionName, url, providerName) {
  return `"use strict";

/**
 * @fileoverview ${providerName} 编码套餐定价解析器
 * 页面地址: ${url}
 *
 * TODO: 需要根据实际页面结构实现解析逻辑
 */

const {
  PROVIDER_IDS,
  fetchText,
  normalizeText,
  formatAmount,
  normalizeServiceDetails,
  asPlan,
  absoluteUrl,
  unique,
  dedupePlans,
} = require("../utils");

/**
 * 解析 ${providerName} 的编码套餐定价
 * @returns {Promise<{provider: string, plans: Array}>}
 */
async function ${functionName}() {
  const pageUrl = "${url}";

  try {
    const html = await fetchText(pageUrl);

    // TODO: 根据实际页面结构提取定价信息
    // 示例：提取表格数据
    // const plans = extractPlansFromHtml(html);

    // 临时返回空数据，需要开发者手动实现解析逻辑
    console.warn(\`[${providerName}] 解析器尚未实现，请根据页面结构完善\\n  页面地址: \${pageUrl}\`);

    return {
      provider: PROVIDER_IDS.${fileName.toUpperCase().replace(/-/g, "_")},
      plans: [],
    };
  } catch (error) {
    throw new Error(\`Failed to parse ${providerName} coding plans: \${error.message}\`);
  }
}

module.exports = ${functionName};
`;
}

/**
 * 检查并创建解析器文件
 * @param {Array<{name: string, url: string, constant: string}>} providers
 * @returns {Promise<Array<string>>} 返回新创建的文件列表
 */
async function ensureProviderFiles(providers) {
  const newFiles = [];

  for (const provider of providers) {
    const fileName = generateProviderFileName(provider.constant);
    const filePath = path.join(PROVIDERS_DIR, `${fileName}.js`);

    try {
      // 检查文件是否已存在
      await fs.access(filePath);
      // 文件存在，跳过
    } catch {
      // 文件不存在，创建模板
      const functionName = generateFunctionName(provider.constant);
      const template = createProviderTemplate(fileName, functionName, provider.url, provider.name);

      await fs.writeFile(filePath, template, "utf-8");
      newFiles.push(filePath);
      console.log(`[sync] 创建解析器模板: ${filePath}`);
    }
  }

  return newFiles;
}

/**
 * 更新 docs/app.js
 * @param {Array<{name: string, url: string, id: string}>} providers
 */
async function updateAppJs(providers) {
  let content = await fs.readFile(APP_JS_PATH, "utf-8");

  // 更新 PROVIDER_LABELS
  const labelsEntries = providers.map((p) => `  "${p.id}": "${p.name}"`);
  const labelsPattern = /const PROVIDER_LABELS = \{[\s\S]*?\};/;
  const labelsReplacement = `const PROVIDER_LABELS = {\n${labelsEntries.join(",\n")},\n};`;
  content = content.replace(labelsPattern, labelsReplacement);

  // 更新 PROVIDER_BUY_URLS
  const urlsEntries = providers.map((p) => `  "${p.id}": "${p.url}"`);
  const urlsPattern = /const PROVIDER_BUY_URLS = \{[\s\S]*?\};/;
  const urlsReplacement = `const PROVIDER_BUY_URLS = {\n${urlsEntries.join(",\n")},\n};`;
  content = content.replace(urlsPattern, urlsReplacement);

  // 更新 PROVIDER_ORDER
  const orderEntries = providers.map((p) => `  "${p.id}"`);
  const orderPattern = /const PROVIDER_ORDER = \[[\s\S]*?\];/;
  const orderReplacement = `const PROVIDER_ORDER = [\n${orderEntries.join(",\n")},\n];`;
  content = content.replace(orderPattern, orderReplacement);

  await fs.writeFile(APP_JS_PATH, content, "utf-8");
  console.log(`[sync] 已更新 ${APP_JS_PATH}`);
}

/**
 * 更新 scripts/utils/index.js 中的 PROVIDER_IDS
 * @param {Array<{name: string, id: string, constant: string}>} providers
 */
async function updateUtilsProviderIds(providers) {
  let content = await fs.readFile(UTILS_PATH, "utf-8");

  // 构建新的 PROVIDER_IDS 对象
  const entries = providers.map((p) => `  ${p.constant}: "${p.id}"`);
  const pattern = /const PROVIDER_IDS = \{[\s\S]*?\};/;
  const replacement = `const PROVIDER_IDS = {\n${entries.join(",\n")},\n};`;

  content = content.replace(pattern, replacement);

  await fs.writeFile(UTILS_PATH, content, "utf-8");
  console.log(`[sync] 已更新 ${UTILS_PATH}`);
}

/**
 * 更新 scripts/fetch-provider-pricing.js 中的导入语句和任务列表
 * @param {Array<{name: string, id: string, constant: string}>} providers
 */
async function updateFetchPricingScript(providers) {
  let content = await fs.readFile(FETCH_PRICING_PATH, "utf-8");

  // 1. 更新导入语句 - 只替换 providers 相关的导入
  const importStatements = providers.map((p) => {
    const fileName = generateProviderFileName(p.constant);
    const fnName = generateFunctionName(p.constant);
    return `const ${fnName} = require("./providers/${fileName}");`;
  });

  // 找到 providers 导入语句的区域（在 "use strict" 之后，其他 require 之前）
  // 先删除所有现有的 providers 导入
  const providerImportsPattern = /const parse\w+CodingPlans = require\("\.\/providers\/\w+"\);\n/g;
  content = content.replace(providerImportsPattern, "");

  // 在文件顶部的 "use strict"; 之后插入新的导入语句块
  // 查找 "use strict"; 后的第一个空行或 require 语句
  const strictEndPattern = /("use strict";\n)(\n)?/;
  const importsBlock = `"use strict";\n\n${importStatements.join("\n")}\n`;
  content = content.replace(strictEndPattern, importsBlock);

  // 2. 更新 tasks 数组
  const taskEntries = providers.map((p) => {
    const fnName = generateFunctionName(p.constant);
    return `    { provider: PROVIDER_IDS.${p.constant}, fn: ${fnName} }`;
  });

  const tasksPattern = /const tasks = \[[\s\S]*?\];/;
  const tasksReplacement = `const tasks = [\n${taskEntries.join(",\n")},\n  ];`;
  content = content.replace(tasksPattern, tasksReplacement);

  await fs.writeFile(FETCH_PRICING_PATH, content, "utf-8");
  console.log(`[sync] 已更新 ${FETCH_PRICING_PATH}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log("[sync] 开始同步厂商列表...\n");

    // 1. 从 README 解析厂商列表
    const providers = await parseProvidersFromReadme();
    console.log(`[sync] 从 README 解析到 ${providers.length} 个厂商:`);
    for (const p of providers) {
      console.log(`  - ${p.name} (${p.id})`);
    }
    console.log();

    // 2. 检查并创建解析器文件
    const newFiles = await ensureProviderFiles(providers);
    if (newFiles.length > 0) {
      console.log(`\n[sync] 创建了 ${newFiles.length} 个新的解析器模板文件`);
      for (const file of newFiles) {
        console.log(`  - ${path.basename(file)}`);
      }
      console.log();
    }

    // 3. 更新各配置文件
    await updateAppJs(providers);
    await updateUtilsProviderIds(providers);
    await updateFetchPricingScript(providers);

    console.log("\n[sync] ✅ 厂商列表同步完成！");
    console.log("[sync] 已更新的文件:");
    console.log("  - docs/app.js");
    console.log("  - scripts/utils/index.js");
    console.log("  - scripts/fetch-provider-pricing.js");
    if (newFiles.length > 0) {
      console.log("[sync] 新创建的解析器模板:");
      for (const file of newFiles) {
        console.log(`  - ${file}`);
      }
      console.log("\n[sync] ⚠️  请完善新创建的解析器文件中的 TODO 部分");
    }
  } catch (error) {
    console.error("[sync] ❌ 同步失败:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
