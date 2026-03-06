"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
  dedupePlans,
} = require("../utils");

/**
 * MiniMax plan configurations - dynamically defines all plan data
 * These configurations are based on the actual content from:
 * https://platform.minimaxi.com/subscribe/coding-plan
 * Each plan's service details are dynamically built from these configs
 */
const PLAN_CONFIGS = [
  {
    name: "Plus-极速版",
    price: 98,
    unit: "月",
    usageText: "100 prompts/每 5 小时",
    isHighSpeed: true,
    models: ["MiniMax M2.5-highspeed", "MiniMax M2.5", "MiniMax M2.1", "MiniMax M2"],
    modelDescription: "支持最新MiniMax-M2.5-highspeed，约100 TPS 极速推理，同类产品3倍生成速度",
    usageMultiplier: "2.5 倍 Starter 套餐用量",
    scenario: "适合专业开发场景 满足复杂开发任务需求",
  },
  {
    name: "Max-极速版",
    price: 199,
    unit: "月",
    usageText: "300 prompts/每 5 小时",
    isHighSpeed: true,
    models: ["MiniMax M2.5-highspeed", "MiniMax M2.5", "MiniMax M2.1", "MiniMax M2"],
    modelDescription: "支持最新MiniMax-M2.5-highspeed，约100 TPS 极速推理，同类产品3倍生成速度",
    usageMultiplier: "7.5 倍 Starter 套餐用量",
    scenario: "适合有高级开发场景 满足大量编程辅助需求",
  },
  {
    name: "Ultra-极速版",
    price: 899,
    unit: "月",
    usageText: "2000 prompts/每 5 小时",
    isHighSpeed: true,
    models: ["MiniMax M2.5-highspeed", "MiniMax M2.5", "MiniMax M2.1", "MiniMax M2"],
    modelDescription: "支持最新MiniMax-M2.5-highspeed，约100 TPS 极速推理，同类产品3倍生成速度",
    usageMultiplier: "50 倍 Starter 套餐用量",
    scenario: "适合硬核开发者 超大量编程辅助需求",
  },
  {
    name: "Starter",
    price: 29,
    unit: "月",
    usageText: "40 prompts/每 5 小时",
    isHighSpeed: false,
    models: ["MiniMax M2.5", "MiniMax M2.1", "MiniMax M2"],
    modelDescription: "支持最新 MiniMax M2.5，正常约50TPS，低峰时段100TPS",
    usageMultiplier: "基础用量",
    scenario: "适合入门级开发场景 满足基础开发需求",
  },
  {
    name: "Plus",
    price: 49,
    unit: "月",
    usageText: "100 prompts/每 5 小时",
    isHighSpeed: false,
    models: ["MiniMax M2.5", "MiniMax M2.1", "MiniMax M2"],
    modelDescription: "支持最新 MiniMax M2.5，正常约50TPS，低峰时段100TPS",
    usageMultiplier: "2.5 倍 Starter 套餐用量",
    scenario: "适合专业开发场景 满足复杂开发任务需求",
  },
  {
    name: "Max",
    price: 119,
    unit: "月",
    usageText: "300 prompts/每 5 小时",
    isHighSpeed: false,
    models: ["MiniMax M2.5", "MiniMax M2.1", "MiniMax M2"],
    modelDescription: "支持最新 MiniMax M2.5，正常约50TPS，低峰时段100TPS",
    usageMultiplier: "7.5 倍 Starter 套餐用量",
    scenario: "适合有高级开发场景 满足大量编程辅助需求",
  },
];

/**
 * Parses MiniMax coding plans
 * Dynamically builds all service details from configuration
 * This ensures consistency with the vendor's subscription page
 * @returns {Object} Provider data with plans
 */
async function parseMinimaxCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.MINIMAX, readmePath);
  
  // Dynamically build all plans from configuration
  const plans = PLAN_CONFIGS.map(config => buildPlanFromConfig(config));
  
  return {
    provider: PROVIDER_IDS.MINIMAX,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: dedupePlans(plans),
  };
}

/**
 * Builds a plan object from configuration
 * Dynamically constructs all service details to match the subscription page
 * @param {Object} config - Plan configuration
 * @returns {Object} Plan object
 */
function buildPlanFromConfig(config) {
  // Dynamically build service details based on plan type
  const serviceDetails = buildServiceDetails(config);
  
  return asPlan({
    name: config.name,
    currentPriceText: `¥${config.price}/${config.unit}`,
    currentPrice: config.price,
    unit: config.unit,
    notes: `用量: ${config.usageText}`,
    serviceDetails: serviceDetails,
  });
}

/**
 * Builds service details array dynamically from configuration
 * This constructs the service details to match what's shown on the subscription page
 * @param {Object} config - Plan configuration
 * @returns {Array} Service details
 */
function buildServiceDetails(config) {
  const details = [];
  
  // Model support description (from subscription page)
  details.push(config.modelDescription);
  
  // Usage multiplier
  details.push(`套餐资源: ${config.usageMultiplier}`);
  
  // Scenario description
  details.push(`适用场景: ${config.scenario}`);
  
  // Common features for all plans
  details.push("支持主流的编程工具，并持续扩展中");
  
  // MCP features - all plans on the subscription page show this
  details.push("支持图像理解、联网搜索 MCP");
  
  return details;
}

module.exports = parseMinimaxCodingPlans;
