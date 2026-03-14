const { fetchText, getProviderUrl, PROVIDER_IDS, absoluteUrl } = require('./scripts/utils');
const path = require('path');

async function debug() {
  const readmePath = path.resolve(__dirname, 'README.md');
  const pageUrl = getProviderUrl(PROVIDER_IDS.ZHIPU, readmePath);

  const html = await fetchText(pageUrl);
  const appPath = html.match(/\/js\/app\.[0-9a-f]+\.js/i)?.[0];
  const appUrl = absoluteUrl(appPath, pageUrl);
  const appJs = await fetchText(appUrl);

  // Find chunks that contain pricing-related keywords
  const chunkMatches = [...appJs.matchAll(/"(chunk-[0-9a-f]+)"\s*:\s*"([0-9a-f]+)"/gi)];

  for (const match of chunkMatches) {
    const chunkName = match[1];
    const chunkHash = match[2];
    const idx = appJs.indexOf(match[0]);
    const context = appJs.slice(Math.max(0, idx - 300), idx + 300).toLowerCase();

    // Look for chunks related to pricing or coding plans
    if (context.includes('glm coding') || context.includes('productname') || context.includes('saleprice')) {
      console.log(`Found relevant chunk: ${chunkName} (${chunkHash})`);

      // Try to fetch and inspect the chunk
      try {
        const chunkUrl = absoluteUrl(`/js/${chunkName}.${chunkHash}.js`, pageUrl);
        const chunkText = await fetchText(chunkUrl);

        // Check if it contains pricing data
        if (chunkText.includes('GLM Coding') && chunkText.includes('salePrice')) {
          console.log(`  -> Contains pricing data!`);

          // Extract sample data
          const productMatches = [...chunkText.matchAll(/productName\s*:\s*"([^"]+)"/g)];
          console.log(`  -> Products: ${productMatches.map(m => m[1]).join(', ')}`);

          // Look for the module structure
          const moduleMatch = chunkText.match(/"(\w+)"\s*:\s*function\s*\([^)]*\)\s*\{[\s\S]*?GLM Coding/);
          if (moduleMatch) {
            console.log(`  -> Module ID: ${moduleMatch[1]}`);
          }

          // Save for inspection
          console.log(`  -> Chunk URL: ${chunkUrl}`);
          break; // Found it
        }
      } catch (e) {
        console.log(`  -> Error fetching chunk: ${e.message}`);
      }
    }
  }
}

debug().catch(console.error);
