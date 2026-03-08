"use strict";

const path = require("path");
const {
  PROVIDER_IDS,
  getProviderUrl,
  asPlan,
} = require("../utils");

async function parseChutesCodingPlans() {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const pageUrl = getProviderUrl(PROVIDER_IDS.CHUTES, readmePath);
  // Prices in USD, last verified 2026-03:
  // Base $3/月 (300 requests/day), Plus $10/月 (2000 requests/day),
  // Pro $20/月 (5000 requests/day), Enterprise custom
  return {
    provider: PROVIDER_IDS.CHUTES,
    sourceUrls: [pageUrl],
    fetchedAt: new Date().toISOString(),
    plans: [
      asPlan({
        name: "Base",
        currentPriceText: "$3/月",
        currentPrice: 3,
        unit: "月",
        serviceDetails: [
          "Up to 300 requests/day",
          "5X the value of pay-as-you-go",
          "PAYG requests beyond limit",
        ],
      }),
      asPlan({
        name: "Plus",
        currentPriceText: "$10/月",
        currentPrice: 10,
        unit: "月",
        serviceDetails: [
          "Up to 2,000 requests/day",
          "5X the value of pay-as-you-go",
          "Access to frontier models",
          "PAYG requests beyond limit",
        ],
      }),
      asPlan({
        name: "Pro",
        currentPriceText: "$20/月",
        currentPrice: 20,
        unit: "月",
        notes: "Best Value",
        serviceDetails: [
          "Up to 5,000 requests/day",
          "5X the value of pay-as-you-go",
          "Access to frontier models",
          "PAYG requests beyond limit",
        ],
      }),
      asPlan({
        name: "Enterprise",
        currentPriceText: "Contact us",
        currentPrice: null,
        unit: "月",
        serviceDetails: [
          "Custom billing only",
          "Custom request limits",
          "Dedicated support",
          "SLA guarantees",
        ],
      }),
    ],
  };
}

module.exports = parseChutesCodingPlans;
