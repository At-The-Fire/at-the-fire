# CLAUDE.md

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

At The Fire is a full-stack subscription-based artist/maker platform (gallery, inventory management, sales tracking, messaging, auctions, and e-commerce cart/purchases). Monorepo with a React 18 SPA (`client/`) and a Node.js/Express REST API (`server/`). Deployed to Heroku.

Each subdirectory has its own CLAUDE.md with detailed guidance:
- `client/CLAUDE.md` — React app architecture, state management, routing, auth, env vars
- `server/CLAUDE.md` — Express architecture, route structure, auth system, database, testing

## Commands

All commands run from the repo root unless noted.

```bash
# Development
npm start                            # Start server (port 7890, uses dotenv)
npm start --prefix client            # Start React dev server

# Tests
npm test --prefix server             # Server Jest tests (verbose, runInBand)
npm test --prefix client -- --watchAll=false  # Client Jest tests (single run)

# Single server test file
cd server && npx jest --verbose --runInBand --setupFiles dotenv/config <path>

# Build & deploy
npm run build --prefix client        # Build React SPA into client/build/
npm run heroku-postbuild             # Builds client + copies to server/lib/clientBuild/build/ (Heroku only)

# Database
npm run setup-db --prefix server     # Drops and recreates schema from sql/setup.sql (DESTRUCTIVE)
```

## Monorepo Structure

```
at-the-fire/
├── client/          # React 18 SPA (Create React App)
├── server/          # Node.js/Express API
│   └── lib/clientBuild/build/  # Compiled client (served statically)
├── Procfile         # Heroku: cd server && node -r dotenv/config server.js
└── .github/workflows/ci.yml
```

Each package has its own `node_modules` and `package.json`. There is no shared package at the root — the root `package.json` only exists for Heroku build orchestration and top-level test scripts.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main`:
1. Installs server dependencies (`npm ci --prefix server`)
2. Lints with ESLint (`npx eslint .` from `server/`)
3. Runs server tests against real PostgreSQL and Redis services
4. On direct push to `main` only: flushes the production Redis cache via `REDISCLOUD_URL`

Client tests are **not** in CI — only server tests run automatically.

## Test Data Conventions

**Never hardcode user identifiers in tests.** All Cognito subs, emails, and Stripe customer IDs used in test files must reference `process.env.*` variables. This ensures a single `.env` update propagates everywhere — avoiding the need to edit dozens of files. See `server/CLAUDE.md` → *Test Fixture Data* for the full variable list and rules.

## Key Architectural Decisions

- **No shared code** between client and server — they communicate only via HTTP (`/api/v1/`) and WebSocket.
- **Authentication** is AWS Cognito end-to-end: Cognito JWTs issued on the client, stored in HTTP-only cookies, verified server-side via JWKS.
- **PII encryption**: emails, phone numbers, and messages are AES-256 encrypted at rest with SHA-256 hashes stored for lookup (`server/lib/services/encryption.js`).
- **No ORM, no migrations**: PostgreSQL via raw `pg` queries; schema is managed by dropping and recreating from `sql/setup.sql`.
- **Redis is optional**: `REDIS_ENABLED=false` causes the Redis client to silently no-op (useful for local dev without Redis).
- **Products vs. "quota-tracking"**: what the UI calls "Products" maps to the `/api/v1/quota-tracking` backend routes.
- **Auctions are separate from gallery posts**: `auctions` and `bids` are distinct tables; auctions are not subscription-tier gated.
- **Auction timer system**: per-auction `setTimeout` at creation/bid, plus a daily 5 PM PT cron sweep for missed expirations (`server/lib/jobs/auctionTimers.js`). Idempotent `completeAuction()` records results and emits WebSocket events.
- **5-minute rule**: if a bid is placed within 1 minute of auction end, `end_time` auto-extends by 5 minutes (anti-sniping).
- **Payment service is abstracted**: `server/lib/services/paymentService.js` uses an adapter pattern (MockAdapter for dev, NullAdapter for prod until a merchant processor is configured). Stripe is used only for subscriptions, not cart payments.
- **Cart has no server-side persistence**: cart state lives in browser local state; server validates items and decrements inventory atomically only at checkout (`POST /purchases/confirm`).
- **Auction images use S3 directly**: auction image uploads go to S3/CloudFront (vs. Cloudinary for gallery posts).
- **WebSocket events for auctions**: `auction-created`, `auction-extended`, `bid-placed`, `user-outbid`, `auction-BIN`, `auction-ended`, `user-won`, `auction-paid`, `tracking-info` — all emitted via Socket.IO.
