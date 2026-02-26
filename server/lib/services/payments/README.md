# Payment adapters (shopping cart)

The shopping cart does **not** use Stripe.

This folder is the integration boundary for whichever merchant processor is approved (e.g. Leap Payments, SoarPay).

## Current flow

Client checkout calls:

1. `POST /api/v1/purchases/intent` with:
   - `totalAmount` (integer **cents**)
   - `items: [{ postId, quantity }]`

2. `POST /api/v1/purchases/confirm` with:
   - `intentId`
   - `items: [{ postId, quantity }]`
   - optional `payment` object (processor-specific, e.g. payment method token)

Server then:

- Captures payment via `paymentService.capturePayment(intentId, payment)`
- Writes `purchases` rows as `completed` with `processor_transaction_id`
- Decrements inventory atomically
- Best-effort refunds if fulfillment fails after capture

## Adapter interface

An adapter must implement:

- `createPaymentIntent(amountCents, currency, metadata)` → `{ intentId, clientSecret? }`
- `capturePayment(intentId, payment)` → `{ success: true, transactionId }`
- `refundPayment(transactionId, amountCents?)` → `{ success: true }`

Notes:

- `clientSecret` is optional because some processors don’t use it.
- `payment` is intentionally opaque. For card entry on-site, it will typically include a token/nonce produced by the processor’s client SDK.

## Local dev / testing

- `PAYMENTS_ADAPTER=mock` enables the in-memory mock adapter (no external network calls).
- default (no env): `NullAdapter` which responds `503 Payment processor not yet configured`.

## Implementation checklist (when a real processor is chosen)

- Implement `LeapAdapter` or `SoarPayAdapter` in this folder.
- Update `server/lib/services/paymentService.js` to select it by `PAYMENTS_ADAPTER`.
- Update the Checkout `PaymentWidget` to use the processor’s client SDK to collect payment details and produce a token/nonce, then pass it as `payment` to `/purchases/confirm`.
- Add 1 integration test that uses the adapter in a mocked mode (if the processor offers sandbox/tokenization without charges), otherwise keep using `mock` for CI.
