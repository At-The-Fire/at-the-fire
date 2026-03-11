# Migration: add_shipping_cost

Applied: 2026-03-10

## Purpose
Add per-listing seller-set shipping costs to gallery_posts and auctions,
and store the charged shipping on each purchase record.

## SQL
```sql
BEGIN;
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
COMMIT;
```
