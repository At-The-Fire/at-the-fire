# Authentication & Authorization Overview

This document describes how authentication and authorization are handled server-side, including the middleware chain, token flow, and key implementation details.

---

## Authentication Flow

**Provider:** AWS Cognito (RS256 JWTs)

1. Client authenticates directly with Cognito and receives three tokens: `accessToken`, `idToken`, `refreshToken`.
2. Tokens are stored in HTTP-only cookies (set via `/api/v1/auth/create-cookies`).
3. Every protected request sends all three cookies automatically.
4. The server verifies the `accessToken` and `idToken` on each request via `authenticateAWS` middleware.
5. When tokens expire, the client calls `/api/v1/auth/refresh-tokens` to exchange the refresh token for new access/ID tokens.

---

## Middleware

### `authenticateAWS` — `lib/middleware/authenticateAWS.js`

Required on all protected routes. Performs full JWT verification and sets `req.userAWSSub`.

**Steps:**
1. Reads `accessToken`, `idToken`, `refreshToken` from cookies. Returns `401` if any are missing.
2. Decodes `idToken` to extract `sub`. Returns `401` if `sub` is missing.
3. Sets `req.userAWSSub = decodedToken.sub`.
4. Verifies the user exists in the DB (`cognito_users`) via `getCognitoUserBySub`. Returns `401` if not found.
5. Verifies `accessToken` (RS256, no audience) and `idToken` (RS256, audience = `APP_CLIENT_ID`) in parallel against Cognito's JWKS endpoint.

**JWKS key caching:** Signing keys are cached in-memory with a 12-hour TTL to avoid repeated network calls to Cognito.

**Error responses:**

| Type | Status | Cause |
|---|---|---|
| `MissingOrInvalidToken` | 401 | Any cookie missing |
| `TokenExpiredError` | 401 | Token has expired |
| `MissingKeyIDError` | 401 | Token header missing `kid` |
| `TokenVerificationError` | 401 | Signature or issuer mismatch |
| `UserNotFoundError` | 401 | `sub` not found in `cognito_users` |

---

### `authorizeSubscription` — `lib/middleware/authorizeSubscription.js`

Runs after `authenticateAWS`. Verifies the user has an active (or trialing) paid subscription.

**Steps:**
1. Looks up `stripe_customers` record by `req.userAWSSub`. Returns `403` if not found.
2. Sets `req.customerId = stripeCustomer.customerId`.
3. Checks `stripeCustomer.confirmed`. Returns `403` if false.
4. Looks up subscription. Returns `403` if none found.
5. Determines trial status (`status === 'trialing'` and `trialEndDate > now`).
6. Sets `req.restricted = false` if subscription is active or in trial; `true` otherwise.
7. Sets `req.trialStatus = { isTrialing, endsAt, daysRemaining }`.
8. Checks billing period via invoice; sets `req.restricted = true` if subscription end date has passed and not in trial.

---

### `authDelUp` — `lib/middleware/authDelUp.js`

Runs after `authorizeSubscription` on delete/update routes for posts and quota products. Verifies the requesting user owns the resource.

**Steps:**
1. Reads `id` from `req.params` and `req.customerId` from the previous middleware.
2. Determines resource type from the URL path (`/dashboard` → post, `/quota-tracking` → product).
3. Fetches the resource. Returns `404` if not found.
4. Compares `item.customer_id` to `req.customerId`. Returns `403` if they don't match.
5. Attaches `req.resourceItem` for downstream use.

---

### `adminIdCheck` — `lib/middleware/adminIdCheck.js`

Runs after `authorizeSubscription` on admin-only routes (`/api/v1/atf-operations`).

**Steps:**
1. Reads `req.customerId` (set by `authorizeSubscription`).
2. Compares to `ADMIN_ID` env var (or `TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER` in test mode).
3. Returns `403` if they don't match.

---

## Middleware Chain by Route Type

| Route type | Middleware applied |
|---|---|
| Public | _(none)_ |
| Auth required | `authenticateAWS` |
| Subscription required | `authenticateAWS` → `authorizeSubscription` |
| Own resource (edit/delete) | `authenticateAWS` → `authorizeSubscription` → `authDelUp` |
| Admin only | `authenticateAWS` → `authorizeSubscription` → `adminIdCheck` |

---

## Key Files

- `lib/middleware/authenticateAWS.js`
- `lib/middleware/authorizeSubscription.js`
- `lib/middleware/authDelUp.js`
- `lib/middleware/adminIdCheck.js`
- `lib/controllers/auth.js`
- `lib/models/AWSUser.js`

---

For implementation details, see the middleware files directly.
