# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

At The Fire — a Node.js/Express REST API backend for a subscription-based artist gallery and e-commerce platform (auctions, cart, purchases). CommonJS modules, no TypeScript. Serves a compiled React frontend from `lib/clientBuild/build/`.

## Commands

```bash
npm start                # node -r dotenv/config server.js (port 7890)
npm run start:watch      # nodemon with hot reload
npm test                 # jest --verbose --runInBand --setupFiles dotenv/config --passWithNoTests
npm run test:watch       # jest in watch mode
npm run setup-db         # Drops and recreates all tables from sql/setup.sql, encrypts seed data
```

Run a single test file:
```bash
npx jest --verbose --runInBand --setupFiles dotenv/config __tests__/Unit/Models/SomeModel.test.js
```

Stripe webhook listener (local dev, separate port 4242):
```bash
stripe listen --forward-to localhost:4242/api/v1/webhook
```

## Architecture

**Controller → Model pattern** (no service layer). Raw SQL with `pg`, no ORM.

- **`server.js`** — Entry point. Creates HTTP server, attaches Socket.IO.
- **`lib/app.js`** — Express app factory. All middleware registration and route mounting.
- **`lib/controllers/`** — Express routers, one per feature domain. Call models directly and handle Redis caching.
- **`lib/models/`** — Static-method classes wrapping parameterized SQL queries via `pg.Pool`.
- **`lib/jobs/auctionTimers.js`** — Per-auction `setTimeout` + daily 5 PM PT cron sweep. `completeAuction()` is transaction-safe and idempotent; records `auction_results`, emits WebSocket events, creates `won` notifications.
- **`lib/services/paymentService.js`** — Adapter-pattern payment abstraction. `MockAdapter` for dev (full end-to-end), `NullAdapter` for prod (returns 503 until a real processor is wired). Stripe is only used for subscriptions.
- **`lib/middleware/`** — `authenticateAWS` (JWT/Cognito verification), `authorizeSubscription` (paid-tier gating), `adminIdCheck`, ownership checks, validation.
- **`lib/services/encryption.js`** — AES-256 encrypt/decrypt (CryptoJS) for PII at rest (emails, phones, messages). SHA-256 hashes stored alongside for lookups without decryption.
- **`lib/utils/pool.js`** — Single `pg.Pool` instance, configured via `DATABASE_URL`.
- **`redisClient.js`** — Lazy-initialized Redis client with noop fallback when `REDIS_ENABLED=false`.
- **`sql/setup.sql`** — Full DDL schema + test seed data.

## Route Structure

All API routes are prefixed `/api/v1/`. Middleware chains are applied at the mount level in `lib/app.js`:
- Public: `/auth`, `/gallery-posts`, `/profile`, `/followers`, `/likes`, `/auctions` (browse/results), `/bids/:id`
- Authenticated: `/users`, `/conversations`, `/stripe`, `/create-checkout-session`, `/auctions` (create/edit/cancel/bid), `/bids`, `/auction-notifications`, `/cart`, `/purchases`
- Authenticated + Subscription: `/dashboard`, `/goals`, `/quota-tracking`, `/quota-tracking/:productId/sales`, `/inventory-snapshot`, `/orders`, `/create-customer-portal-session`
- Seller-only (ownership check): `PUT /auctions/:id/paid`, `PUT /auctions/:id/tracking`, `PUT /purchases/:id/tracking`
- Admin: `/atf-operations`
- Webhook (Stripe signature verified): `/webhook`

**Auction-specific routes:**
- `POST /bids` — enforces strictly higher bid; triggers 5-min extension if placed within 1 min of end; notifies outbid user
- `POST /bids/buy-it-now` — immediately closes auction, records `auction_results`
- `POST /purchases/intent` → `POST /purchases/confirm` — payment intent then atomic capture + inventory decrement; refunds on rollback

## Auth System

AWS Cognito issues JWTs → stored in HTTP-only cookies (`accessToken`, `idToken`, `refreshToken`). The `authenticateAWS` middleware decodes `idToken` for the Cognito `sub`, verifies both tokens via JWKS (RS256, 12hr key cache), and confirms the user exists in `cognito_users`.

## Database

PostgreSQL via `pg`. No migration framework — schema managed by `sql/setup.sql` (destructive DROP+CREATE). All queries use parameterized `$1, $2` syntax.

## Key E-Commerce Tables

- **`auctions`** — seller_sub, title, image_urls (S3), start_price, buy_now_price, current_bid, start_time, end_time, is_active
- **`bids`** — auction_id, bidder_sub, bid_amount (immutable once recorded)
- **`auction_results`** — one row per closed auction; winner_sub, final_bid, closed_reason (`expired`|`buy_now`), is_paid, tracking_number
- **`auction_notifications`** — user_sub, auction_id, type (`outbid`|`won`), is_read
- **`purchases`** — buyer_sub, item_type (`gallery_post`|`auction`), item_id, quantity, amount_paid, processor_transaction_id, status, tracking_number

## Testing

Tests live in `__tests__/` with `Unit/` and `Integration/` subdirectories, further organized by layer (`Models/`, `_controllers/`, `_middleware/`). Integration tests use `supertest`. Test templates in `__tests__/_templates/`.

## Code Style

- ESLint: `eslint:recommended`, 2-space indent, single quotes, semicolons, `prefer-const`, `no-var`, `no-console` (warn, allows `console.info`/`console.error`)
- Prettier: 2-space, single quotes, semicolons, 100-char print width
- Socket.IO instance is shared via `app.set('io', io)` — controllers access it with `req.app.get('io')`

## Key Dependencies

Express, pg, redis, socket.io, stripe, @aws-sdk/client-cognito-identity-provider, @aws-sdk/client-s3, amazon-cognito-identity-js, jsonwebtoken, jwks-rsa, crypto-js, helmet, multer, json2csv, validator

## CI

GitHub Actions (`.github/workflows/nodejs.yml`): ESLint → Jest, runs on push/PR to `main` with PostgreSQL and Redis services. On merge to main, flushes the production Redis cache.

## Docs

Detailed documentation lives in `docs/` covering API reference, auth, database schema (with ERD), third-party integrations, Redis caching, environment setup, Stripe testing, and deployment workflow.
