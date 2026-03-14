#!/usr/bin/env node

"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {
  REQUEST_CONTEXT,
  REQUEST_TIMEOUT_MS,
  PROVIDER_IDS,
  keepStandardMonthlyPlans,
  normalizeServiceDetails,
  normalizeProviderCurrencySymbols,
} = require("./utils");
const { validatePricingData } = require("./schema-validator");
const { updateHistory } = require("./price-history");

const OUTPUT_FILE = path.resolve(__dirname, "..", "docs", "provider-pricing.json");
const TASK_TIMEOUT_MS = 30_000;

const parse88codeCodingPlans = require("./providers/88code");
const parseAliyunCodingPlans = require("./providers/aliyun");
const parseBaiduCodingPlans = require("./providers/baidu");
const parseChutesCodingPlans = require("./providers/chutes");
const parseCompshareCodingPlans = require("./providers/compshare");
const parseHongmaccCodingPlans = require("./providers/hongmacc");
const parseInfiniCodingPlans = require("./providers/infini");
const parseKimiCodingPlans = require("./providers/kimi");
const parseKwaikatCodingPlans = require("./providers/kwaikat");
const parseMinimaxCodingPlans = require("./providers/minimax");
const parseMthreadsCodingPlans = require("./providers/mthreads");
const parseSssaicodeCodingPlans = require("./providers/sssaicode");
const parseTencentCloudCodingPlans = require("./providers/tencent-cloud");
const parseToprouterCodingPlans = require("./providers/toprouter");
const parseUucodeCodingPlans = require("./providers/uucode");
const parseVolcengineCodingPlans = require("./providers/volcengine");
const parseXaioCodingPlans = require("./providers/xaio");
const parseYescodeCodingPlans = require("./providers/yescode");
const parseZenmuxCodingPlans = require("./providers/zenmux");
const parseZhipuCodingPlans = require("./providers/zhipu");

