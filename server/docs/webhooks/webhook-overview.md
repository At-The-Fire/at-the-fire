# Webhooks & Event Handling Overview

This document summarizes all webhook and event-driven logic in the system, including event sources, endpoints, and handling strategies.

---

## Event Sources

- **Stripe:** Payment, subscription, and billing events

## Endpoint URLs

- **Stripe:** `/api/v1/webhook`
- (Add other endpoints as needed)

## Event Payloads

- Stripe: See [Stripe Docs](https://stripe.com/docs/webhooks)

## Handling & Retries

- Webhook events are verified and processed in `lib/controllers/webhook.js`
- Cancelled subscriptions are logged
- Failed events are logged

## Security

- Stripe events are verified using webhook secret

---

For more, see the webhook controller and logs.
