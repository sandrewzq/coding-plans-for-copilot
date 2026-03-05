# Git Hooks

This directory contains Git hooks for the coding-plans-for-copilot project.

## Available Hooks

### pre-push

Runs linting and tests before allowing a push. If any checks fail, the push is aborted.

**What it checks:**
1. **ESLint** - Code style and quality (`npm run lint`)
2. **Tests** - Full test suite including:
   - Unit tests - Schema validator and utilities
   - Pricing data validation - Validates `docs/provider-pricing.json` if it exists

**Execution order:**
1. ESLint runs first to catch syntax/style errors
2. If ESLint passes, tests run
3. Only if both pass, the push proceeds

## Installation

To enable the hooks, run:

```bash
git config core.hooksPath .githooks
```

Or on Windows:

```powershell
git config core.hooksPath .githooks
```

## Manual Testing

To run the tests manually without pushing:

```bash
npm test
```

Or:

```bash
node tests/run-tests.js
```

## Bypassing Hooks (Emergency Only)

If you absolutely need to push without running tests (not recommended):

```bash
git push --no-verify
```

## Troubleshooting

### Hook not running

1. Check that hooks are enabled:
   ```bash
   git config core.hooksPath
   ```
   Should output: `.githooks`

2. On Windows, you may need to use the PowerShell version. Copy `.githooks/pre-push.ps1` to `.git/hooks/pre-push.ps1` and ensure it's executable.

3. On Unix-like systems, ensure the hook is executable:
   ```bash
   chmod +x .githooks/pre-push
   ```
