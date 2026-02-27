# Error Handling & Logging

This document describes how errors are handled and logged in the system.

---

## Error Handling

### Global Error Middleware — `lib/middleware/error.js`

All unhandled errors propagate to the global error handler via `next(err)`. It:
- Reads `err.status` (defaults to `500` if not set)
- Responds with `{ status, message: err.message }`
- Logs the full error to console (`console.error(err)`) — suppressed in `NODE_ENV=test`

### HTTP Error Conventions

| Status | Cause |
|---|---|
| `400` | Bad request / missing required fields |
| `401` | Missing, invalid, or expired auth tokens |
| `403` | Authenticated but unauthorized (wrong subscription, wrong owner, not admin) |
| `404` | Resource not found |
| `409` | Conflict (bid too low, item already sold, duplicate, etc.) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |
| `503` | Payment processor not configured (NullAdapter) |

### 404 Middleware — `lib/middleware/not-found.js`

Catches requests that don't match any route and returns a `404`.

---

## Logging

### Console Logging

Used throughout controllers and middleware via `console.info`, `console.warn`, `console.error`. Logs appear in Heroku's log drain in production.

Key logged events:
- Every Stripe webhook event type received (`console.log`)
- Webhook event data tables (`console.table` via `logWebhookEvent`)
- Redis connection success/failure
- Token verification failures
- Unexpected middleware errors

### Database Logging

Persistent event logs stored in the database:

| Table | What it logs |
|---|---|
| `webhook_events` | Every incoming Stripe webhook event — used for idempotency |
| `failed_transactions` | `payment_intent.payment_failed` events with customer ID, failure code, amount, and invoice ID |

---

## Error Suppression in Tests

The global error middleware suppresses `console.error` when `NODE_ENV=test` to keep test output clean.

---

For implementation, see `lib/middleware/error.js`, `lib/middleware/not-found.js`, and `lib/controllers/webhook.js`.
