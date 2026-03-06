#!/usr/bin/env node

"use strict";

/**
 * Price history tracker for provider pricing data
 * Tracks price changes over time and generates history records
 */

const fs = require("node:fs");
const path = require("node:path");

const PRICING_FILE = path.resolve(__dirname, "..", "docs", "provider-pricing.json");
const HISTORY_FILE = path.resolve(__dirname, "..", "docs", "price-history.json");
const MAX_HISTORY_DAYS = 90; // Keep 90 days of history

/**
 * Loads the current pricing data
 * @returns {Object|null} The pricing data or null if not found
 */
function loadPricingData() {
  try {
    const data = fs.readFileSync(PRICING_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.warn(`[history] Failed to load pricing data: ${error.message}`);
    return null;
  }
}

/**
 * Loads the existing price history
 * @returns {Object} The price history data
 */
function loadHistory() {
  try {
    const data = fs.readFileSync(HISTORY_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      history: [],
    };
  }
}

/**
 * Saves the price history to file
 * @param {Object} history - The history data to save
 */
function saveHistory(history) {
  const outputText = `${JSON.stringify(history, null, 2)}\n`;
  fs.writeFileSync(HISTORY_FILE, outputText, "utf8");
}

/**
 * Creates a unique key for a plan
 * @param {string} provider - Provider ID
 * @param {string} planName - Plan name
 * @returns {string} Unique plan key
 */
function getPlanKey(provider, planName) {
  return `${provider}:${planName}`;
}

/**
 * Extracts price information from a plan
 * @param {Object} plan - The plan object
 * @returns {Object} Price information
 */
function extractPriceInfo(plan) {
  return {
    currentPrice: plan.currentPrice,
    currentPriceText: plan.currentPriceText,
    originalPrice: plan.originalPrice,
    originalPriceText: plan.originalPriceText,
    unit: plan.unit,
    notes: plan.notes,
  };
}

/**
 * Compares two price info objects
 * @param {Object} oldPrice - Old price info
 * @param {Object} newPrice - New price info
 * @returns {boolean} True if prices are different
 */
function hasPriceChanged(oldPrice, newPrice) {
  if (!oldPrice || !newPrice) {return true;}
  
  return (
    oldPrice.currentPrice !== newPrice.currentPrice ||
    oldPrice.originalPrice !== newPrice.originalPrice ||
    oldPrice.currentPriceText !== newPrice.currentPriceText ||
    oldPrice.originalPriceText !== newPrice.originalPriceText ||
    oldPrice.unit !== newPrice.unit
  );
}

/**
 * Detects price changes between current and previous data
 * @param {Object} currentData - Current pricing data
 * @param {Object} previousData - Previous pricing data (from last history entry)
 * @returns {Array} Array of price change records
 */
function detectPriceChanges(currentData, previousData) {
  const changes = [];
  const timestamp = new Date().toISOString();
  
  // Build map of previous prices
  const previousPrices = new Map();
  if (previousData && previousData.providers) {
    for (const provider of previousData.providers) {
      for (const plan of provider.plans || []) {
        const key = getPlanKey(provider.provider, plan.name);
        previousPrices.set(key, extractPriceInfo(plan));
      }
    }
  }
  
  // Compare with current prices
  for (const provider of currentData.providers || []) {
    for (const plan of provider.plans || []) {
      const key = getPlanKey(provider.provider, plan.name);
      const currentPrice = extractPriceInfo(plan);
      const previousPrice = previousPrices.get(key);
      
      if (hasPriceChanged(previousPrice, currentPrice)) {
        changes.push({
          timestamp,
          provider: provider.provider,
          planName: plan.name,
          previousPrice,
          currentPrice,
          changeType: previousPrice ? "updated" : "new",
        });
      }
    }
  }
  
  // Check for removed plans
  const currentPlanKeys = new Set();
  for (const provider of currentData.providers || []) {
    for (const plan of provider.plans || []) {
      currentPlanKeys.add(getPlanKey(provider.provider, plan.name));
    }
  }
  
  for (const [key, previousPrice] of previousPrices) {
    if (!currentPlanKeys.has(key)) {
      const [provider, planName] = key.split(":");
      changes.push({
        timestamp,
        provider,
        planName,
        previousPrice,
        currentPrice: null,
        changeType: "removed",
      });
    }
  }
  
  return changes;
}

/**
 * Checks if any price has changed between current and previous data
 * @param {Object} currentData - Current pricing data
 * @param {Object} previousData - Previous pricing data
 * @returns {boolean} True if any price has changed
 */
function hasAnyPriceChanged(currentData, previousData) {
  if (!previousData || !previousData.providers) {
    return true; // No previous data, consider as changed
  }
  
  // Build map of previous prices
  const previousPrices = new Map();
  for (const provider of previousData.providers) {
    for (const plan of provider.plans || []) {
      const key = getPlanKey(provider.provider, plan.name);
      previousPrices.set(key, extractPriceInfo(plan));
    }
  }
  
  // Check current prices
  for (const provider of currentData.providers || []) {
    for (const plan of provider.plans || []) {
      const key = getPlanKey(provider.provider, plan.name);
      const currentPrice = extractPriceInfo(plan);
      const previousPrice = previousPrices.get(key);
      
      if (hasPriceChanged(previousPrice, currentPrice)) {
        return true;
      }
    }
  }
  
  // Check for removed plans
  const currentPlanKeys = new Set();
  for (const provider of currentData.providers || []) {
    for (const plan of provider.plans || []) {
      currentPlanKeys.add(getPlanKey(provider.provider, plan.name));
    }
  }
  
  for (const key of previousPrices.keys()) {
    if (!currentPlanKeys.has(key)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Updates the price history with new data
 * Only adds a new snapshot if prices have changed
 * @param {Object} currentData - Current pricing data
 * @returns {Array} Array of detected changes
 */
function updateHistory(currentData) {
  const history = loadHistory();
  
  // Get previous data from last snapshot
  const lastSnapshot = history.history[history.history.length - 1];
  const previousData = lastSnapshot ? {
    providers: lastSnapshot.providers,
  } : null;
  
  // Detect changes
  const changes = detectPriceChanges(currentData, previousData);
  
  // Only add new snapshot if prices have changed
  const shouldAddSnapshot = hasAnyPriceChanged(currentData, previousData);
  
  if (shouldAddSnapshot) {
    // Create new snapshot
    const snapshot = {
      timestamp: new Date().toISOString(),
      providers: (currentData.providers || []).map((provider) => ({
        provider: provider.provider,
        plans: (provider.plans || []).map((plan) => ({
          name: plan.name,
          ...extractPriceInfo(plan),
        })),
      })),
    };
    
    // Add to history
    history.history.push(snapshot);
    
    // Keep only recent history
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS);
    
    history.history = history.history.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
    
    console.log(`[history] Added new snapshot with ${changes.length} changes`);
  } else {
    console.log("[history] No price changes detected, skipping snapshot");
  }
  
  // Update metadata
  history.updatedAt = new Date().toISOString();
  history.lastChanges = changes;
  
  saveHistory(history);
  
  return changes;
}

/**
 * Gets price trend for a specific plan
 * @param {string} provider - Provider ID
 * @param {string} planName - Plan name
 * @returns {Array} Price history for the plan
 */
function getPlanPriceTrend(provider, planName) {
  const history = loadHistory();
  const key = getPlanKey(provider, planName);
  const trend = [];
  
  for (const snapshot of history.history || []) {
    for (const p of snapshot.providers || []) {
      if (p.provider !== provider) {continue;}
      
      for (const plan of p.plans || []) {
        if (plan.name === planName) {
          trend.push({
            timestamp: snapshot.timestamp,
            currentPrice: plan.currentPrice,
            currentPriceText: plan.currentPriceText,
            originalPrice: plan.originalPrice,
            originalPriceText: plan.originalPriceText,
          });
        }
      }
    }
  }
  
  return trend;
}

/**
 * Gets all price changes in the last N days
 * @param {number} days - Number of days to look back
 * @returns {Array} Recent price changes
 */
function getRecentChanges(days = 7) {
  const history = loadHistory();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const changes = [];
  
  for (let i = 1; i < history.history.length; i++) {
    const current = history.history[i];
    const previous = history.history[i - 1];
    
    if (new Date(current.timestamp) < cutoffDate) {continue;}
    
    const detected = detectPriceChanges(
      { providers: current.providers },
      { providers: previous.providers }
    );
    
    changes.push(...detected);
  }
  
  return changes;
}

/**
 * Main function to update price history
 */
function main() {
  console.log("[history] Updating price history...");
  
  const currentData = loadPricingData();
  if (!currentData) {
    console.error("[history] No pricing data available");
    process.exit(1);
  }
  
  const changes = updateHistory(currentData);
  
  console.log(`[history] Detected ${changes.length} price changes`);
  
  for (const change of changes) {
    const provider = change.provider;
    const plan = change.planName;
    const type = change.changeType;
    
    if (type === "updated") {
      const oldPrice = change.previousPrice?.currentPriceText || "N/A";
      const newPrice = change.currentPrice?.currentPriceText || "N/A";
      console.log(`  [${type}] ${provider} - ${plan}: ${oldPrice} → ${newPrice}`);
    } else if (type === "new") {
      const newPrice = change.currentPrice?.currentPriceText || "N/A";
      console.log(`  [${type}] ${provider} - ${plan}: ${newPrice}`);
    } else if (type === "removed") {
      console.log(`  [${type}] ${provider} - ${plan}`);
    }
  }
  
  console.log(`[history] History saved to ${HISTORY_FILE}`);
}

module.exports = {
  loadPricingData,
  loadHistory,
  updateHistory,
  getPlanPriceTrend,
  getRecentChanges,
  detectPriceChanges,
};

if (require.main === module) {
  main();
}
