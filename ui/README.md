# Rustlings UI

Local web UI for rustlings exercises.
Connects to [rustlings_api](https://github.com/qmac/rustlings_api) running on port 3000.

## Quick Start

```bash
# Install
npm install

# Add your API token
echo "NEXT_PUBLIC_API_TOKEN=<your_token>" > .env.local

# Start (requires rustlings_api running on port 3000)
npm run dev
```

Open http://localhost:3001

## Pages

- `/rustlings` — category listing with progress stats and filters
- `/rustlings/[slug]` — exercise editor with Monaco, hint/solution panels, run output

## Requirements

- Node.js 18+
- [rustlings_api](https://github.com/qmac/rustlings_api) running locally on port 3000
- Valid JWT token from `POST /auth/register` or `POST /auth/login`
