# Error Handling & Logging

This document describes how errors are handled and logged in the system, and how developers can monitor and troubleshoot issues.

---

## Error Handling

- **API errors:** Returned as JSON with appropriate HTTP status codes (e.g., 400, 401, 403, 404, 500)
- **Validation errors:** Handled in middleware, return 400 with details
- **Auth errors:** 401/403 for invalid or expired tokens
- **Stripe/webhook errors:** Logged and surfaced in webhook logs

## Logging

- **Console logging:** Used throughout controllers and middleware
- **Log levels:** Info, warning, error
- **Log locations:**

  - Local: Console output
  - Production:
    - `image_uploads` and `webhook_events` tables

- **Error tracking:** (Integrate with Sentry ASAP)

## Monitoring & Alerts

- (Optional) Integrate with monitoring tools for error alerts
- Review logs regularly for recurring issues

---

For more, see error handling in controllers and middleware.
