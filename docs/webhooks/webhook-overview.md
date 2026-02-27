# Webhooks & Event Handling Overview

This document describes all webhook sources, the endpoint, handled events, and processing logic.

---

## Event Sources

- **Stripe** — subscription lifecycle, billing, and payment events

> Direct product purchases (cart/checkout) use a server-side payment service and do **not** go through a webhook. Stripe webhook handling is subscription-only.

---

## Endpoint

| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/webhook` | Stripe signature (raw body required) |

The endpoint uses `express.raw({ type: 'application/json' })` — the body must **not** be parsed by `express.json()` before it reaches the handler.

---

## Security

- Stripe events are verified with `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`.
- In `NODE_ENV=test`, signature verification is bypassed and a mock `invoice.payment_succeeded` event is used instead.
- **Idempotency:** Every event is recorded via `WebhookEvent.insert({ event_id, event_type })` before processing. If the event ID already exists, the handler returns `200` immediately and skips processing. This prevents duplicate side effects from Stripe retries.

---

## Handled Events

### `customer.created`
Fires when a new Stripe customer is created (during subscription checkout).

**Actions:**
- Checks if a `stripe_customers` record already exists for the `aws_id` in event metadata.
- If not, inserts a new customer record linking the Stripe `customerId` to the Cognito `awsSub`.

---

### `charge.succeeded`
Fires when a charge completes successfully.

**Actions:**
- If the customer already exists, updates their `email` and `name` from billing details.
- If not, inserts a new `stripe_customers` record.
- Sets `confirmed = true` on the customer record.

---

### `invoice.created`
Fires when a new invoice is generated (start of each billing cycle).

**Actions:**
- Inserts a new invoice record with `invoiceId`, `subscriptionId`, `customerId`, `startDate`, `endDate`.
- Updates the customer record with `name`, `phone`, and `email` from the invoice.

---

### `invoice.payment_succeeded`
Fires when an invoice is paid successfully. This is the primary event used to activate/confirm subscriptions.

**Actions:**
- Updates the invoice record with `status`, `amount_due`, `amount_paid`.
- Calls `stripe.subscriptions.retrieve()` to verify current subscription state.
- Upserts the subscription record (`isActive`, `interval`, `start/end dates`).
- Marks the subscription as `'trialing'` if the description includes `"Trial period"`.
- Sets `confirmed = true` on the customer record.

---

### `customer.subscription.created`
Fires when a subscription is first created. Only processed when `status === 'trialing'`.

**Actions:**
- Upserts a subscription record with `status = 'trialing'`, `isActive = false`, plus trial start/end dates.
- Sets `confirmed = true` on the customer record.

---

### `customer.subscription.updated`
Fires when a subscription changes. Handles two cases:

**When `status === 'canceled'`:**
- Calls `Subscriptions.cancelSubscriptionData()` with `canceled_at`, `comment`, `feedback`, and `reason` from `cancellation_details`.

**When `status === 'active'`:**
- Verifies subscription state via `stripe.subscriptions.retrieve()`.
- Upserts the subscription record with `status = 'active'`, cleared trial fields.

---

### `customer.subscription.deleted`
Fires when a subscription is fully deleted (second "cancel plan" confirmation in the customer portal).

**Actions:**
- Calls `Subscriptions.setStatusInactive(subscriptionId)` to revoke access.

---

### `payment_intent.payment_failed`
Fires when a payment attempt fails.

**Actions:**
- Inserts a record into `failed_transactions` with `customerId`, `failureCode`, `transactionAmount`, `timestamp`, and `invoiceId`.

---

## Models Used

| Model | Table | Purpose |
|---|---|---|
| `WebhookEvent` | `webhook_events` | Idempotency — deduplicates incoming events |
| `StripeCustomer` | `stripe_customers` | Customer creation, updates, confirmed flag |
| `Subscriptions` | `subscriptions` | Subscription upsert, cancellation, deactivation |
| `Invoices` | `invoices` | Invoice insert and status updates |
| `FailedTransactions` | `failed_transactions` | Payment failure logging |

---

For implementation, see `lib/controllers/webhook.js`.
