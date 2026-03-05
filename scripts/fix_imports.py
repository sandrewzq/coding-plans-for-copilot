import os

files = ['baidu.js', 'infini.js', 'kwaikat.js', 'minimax.js', 'mthreads.js', 'volcengine.js', 'xaio.js', 'zenmux.js']
dir_path = 'scripts/providers'

utils_import = """const {
  HTML_ENTITIES, CNY_CURRENCY_HINT, USD_CURRENCY_HINT, COMMON_HEADERS, REQUEST_CONTEXT, REQUEST_TIMEOUT_MS,
  PROVIDER_IDS, asPlan, decodeHtml, stripTags, normalizeText, decodeUnicodeLiteral, isPriceLike, parsePriceText,
  compactInlineText, detectCurrencyFromText, normalizeMoneyTextByCurrency, normalizePlanCurrencySymbols,
  normalizeProviderCurrencySymbols, dedupePlans, fetchText, fetchJson, extractRows, formatAmount,
  normalizeServiceDetails, buildServiceDetailsFromRows, absoluteUrl, unique, timeUnitLabel, isMonthlyUnit,
  isMonthlyPriceText, isStandardMonthlyPlan, keepStandardMonthlyPlans, stripSimpleMarkdown
} = require("../utils");"""

for filename in files:
    filepath = os.path.join(dir_path, filename)
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf8') as f:
        content = f.read()
    
    # Remove old long import
    content = os.linesep.join([line for line in content.splitlines() if 'require("../utils")' not in line])
    # Remove PROVIDER_IDS block
    import re
    content = re.sub(r'const PROVIDER_IDS = \{.*?\};', '', content, flags=re.DOTALL)
    
    # Add new import at the top
    content = '"use strict";\n\n' + utils_import + '\n' + content.replace('"use strict";', '')
    
    # Clean up double newlines
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    with open(filepath, 'w', encoding='utf8') as f:
        f.write(content)

print("Batch fix done!")
