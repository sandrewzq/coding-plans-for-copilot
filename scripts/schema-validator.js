#!/usr/bin/env node

"use strict";

/**
 * Schema validator for provider pricing data
 * Validates the structure and data types of provider-pricing.json
 */

const PROVIDER_IDS = [
  "zhipu-ai",
  "kimi-ai",
  "volcengine-ai",
  "minimax-ai",
  "aliyun-ai",
  "baidu-qianfan-ai",
  "kwaikat-ai",
  "x-aio",
  "compshare-ai",
  "infini-ai",
  "mthreads-ai",
  "zenmux-ai",
  "chutes-ai",
];

/**
 * Validates a single plan object
 * @param {Object} plan - The plan to validate
 * @param {number} index - Plan index for error reporting
 * @returns {string[]} Array of validation errors
 */
function validatePlan(plan, index) {
  const errors = [];
  const prefix = `Plan[${index}]`;

  if (!plan || typeof plan !== "object") {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  // Required fields
  if (typeof plan.name !== "string" || !plan.name.trim()) {
    errors.push(`${prefix}.name: required string field`);
  }

  // Optional fields with type checking
  if (plan.currentPrice !== null && plan.currentPrice !== undefined) {
    if (!Number.isFinite(plan.currentPrice)) {
      errors.push(`${prefix}.currentPrice: must be a finite number or null`);
    }
  }

  if (plan.currentPriceText !== null && plan.currentPriceText !== undefined) {
    if (typeof plan.currentPriceText !== "string") {
      errors.push(`${prefix}.currentPriceText: must be a string or null`);
    }
  }

  if (plan.originalPrice !== null && plan.originalPrice !== undefined) {
    if (!Number.isFinite(plan.originalPrice)) {
      errors.push(`${prefix}.originalPrice: must be a finite number or null`);
    }
  }

  if (plan.originalPriceText !== null && plan.originalPriceText !== undefined) {
    if (typeof plan.originalPriceText !== "string") {
      errors.push(`${prefix}.originalPriceText: must be a string or null`);
    }
  }

  if (plan.unit !== null && plan.unit !== undefined) {
    if (typeof plan.unit !== "string") {
      errors.push(`${prefix}.unit: must be a string or null`);
    }
  }

  if (plan.notes !== null && plan.notes !== undefined) {
    if (typeof plan.notes !== "string") {
      errors.push(`${prefix}.notes: must be a string or null`);
    }
  }

  // Validate serviceDetails array
  if (plan.serviceDetails !== null && plan.serviceDetails !== undefined) {
    if (!Array.isArray(plan.serviceDetails)) {
      errors.push(`${prefix}.serviceDetails: must be an array or null`);
    } else {
      plan.serviceDetails.forEach((detail, detailIndex) => {
        if (typeof detail !== "string") {
          errors.push(`${prefix}.serviceDetails[${detailIndex}]: must be a string`);
        }
      });
    }
  }

  // At least one price field should be present
  if (!plan.currentPriceText && !plan.currentPrice && !plan.notes) {
    errors.push(`${prefix}: must have at least one of currentPriceText, currentPrice, or notes`);
  }

  return errors;
}

/**
 * Validates a provider object
 * @param {Object} provider - The provider to validate
 * @param {number} index - Provider index for error reporting
 * @returns {string[]} Array of validation errors
 */
function validateProvider(provider, index) {
  const errors = [];
  const prefix = `Provider[${index}]`;

  if (!provider || typeof provider !== "object") {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  // Validate provider ID
  if (!PROVIDER_IDS.includes(provider.provider)) {
    errors.push(`${prefix}.provider: must be one of [${PROVIDER_IDS.join(", ")}]`);
  }

  // Validate sourceUrls
  if (!Array.isArray(provider.sourceUrls)) {
    errors.push(`${prefix}.sourceUrls: must be an array`);
  } else {
    provider.sourceUrls.forEach((url, urlIndex) => {
      if (typeof url !== "string" || !url.startsWith("http")) {
        errors.push(`${prefix}.sourceUrls[${urlIndex}]: must be a valid URL string`);
      }
    });
  }

  // Validate fetchedAt
  if (typeof provider.fetchedAt !== "string") {
    errors.push(`${prefix}.fetchedAt: must be an ISO date string`);
  } else {
    const date = new Date(provider.fetchedAt);
    if (Number.isNaN(date.getTime())) {
      errors.push(`${prefix}.fetchedAt: invalid date format`);
    }
  }

  // Validate plans array
  if (!Array.isArray(provider.plans)) {
    errors.push(`${prefix}.plans: must be an array`);
  } else if (provider.plans.length === 0) {
    errors.push(`${prefix}.plans: must contain at least one plan`);
  } else {
    provider.plans.forEach((plan, planIndex) => {
      errors.push(...validatePlan(plan, planIndex));
    });
  }

  return errors;
}

/**
 * Validates the complete pricing data object
 * @param {Object} data - The pricing data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validatePricingData(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Data must be an object"] };
  }

  // Validate schemaVersion
  if (data.schemaVersion !== 1) {
    errors.push(`schemaVersion: expected 1, got ${data.schemaVersion}`);
  }

  // Validate generatedAt
  if (typeof data.generatedAt !== "string") {
    errors.push("generatedAt: must be an ISO date string");
  } else {
    const date = new Date(data.generatedAt);
    if (Number.isNaN(date.getTime())) {
      errors.push("generatedAt: invalid date format");
    }
  }

  // Validate providers array
  if (!Array.isArray(data.providers)) {
    errors.push("providers: must be an array");
  } else {
    data.providers.forEach((provider, index) => {
      errors.push(...validateProvider(provider, index));
    });
  }

  // Validate failures array (optional)
  if (data.failures !== undefined) {
    if (!Array.isArray(data.failures)) {
      errors.push("failures: must be an array");
    } else {
      data.failures.forEach((failure, index) => {
        if (typeof failure !== "string") {
          errors.push(`failures[${index}]: must be a string`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validatePricingData,
  validateProvider,
  validatePlan,
  PROVIDER_IDS,
};

// CLI usage
if (require.main === module) {
  const fs = require("node:fs");
  const path = require("node:path");

  const dataPath = path.resolve(__dirname, "..", "docs", "provider-pricing.json");

  try {
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    const result = validatePricingData(data);

    if (result.isValid) {
      console.log("[validator] ✓ Data validation passed");
      process.exit(0);
    } else {
      console.error("[validator] ✗ Data validation failed:");
      result.errors.forEach((error) => {
        console.error(`  - ${error}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error(`[validator] ✗ Failed to read or parse data: ${error.message}`);
    process.exit(1);
  }
}
