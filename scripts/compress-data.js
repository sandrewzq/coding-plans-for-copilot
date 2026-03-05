#!/usr/bin/env node

"use strict";

/**
 * Compresses provider-pricing.json for optimized delivery
 * Creates both .gz and .br (brotli) compressed versions
 */

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const DOCS_DIR = path.resolve(__dirname, "..", "docs");
const DATA_FILE = path.join(DOCS_DIR, "provider-pricing.json");

function compressFile(inputPath, algorithm) {
  const input = fs.readFileSync(inputPath);
  const outputPath = `${inputPath}.${algorithm === "gzip" ? "gz" : "br"}`;

  let compressed;
  if (algorithm === "gzip") {
    compressed = zlib.gzipSync(input, { level: 9 });
  } else if (algorithm === "brotli") {
    compressed = zlib.brotliCompressSync(input, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      },
    });
  } else {
    throw new Error(`Unknown compression algorithm: ${algorithm}`);
  }

  fs.writeFileSync(outputPath, compressed);

  const originalSize = input.length;
  const compressedSize = compressed.length;
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  console.log(`[compress] ${algorithm}: ${path.basename(outputPath)}`);
  console.log(`  Original: ${originalSize.toLocaleString()} bytes`);
  console.log(`  Compressed: ${compressedSize.toLocaleString()} bytes`);
  console.log(`  Ratio: ${ratio}% smaller`);

  return { outputPath, originalSize, compressedSize, ratio };
}

function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`[compress] Error: ${DATA_FILE} not found`);
    process.exit(1);
  }

  console.log("[compress] Compressing provider-pricing.json...\n");

  const results = [];

  // Gzip compression
  try {
    results.push(compressFile(DATA_FILE, "gzip"));
    console.log();
  } catch (error) {
    console.error(`[compress] Gzip failed: ${error.message}`);
  }

  // Brotli compression
  try {
    results.push(compressFile(DATA_FILE, "brotli"));
    console.log();
  } catch (error) {
    console.error(`[compress] Brotli failed: ${error.message}`);
  }

  // Summary
  console.log("[compress] Summary:");
  for (const result of results) {
    console.log(`  ${path.basename(result.outputPath)}: ${result.ratio}% smaller`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { compressFile };
