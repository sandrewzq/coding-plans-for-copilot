import os
import re

def extract_function_blocks(code):
    lines = code.split('\n')
    blocks = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        # Match function declarations, also match arrow functions assigned to const if needed
        # but in this file, most are standard function declarations.
        m = re.match(r'^(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(', line)
        if m:
            func_name = m.group(1)
            start_line = i
            open_braces = 0
            # Start gathering
            curr_code = []
            for j in range(i, len(lines)):
                curr_line = lines[j]
                curr_code.append(curr_line)
                open_braces += curr_line.count('{')
                open_braces -= curr_line.count('}')
                if open_braces == 0 and curr_line.strip() == '}':
                    i = j
                    break
            blocks[func_name] = '\n'.join(curr_code)
        i += 1
    return blocks

def extract_variables(code):
    # This is a bit hacky but we extract top-level consts like COMMON_HEADERS, HTML_ENTITIES, etc.
    # We grab lines starting with const NAME = until the semi-colon.
    lines = code.split('\n')
    vars_found = {}
    i = 0
    while i < len(lines):
        m = re.match(r'^const\s+([A-Z0-9_]+)\s*=\s*(.*)', lines[i])
        if m:
            var_name = m.group(1)
            # If it's a simple assignment
            if lines[i].endswith(';'):
                vars_found[var_name] = lines[i]
            else:
                curr_code = []
                for j in range(i, len(lines)):
                    curr_code.append(lines[j])
                    if lines[j].strip().endswith(';'):
                        i = j
                        break
                vars_found[var_name] = '\n'.join(curr_code)
        i += 1
    return vars_found

if __name__ == '__main__':
    with open('scripts/fetch-provider-pricing.js', 'r', encoding='utf8') as f:
        code = f.read()
    
    funcs = extract_function_blocks(code)
    print("Functions:", list(funcs.keys()))
    
    vars_found = extract_variables(code)
    print("Variables:", list(vars_found.keys()))