async function runTaskWithTimeout(task) {
  const controller = new AbortController();
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(new Error(`Task timed out after ${TASK_TIMEOUT_MS}ms`));
    }, TASK_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      REQUEST_CONTEXT.run(
        {
          timeoutMs: REQUEST_TIMEOUT_MS,
          signal: controller.signal,
        },
        () => task(),
      ),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function main() {
  const providers = [];
  const failures = [];
  const tasks = [
    { provider: PROVIDER_IDS.ZHIPU, fn: parseZhipuCodingPlans, name: "智谱" },
    { provider: PROVIDER_IDS.KIMI, fn: parseKimiCodingPlans, name: "Kimi" },
    { provider: PROVIDER_IDS.MINIMAX, fn: parseMinimaxCodingPlans, name: "MiniMax" },
    { provider: PROVIDER_IDS.ALIYUN, fn: parseAliyunCodingPlans, name: "阿里云百炼" },
    { provider: PROVIDER_IDS.VOLCENGINE, fn: parseVolcengineCodingPlans, name: "火山引擎" },
    { provider: PROVIDER_IDS.TENCENT_CLOUD, fn: parseTencentCloudCodingPlans, name: "腾讯云" },
    { provider: PROVIDER_IDS.KWAIKAT, fn: parseKwaikatCodingPlans, name: "快手 KwaiKAT" },
    { provider: PROVIDER_IDS.BAIDU, fn: parseBaiduCodingPlans, name: "百度智能云千帆" },
    { provider: PROVIDER_IDS.INFINI, fn: parseInfiniCodingPlans, name: "无问芯穹" },
    { provider: PROVIDER_IDS.COMPSHARE, fn: parseCompshareCodingPlans, name: "优云智算" },
    { provider: PROVIDER_IDS.MTHREADS, fn: parseMthreadsCodingPlans, name: "摩尔线程" },
    { provider: PROVIDER_IDS.XAIO, fn: parseXaioCodingPlans, name: "X-AIO" },
    { provider: PROVIDER_IDS.ZENMUX, fn: parseZenmuxCodingPlans, name: "ZenMux" },
    { provider: PROVIDER_IDS.CHUTES, fn: parseChutesCodingPlans, name: "Chutes" },
    { provider: PROVIDER_IDS.CODE88, fn: parse88codeCodingPlans, name: "88code" },
    { provider: PROVIDER_IDS.SSSAICODE, fn: parseSssaicodeCodingPlans, name: "SSSAiCode" },
    { provider: PROVIDER_IDS.YESCODE, fn: parseYescodeCodingPlans, name: "YesCode" },
    { provider: PROVIDER_IDS.TOPROUTER, fn: parseToprouterCodingPlans, name: "Top Router" },
    { provider: PROVIDER_IDS.UUCODE, fn: parseUucodeCodingPlans, name: "UUcode" },
    { provider: PROVIDER_IDS.HONGMACC, fn: parseHongmaccCodingPlans, name: "HongMaCC" },
  ];

  console.log(`\n开始抓取 ${tasks.length} 个厂商的定价数据...\n`);

  const results = await Promise.allSettled(tasks.map((task) => runTaskWithTimeout(task.fn)));
  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const result = results[index];
    if (result.status === "rejected") {
      const message = result.reason?.message || String(result.reason || "unknown error");
      const failureMessage = `${task.provider}: ${message}`;
      failures.push(failureMessage);
      console.warn(`  ✗ ${task.name} - 失败: ${message}`);
      continue;
    }

    try {
      const data = result.value;
      // HongMaCC has both monthly plans and pay-as-you-go plans, keep all
      const plansToKeep = data.provider === PROVIDER_IDS.HONGMACC
        ? (data.plans || [])
        : keepStandardMonthlyPlans(data.plans || []);
      const monthlyPlans = plansToKeep
        .map((plan) => {
          const serviceDetails = plan.serviceDetails !== undefined
            ? plan.serviceDetails
            : normalizeServiceDetails(plan.notes);
          return {
            ...plan,
            serviceDetails,
          };
        })
        .filter((plan) => plan.name && (plan.currentPriceText || plan.notes || (plan.serviceDetails || []).length > 0));
      if (monthlyPlans.length === 0) {
        throw new Error(`${data.provider}: no standard monthly plans found`);
      }
      providers.push({
        ...data,
        plans: monthlyPlans,
      });
      console.log(`  ✓ ${task.name} - 成功 (${monthlyPlans.length} 个套餐)`);
    } catch (error) {
      const message = error?.message || String(error || "unknown error");
      const failureMessage = `${task.provider}: ${message}`;
      failures.push(failureMessage);
      console.warn(`  ✗ ${task.name} - 失败: ${message}`);
    }
  }

  console.log(`\n----------------------------------------`);
  console.log(`抓取完成: ${providers.length}/${tasks.length} 个厂商成功`);

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    providers: normalizeProviderCurrencySymbols(providers),
    failures,
  };

  const validation = validatePricingData(output);
  if (!validation.isValid) {
    console.error("\n✗ 数据验证失败:");
    validation.errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error("Output data validation failed");
  }
  console.log("✓ 数据验证通过");

  const outputText = `${JSON.stringify(output, null, 2)}\n`;

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, outputText, "utf8");
  console.log(`✓ 数据已保存: ${OUTPUT_FILE}`);

  if (failures.length > 0) {
    console.log(`\n⚠ 失败详情 (${failures.length} 个):`);
    failures.forEach((failure) => console.log(`  - ${failure}`));
  }

  try {
    const changes = updateHistory(output);
    if (changes.length > 0) {
      console.log(`\n✓ 检测到 ${changes.length} 个价格变动`);
    } else {
      console.log("\n✓ 无价格变动");
    }
  } catch (error) {
    console.warn(`\n⚠ 价格历史更新失败: ${error.message}`);
  }

  console.log("----------------------------------------\n");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[pricing] fatal error:", error);
    process.exit(1);
  });
}
