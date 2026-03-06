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

const parseAliyunCodingPlans = require("./providers/aliyun");
const parseBaiduCodingPlans = require("./providers/baidu");
const parseChutesCodingPlans = require("./providers/chutes");
const parseCompshareCodingPlans = require("./providers/compshare");
const parseInfiniCodingPlans = require("./providers/infini");
const parseKimiCodingPlans = require("./providers/kimi");
const parseKwaikatCodingPlans = require("./providers/kwaikat");
const parseMinimaxCodingPlans = require("./providers/minimax");
const parseMthreadsCodingPlans = require("./providers/mthreads");
const parseVolcengineCodingPlans = require("./providers/volcengine");
const parseXaioCodingPlans = require("./providers/xaio");
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
    { provider: PROVIDER_IDS.ZHIPU, fn: parseZhipuCodingPlans },
    { provider: PROVIDER_IDS.KIMI, fn: parseKimiCodingPlans },
    { provider: PROVIDER_IDS.MINIMAX, fn: parseMinimaxCodingPlans },
    { provider: PROVIDER_IDS.ALIYUN, fn: parseAliyunCodingPlans },
    { provider: PROVIDER_IDS.VOLCENGINE, fn: parseVolcengineCodingPlans },
    { provider: PROVIDER_IDS.KWAIKAT, fn: parseKwaikatCodingPlans },
    { provider: PROVIDER_IDS.BAIDU, fn: parseBaiduCodingPlans },
    { provider: PROVIDER_IDS.INFINI, fn: parseInfiniCodingPlans },
    { provider: PROVIDER_IDS.COMPSHARE, fn: parseCompshareCodingPlans },
    { provider: PROVIDER_IDS.MTHREADS, fn: parseMthreadsCodingPlans },
    { provider: PROVIDER_IDS.XAIO, fn: parseXaioCodingPlans },
    { provider: PROVIDER_IDS.ZENMUX, fn: parseZenmuxCodingPlans },
    { provider: PROVIDER_IDS.CHUTES, fn: parseChutesCodingPlans },
  ];

  const results = await Promise.allSettled(tasks.map((task) => runTaskWithTimeout(task.fn)));
  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const result = results[index];
    if (result.status === "rejected") {
      const message = result.reason?.message || String(result.reason || "unknown error");
      const failureMessage = `${task.provider}: ${message}`;
      failures.push(failureMessage);
      console.warn(`[pricing] ${task.fn.name} failed: ${message}`);
      continue;
    }

    try {
      const data = result.value;
      const monthlyPlans = keepStandardMonthlyPlans(data.plans || [])
        .map((plan) => {
          const serviceDetails = plan.serviceDetails || normalizeServiceDetails(plan.notes);
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
    } catch (error) {
      const message = error?.message || String(error || "unknown error");
      const failureMessage = `${task.provider}: ${message}`;
      failures.push(failureMessage);
      console.warn(`[pricing] ${task.fn.name} failed: ${message}`);
    }
  }

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    providers: normalizeProviderCurrencySymbols(providers),
    failures,
  };

  // Validate output data before writing
  const validation = validatePricingData(output);
  if (!validation.isValid) {
    console.error("[pricing] Validation failed:");
    validation.errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error("Output data validation failed");
  }
  console.log("[pricing] ✓ Data validation passed");

  const outputText = `${JSON.stringify(output, null, 2)}\n`;

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, outputText, "utf8");

  const summary = providers.map((provider) => `${provider.provider}: ${provider.plans.length}`).join(", ");
  console.log(`[pricing] wrote ${OUTPUT_FILE}`);
  console.log(`[pricing] plans -> ${summary}`);
  if (failures.length > 0) {
    console.log(`[pricing] failures -> ${failures.length}`);
  }

  // Update price history
  try {
    const changes = updateHistory(output);
    if (changes.length > 0) {
      console.log(`[pricing] price changes detected: ${changes.length}`);
    }
  } catch (error) {
    console.warn(`[pricing] Failed to update price history: ${error.message}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[pricing] fatal error:", error);
    process.exit(1);
  });
}
