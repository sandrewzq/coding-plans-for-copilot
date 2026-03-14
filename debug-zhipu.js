const { fetchText, getProviderUrl, PROVIDER_IDS, absoluteUrl } = require('./scripts/utils');
const path = require('path');

async function debug() {
  const readmePath = path.resolve(__dirname, 'README.md');
  const pageUrl = getProviderUrl(PROVIDER_IDS.ZHIPU, readmePath);
  console.log('Page URL:', pageUrl);

  const html = await fetchText(pageUrl);
  const appPath = html.match(/\/js\/app\.[0-9a-f]+\.js/i)?.[0];
  console.log('App path:', appPath);

  if (!appPath) {
    console.log('No app path found');
    return;
  }

  const appUrl = absoluteUrl(appPath, pageUrl);
  console.log('App URL:', appUrl);

  const appJs = await fetchText(appUrl);

  // Look for chunk patterns
  const chunkMatches = [...appJs.matchAll(/"(chunk-[0-9a-f]+)"\s*:\s*"([0-9a-f]+)"/gi)];
  console.log('Total chunks:', chunkMatches.length);
  console.log('First 10 chunks:', chunkMatches.slice(0, 10).map(m => m[0]));

  // Look for specific pricing chunk
  const pricingChunkMatch = appJs.match(/"(chunk-0d4f69d1)"\s*:\s*"([0-9a-f]+)"/i);
  console.log('Pricing chunk match:', pricingChunkMatch);

  // Look for any chunk containing "coding" or "pricing"
  const codingChunks = chunkMatches.filter(m =>
    appJs.slice(appJs.indexOf(m[0]) - 200, appJs.indexOf(m[0]) + 200).toLowerCase().includes('coding')
  );
  console.log('Coding-related chunks:', codingChunks.map(m => m[0]));
}

debug().catch(console.error);
