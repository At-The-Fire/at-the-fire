# Stripe Webhook Event Log

Webhook event timing and order can change over time. This document records observed event sequences to help diagnose issues if they do. To add an entry: copy the server logs for the event flow, have AI summarize, and paste here.

---

## Handled Events (reference)

All events currently handled in `lib/controllers/webhook.js`:

| Event | Trigger |
|---|---|
| `customer.created` | New Stripe customer created during checkout |
| `charge.succeeded` | Charge completes successfully |
| `invoice.created` | New invoice generated at billing cycle start |
| `invoice.payment_succeeded` | Invoice paid — primary subscription activation event |
| `customer.subscription.created` | New subscription created (processed for `trialing` status only) |
| `customer.subscription.updated` | Subscription status changes (`active` or `canceled`) |
| `customer.subscription.deleted` | Subscription fully deleted — sets status inactive |
| `payment_intent.payment_failed` | Payment attempt fails — logged to `failed_transactions` |

**Note:** The sequences below only show events observed in a given log capture. Not all events fire on every flow — trial and regular subscriptions follow different paths.

---

## 2025-05-24 — Regular Subscription (non-trial)

### Event Timeline

- 2025-05-24T15:15:35.510 — `customer.created` (start)
- 2025-05-24T15:15:35.512 — (info) (+2 ms)
- 2025-05-24T15:15:55.314 — (info) (+19,802 ms)
- 2025-05-24T15:15:55.318 — `invoice.created` (+4 ms)
- 2025-05-24T15:15:55.638 — `invoice.payment_succeeded` (+320 ms)
- 2025-05-24T15:15:55.787 — (info) — customer marked confirmed (+149 ms)
- 2025-05-24T15:15:55.787 — subscription verification (+0 ms)

### Notes

- Removed 5-second timeout on updating subscription (now changed to upsert) — was causing auth to fail on redirect back to dashboard.
- Observed order: `customer.created` → `invoice.created` → `invoice.payment_succeeded` → subscription verification.
- `charge.succeeded` and `customer.subscription.created`/`updated` were not visible in this capture — may fire out of band or be filtered from this log.
- No delays or missing events observed.

---
