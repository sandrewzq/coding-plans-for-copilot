# Coding Plans Dashboard

A static dashboard that automatically fetches and displays standard trial and monthly subscription pricing for AI coding model providers.

## Highlights
- **Automated fetch & dedupe**: Node.js scripts pull official pricing (Zhipu, Kimi, Minimax, Baidu, Volcengine, etc.).
- **Standardized output**: Generates `provider-pricing.json` for the frontend.
- **Pure static UI**: HTML/Vanilla JS/CSS with no runtime dependencies.
- **Local preview**: Lightweight HTTP server for quick verification.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Fetch latest pricing
```bash
npm run pricing:fetch
```

### 3. Preview locally
```bash
npm run pricing:serve
```
Open `http://127.0.0.1:4173` in your browser.

### Live Page
[Dashboard Live Page](https://sandrewzq.github.io/coding-plans-for-copilot/)

## Project Structure
- `docs/`: static dashboard page and runtime data (`provider-pricing.json`).
- `scripts/`: pricing fetchers and local server.
- `scripts/providers/`: provider parsers.
- `scripts/utils/`: shared utilities and normalization logic.
- `assets/`: data snapshots (optional).

## Data Notes
- Keeps only “standard monthly/trial” plans and filters entries without useful details.
- Failed providers are recorded in the `failures` field for troubleshooting.

## Contributing
- Add a new parser in `scripts/providers/`.
- Register the new task in `scripts/fetch-provider-pricing.js`.
