# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

At The Fire is a full-stack subscription-based artist/maker platform (gallery, inventory management, sales tracking, messaging). Monorepo with a React 18 SPA (`client/`) and a Node.js/Express REST API (`server/`). Deployed to Heroku.

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

## Key Architectural Decisions

- **No shared code** between client and server — they communicate only via HTTP (`/api/v1/`) and WebSocket.
- **Authentication** is AWS Cognito end-to-end: Cognito JWTs issued on the client, stored in HTTP-only cookies, verified server-side via JWKS.
- **PII encryption**: emails, phone numbers, and messages are AES-256 encrypted at rest with SHA-256 hashes stored for lookup (`server/lib/services/encryption.js`).
- **No ORM, no migrations**: PostgreSQL via raw `pg` queries; schema is managed by dropping and recreating from `sql/setup.sql`.
- **Redis is optional**: `REDIS_ENABLED=false` causes the Redis client to silently no-op (useful for local dev without Redis).
- **Products vs. "quota-tracking"**: what the UI calls "Products" maps to the `/api/v1/quota-tracking` backend routes.
