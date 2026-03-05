# Coding Plans Dashboard

This project contains an automated dashboard for fetching and displaying the latest standard monthly prices of various Chinese AI coding providers.

## Features
- **Pricing Fetcher**: Automatically scrapes or queries the official pricing information of providers.
- **Web Dashboard**: Displays all raw data in a simple, standardized grid format.

## Overview
- `docs/` contains the static dashboard code which is hosted via GitHub Pages.
- `scripts/` contains Node.js scripts to fetch the data and to test the page locally.

## Development

```bash
# Fetch latest pricing data
npm run pricing:fetch

# Serve dashboard locally for verification
npm run pricing:serve
```

See the [Dashboard Live Page](https://sandrewzq.github.io/coding-plans-for-copilot/).