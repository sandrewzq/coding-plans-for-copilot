import os
import re

def extract_balanced_block(lines, start_idx):
    block = []
    open_braces = 0
    found_start = False
    for i in range(start_idx, len(lines)):
        line = lines[i]
        block.append(line)
        
        # 1. Strip comments
        l_clean = re.sub(r'//.*', '', line)
        # 2. Strip simple single-line strings (avoiding most brace issues)
        l_clean = re.sub(r'\'[^\']*\'', '', l_clean)
        l_clean = re.sub(r'\"[^\"]*\"', '', l_clean)
        l_clean = re.sub(r'`[^`]*`', '', l_clean)
        # 3. Strip escaped braces (common in regex)
        l_clean = l_clean.replace('\\{', '').replace('\\}', '')
        # 4. Strip regex literals (very rough)
        # We only strip if it looks like a regex: /.../g or similar
        l_clean = re.sub(r'\/[^\/]+\/[gimuy]*', '', l_clean)
        
        open_braces += l_clean.count('{')
        if '{' in l_clean: found_start = True
        open_braces -= l_clean.count('}')
        
        if found_start and open_braces <= 0:
            return '\n'.join(block), i
    return None, start_idx

def extract_all(code_text):
    lines = code_text.split('\n')
    functions = {}
    constants = {}
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        # Function detection
        fn_match = re.search(r'function\s+([a-zA-Z0-9_]+)\s*\(', line)
        if fn_match and re.match(r'^(?:async\s+)?function', line):
            fn_name = fn_match.group(1)
            block, end_idx = extract_balanced_block(lines, i)
            if block:
                functions[fn_name] = block
                i = end_idx + 1
                continue

        # Constant detection
        const_match = re.match(r'^const\s+([A-Z0-9_]+)\s*=', line)
        if const_match:
            const_name = const_match.group(1)
            if '{' in line:
                block, end_idx = extract_balanced_block(lines, i)
                if block:
                    if not block.strip().endswith(';'): block += ';'
                    constants[const_name] = block
                    i = end_idx + 1
                    continue
            else:
                constants[const_name] = lines[i]
        i += 1
    return functions, constants

def main():
    source_file = 'old_pricing.js'
    if not os.path.exists(source_file):
        print(f"Error: {source_file} not found")
        return

    with open(source_file, 'r', encoding='utf-8') as f:
        code = f.read()

    functions, constants = extract_all(code)
    print("Found functions:", sorted(functions.keys()))

    provider_map = {
        'zhipu': ['parseZhipuCodingPlans'],
        'kimi': ['parseKimiCodingPlans', 'parseKimiFeatureCandidates', 'pickKimiFeaturesByTitleAndPrice'],
        'minimax': ['parseMinimaxCodingPlans', 'parseMinimaxOriginalPrice'],
        'volcengine': [
            'parseVolcengineCodingPlans', 'normalizeVolcCurrentPriceText', 
            'normalizeVolcOriginalPriceText', 'parseVolcServiceDetails', 
            'parseVolcPlanFromBundle', 'volcBundleId', 'volcBundleVersion', 
            'extractVolcBundleCandidatesFromHtml'
        ],
        'aliyun': ['parseAliyunCodingPlans', 'parseAliyunServiceDetailsFromPageHtml'],
        'baidu': ['parseBaiduCodingPlans'],
        'kwaikat': ['parseKwaikatCodingPlans'],
        'xaio': ['parseXAioCodingPlans'],
        'compshare': ['parseCompshareCodingPlans'],
        'infini': ['parseInfiniCodingPlans', 'parseInfiniPlanFromBundle', 'parseInfiniServiceDetailsByTier'],
        'mthreads': ['parseMthreadsCodingPlans'],
        'zenmux': ['parseZenmuxCodingPlans'],
    }

    all_provider_fns = [fn for fns in provider_map.values() for fn in fns]
    utils_fns = [fn for fn in functions if fn not in all_provider_fns and fn not in ['main', 'runTaskWithTimeout']]
    utils_consts_keys = ['HTML_ENTITIES', 'CNY_CURRENCY_HINT', 'USD_CURRENCY_HINT', 'COMMON_HEADERS', 'REQUEST_CONTEXT', 'REQUEST_TIMEOUT_MS', 'PROVIDER_IDS']
    
    exports = utils_consts_keys + utils_fns
    exports_str = '{\n  ' + ',\n  '.join(exports) + '\n}'

    os.makedirs('scripts/utils', exist_ok=True)
    os.makedirs('scripts/providers', exist_ok=True)

    with open('scripts/utils/index.js', 'w', encoding='utf-8') as f:
        f.write('"use strict";\n\nconst { AsyncLocalStorage } = require("node:async_hooks");\n\n')
        for k in utils_consts_keys:
            if k in constants: f.write(constants[k] + '\n\n')
        for fn in utils_fns: f.write(functions[fn] + '\n\n')
        f.write(f'module.exports = {exports_str};\n')

    for p, fns in provider_map.items():
        with open(f'scripts/providers/{p}.js', 'w', encoding='utf-8') as f:
            f.write('"use strict";\n\n')
            f.write(f'const {exports_str} = require("../utils");\n\n')
            if p == 'kimi' and 'KIMI_MEMBERSHIP_LEVEL_LABELS' in constants:
                f.write(constants['KIMI_MEMBERSHIP_LEVEL_LABELS'] + '\n\n')
            for fn in fns:
                if fn in functions: f.write(functions[fn] + '\n\n')
                else: print(f"MISSING: {fn}")
            main_fns = [fn for fn in fns if fn.startswith('parse') and fn.endswith('CodingPlans')]
            if main_fns:
                f.write(f'module.exports = {main_fns[0]};\n')

    with open('scripts/fetch-provider-pricing.js', 'w', encoding='utf-8') as f:
        f.write('#!/usr/bin/env node\n\n"use strict";\n\nconst fs = require("node:fs/promises");\nconst path = require("node:path");\nconst { REQUEST_CONTEXT, REQUEST_TIMEOUT_MS, PROVIDER_IDS, keepStandardMonthlyPlans, normalizeServiceDetails, normalizeProviderCurrencySymbols } = require("./utils");\n\n')
        f.write(constants.get('OUTPUT_FILE', 'const OUTPUT_FILE = path.resolve(__dirname, "..", "assets", "provider-pricing.json");') + '\n')
        f.write(constants.get('TASK_TIMEOUT_MS', 'const TASK_TIMEOUT_MS = 30_000;') + '\n\n')
        for p in sorted(provider_map.keys()):
            main_fns = [fn for fn in provider_map[p] if fn.startswith('parse') and fn.endswith('CodingPlans')]
            if main_fns:
                f.write(f'const {main_fns[0]} = require("./providers/{p}");\n')
        f.write('\n' + functions['runTaskWithTimeout'] + '\n\n')
        main_code = functions['main']
        tasks_array = "const tasks = [\n"
        for p in sorted(provider_map.keys()):
            main_fns = [fn for fn in provider_map[p] if fn.startswith('parse') and fn.endswith('CodingPlans')]
            if main_fns:
                tasks_array += f"    {{ provider: PROVIDER_IDS.{p.upper()}, fn: {main_fns[0]} }},\n"
        tasks_array += "  ];"
        main_code = re.sub(r'const tasks = \[.*?\];', tasks_array, main_code, flags=re.DOTALL)
        f.write(main_code + '\n\nif (require.main === module) {\n  main().catch((error) => {\n    console.error("[pricing] fatal error:", error);\n    process.exit(1);\n  });\n}\n')

    print("Refactor successfully completed from old_pricing.js")

if __name__ == '__main__':
    main()
