const { fetchText, getProviderUrl, PROVIDER_IDS } = require('./scripts/utils');
const path = require('path');

async function debug() {
  const readmePath = path.resolve(__dirname, 'README.md');
  const pageUrl = getProviderUrl(PROVIDER_IDS.ZHIPU, readmePath);
  console.log('Page URL:', pageUrl);

  const html = await fetchText(pageUrl);
  console.log('HTML length:', html.length);

  // Check if it contains the expected content
  console.log('Contains "GLM Coding":', html.includes('GLM Coding'));
  console.log('Contains "package-item":', html.includes('package-item'));
  console.log('Contains "package-card":', html.includes('package-card'));

  // Save a sample of the HTML
  console.log('\nFirst 2000 chars of HTML:');
  console.log(html.slice(0, 2000));

  console.log('\n\nSearching for GLM Coding in HTML:');
  const glmMatches = [...html.matchAll(/GLM Coding[^<]*/g)];
  console.log('Found', glmMatches.length, 'matches');
  glmMatches.slice(0, 5).forEach(m => console.log('  -', m[0]));
}

debug().catch(console.error);
