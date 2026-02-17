# Stripe Webhook Event Log Changes

Webhook event timing/ order seem to change over time, this document is here to help figure out what might have changed if/ when they do. Copy the logs of the events, have AI summarize/ document and paste here.

---

---

## 2024-05-24 Stripe Webhook Event Sequence

### Event Timeline

- 2025-05-24T15:15:35.510 — customer.created (start)
- 2025-05-24T15:15:35.512 — (info) (+2 ms)
- 2025-05-24T15:15:55.314 — (info) (+19,802 ms)
- 2025-05-24T15:15:55.318 — invoice.created (+4 ms)
- 2025-05-24T15:15:55.638 — invoice.payment_succeeded (+320 ms)
- 2025-05-24T15:15:55.787 — (info) — customer marked confirmed (+149 ms)
- 2025-05-24T15:15:55.787 — subscription verification (+0 ms)

### Notes

- Removed 5 second timeout on updating subscription, (now changed to upsert) was causing auth to fail on redirect back to dashboard.
- The order was: `customer.created` → `invoice.created` → `invoice.payment_succeeded` → `subscription verification`.
- No delays or missing events observed in this sequence.

---

---
