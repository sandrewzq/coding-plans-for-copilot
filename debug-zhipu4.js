const { fetchText, getProviderUrl, PROVIDER_IDS, absoluteUrl } = require('./scripts/utils');
const path = require('path');

async function debug() {
  const readmePath = path.resolve(__dirname, 'README.md');
  const pageUrl = getProviderUrl(PROVIDER_IDS.ZHIPU, readmePath);

  const html = await fetchText(pageUrl);

  // Look for SSR data or initial state
  const ssrDataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s) ||
                       html.match(/window\.__APP__\s*=\s*({.+?});/s) ||
                       html.match(/"initialState":\s*({.+?}),/s);

  if (ssrDataMatch) {
    console.log('Found SSR data');
    try {
      const data = JSON.parse(ssrDataMatch[1]);
      console.log('Keys:', Object.keys(data));

      // Look for pricing data
      const findPricing = (obj, path = '') => {
        if (typeof obj !== 'object' || obj === null) return;

        for (const [key, value] of Object.entries(obj)) {
          const newPath = path ? `${path}.${key}` : key;

          if (typeof value === 'string' && value.includes('GLM Coding')) {
            console.log(`Found at ${newPath}:`, value);
          }

          if (typeof value === 'object') {
            findPricing(value, newPath);
          }
        }
      };

      findPricing(data);
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  } else {
    console.log('No SSR data found');
  }

  // Look for any data attributes that might contain pricing
  const dataAttrMatches = [...html.matchAll(/data-[a-z-]+="([^"]*(?:GLM Coding|salePrice|productName)[^"]*)"/gi)];
  console.log('Data attributes with pricing:', dataAttrMatches.length);
  dataAttrMatches.slice(0, 5).forEach(m => console.log('  -', m[0]));

  // Try to find the chunk that contains the pricing component
  // Look for component names in the HTML
  const componentMatches = [...html.matchAll(/data-v-[a-z0-9]+/gi)];
  const uniqueComponents = [...new Set(componentMatches.map(m => m[0]))];
  console.log('Vue components found:', uniqueComponents.length);
  console.log('Component IDs:', uniqueComponents.slice(0, 10));
}

debug().catch(console.error);
