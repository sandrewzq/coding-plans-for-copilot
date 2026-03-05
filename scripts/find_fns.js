const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'fetch-provider-pricing.js');
const src = fs.readFileSync(srcPath, 'utf8');

// I'll manually create utils.js and providers.js but maybe first just log the functions
const functionRegex = /^(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/gm;
let m;
const functions = [];
while ((m = functionRegex.exec(src)) !== null) {
    functions.push(m[1]);
}
console.log('Functions found:', functions.join(', '));
