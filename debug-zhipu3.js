const { fetchText, getProviderUrl, PROVIDER_IDS, absoluteUrl } = require('./scripts/utils');
const path = require('path');

async function debug() {
  const readmePath = path.resolve(__dirname, 'README.md');
  const pageUrl = getProviderUrl(PROVIDER_IDS.ZHIPU, readmePath);

  const html = await fetchText(pageUrl);

  // Try to extract from HTML directly - look for the package-card structure
  // Based on the HTML you provided:
  // <span data-v-35c5e3de="">GLM Coding Lite</span>
  // <span data-v-35c5e3de="" class="price-unit">￥</span><span data-v-35c5e3de="">132</span><span data-v-35c5e3de="" class="price-unit">/季</span>

  const packageRegex = /<div[^>]*class="package-card[^"]*"[^>]*>[\s\S]*?<\/div><\/div><\/div>/gi;
  const packages = [...html.matchAll(packageRegex)];
  console.log('Found packages:', packages.length);

  // Try to find JSON data embedded in the page
  const jsonDataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/i) ||
                        html.match(/window\.__DATA__\s*=\s*({.+?});/i);
  if (jsonDataMatch) {
    console.log('Found JSON data in page');
    try {
      const data = JSON.parse(jsonDataMatch[1]);
      console.log('Data keys:', Object.keys(data));
    } catch (e) {
      console.log('Failed to parse JSON:', e.message);
    }
  }

  // Look for any script tags with data
  const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log('Script tags found:', scriptMatches.length);

  for (let i = 0; i < Math.min(scriptMatches.length, 10); i++) {
    const content = scriptMatches[i][1];
    if (content.includes('GLM Coding') && content.includes('salePrice')) {
      console.log(`Script ${i} contains pricing data`);
      console.log(content.slice(0, 500));
    }
  }
}

debug().catch(console.error);
