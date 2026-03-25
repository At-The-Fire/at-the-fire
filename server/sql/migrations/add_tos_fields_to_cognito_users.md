# Migration: Add ToS acceptance fields to cognito_users

**Date:** 2026-03-10

## Why

US-only, age-gated platform selling high-risk merchandise requires a timestamped, versioned record of each user's Terms of Service acceptance as legal evidence. These fields are populated at signup time — the server stamps `accepted_tos_at` with `NOW()` and records the version string sent from the client.

## Changes

`sql/setup.sql` has been updated so `npm run setup-db` picks this up automatically in dev/test.

For the live database, run the following ALTER statement once:

```sql
ALTER TABLE cognito_users
  ADD COLUMN IF NOT EXISTS accepted_tos_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tos_version VARCHAR(20);
```

Both columns are nullable — existing users will have `NULL` values; only new signups will have values.
