# Testing Strategy

This document summarizes the testing strategy, tools, and structure for the server.

---

## Test Types

- **Unit tests** — Test individual functions, models, and utilities in isolation (`__tests__/Unit/`)
- **Integration tests** — Test controllers and middleware against a real PostgreSQL and Redis instance (`__tests__/Integration/`)
- **E2E tests** — Manual flows documented in `docs/testing/E2E checklist.md` and the linked Google Doc

---

## Test Directory Structure

```
server/__tests__/
├── Integration/
│   ├── _controllers/     # Controller-level HTTP tests via Supertest
│   └── _middleware tests/
├── Unit/
│   ├── _controllers/
│   ├── _middleware/
│   ├── functions/
│   ├── jobs/
│   └── Models/
└── _templates/           # Test file templates
```

---

## Tools

| Tool | Purpose |
|---|---|
| Jest | Test runner, assertions, mocking |
| Supertest | HTTP integration testing against the Express app |
| redis-mock | In-memory Redis mock for unit tests |
| error-affirmations | Jest reporter — friendly error output (minimal mode) |
| @types/jest | IDE type support for Jest globals |
| Stripe CLI / VS Code extension | Manual webhook event triggering |

---

## Mocking Strategy

External services and middleware are mocked via `jest.mock()`. Key patterns:

| What is mocked | How | Where used |
|---|---|---|
| `authenticateAWS` middleware | `jest.mock` — sets `req.userAWSSub` | All integration controller tests |
| `authorizeSubscription` middleware | `jest.mock` — sets `req.customerId` | Integration tests requiring subscription |
| `authDelUp` middleware | `jest.mock` | Integration tests for delete/update routes |
| `lib/utils/pool` (PostgreSQL) | `jest.mock` + `pool.query` spy | Unit model tests |
| `stripe` | `jest.mock` — full client stub | Checkout, stripe controller tests |
| `@aws-sdk/client-s3` | `jest.mock` — command-based stub | Auctions, dashboard, profile tests |
| `@aws-sdk/client-cognito-identity-provider` | `jest.mock` | Admin (atfOperations) tests |
| `amazon-cognito-identity-js` | `jest.mock` — `CognitoUser`, `CognitoRefreshToken` stubs | Auth refresh token tests |
| `jsonwebtoken` | `jest.mock` — custom `verify`/`decode` callbacks | Auth middleware tests |
| `multer` | `jest.mock` | Dashboard file upload tests |
| `node-cron` | `jest.mock` | Auction timer job tests |
| `redisClient` | `jest.mock` using redis-mock | Unit tests that touch Redis |
| Individual models (Post, QuotaProduct, etc.) | `jest.mock` | Controller unit tests |

---

## Running Tests

```bash
# Run all tests (from repo root)
npm test --prefix server

# Run all tests with watch mode
cd server && npm run test:watch

# Run a single test file
cd server && npx jest --verbose --runInBand --setupFiles dotenv/config <path>
```

There are no separate `test:unit` or `test:integration` scripts — Jest runs all `__tests__` by default. Use `--testPathPattern` to target a subset:

```bash
cd server && npx jest --testPathPattern=Integration
cd server && npx jest --testPathPattern=Unit
```

---

## Test Data

Test database is seeded from `sql/setup.sql` which includes seed users, customers, orders, posts, and conversations. Before integration tests run, `data/setup.js` encrypts the seed data in place (AES-256 for PII fields, SHA-256 hashes for lookups) to match production data format.

Test-specific values (subs, customer IDs) are configured via `TEST_*` environment variables. See `docs/setup/environment-deployment.md` for the full list.

---

## CI Integration

Tests run automatically on push/PR to `main` via GitHub Actions (`.github/workflows/ci.yml`):
1. Installs server dependencies
2. Lints with ESLint
3. Runs all server tests against live PostgreSQL and Redis services
4. On direct push to `main`: flushes the production Redis cache

Client tests are **not** in CI — only server tests run automatically.

---

For more, see the `__tests__/` directory and `docs/testing/stripe-testing.md`.
