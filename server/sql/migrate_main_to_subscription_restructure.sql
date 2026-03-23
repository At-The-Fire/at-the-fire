-- =============================================================================
-- MIGRATION: main → subscription-restructure
-- =============================================================================
-- Covers every schema change accumulated across:
--   • migrations/2026-03-02-main-to-dev-setup-schema-sync.md
--   • migrations/add_tos_fields_to_cognito_users.md
--   • migrations/add_shipping_cost.md
--   • migrations/add_tracking_to_purchases.sql
--   • sql/migrate_gallery_sub.sql
--
-- Run this ONCE against any database still on the main-branch schema.
-- Safe to run in Beekeeper as a single statement — all changes are wrapped
-- in a transaction. Any data-integrity failure raises an exception and rolls
-- the entire script back.
-- =============================================================================

BEGIN;

-- ============================================================
-- 1. cognito_users — add Terms-of-Service acceptance fields
-- ============================================================
ALTER TABLE cognito_users
  ADD COLUMN IF NOT EXISTS accepted_tos_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tos_version     VARCHAR(20);


-- ============================================================
-- 2. gallery_posts — add new columns (data migration below)
-- ============================================================
ALTER TABLE gallery_posts
  ADD COLUMN IF NOT EXISTS quantity     INTEGER   DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC   DEFAULT 0;


-- ============================================================
-- 3. quota_tracking — add soft-delete column
-- ============================================================
ALTER TABLE quota_tracking
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;


-- ============================================================
-- 4. New table: auctions
--    (shipping_cost included — covers add_shipping_cost migration)
-- ============================================================
CREATE TABLE IF NOT EXISTS auctions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_sub    VARCHAR        NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
  title         VARCHAR(255)   NOT NULL,
  description   TEXT,
  image_urls    TEXT[]         NOT NULL DEFAULT '{}',
  start_price   NUMERIC        NOT NULL,
  buy_now_price NUMERIC,
  current_bid   NUMERIC,
  start_time    TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time      TIMESTAMPTZ    NOT NULL,
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  shipping_cost NUMERIC        DEFAULT 0
);


-- ============================================================
-- 5. New table: bids
-- ============================================================
CREATE TABLE IF NOT EXISTS bids (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auction_id  BIGINT   NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_sub  VARCHAR  NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
  bid_amount  NUMERIC  NOT NULL CHECK (bid_amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. New table: auction_results
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_results (
  id              SERIAL PRIMARY KEY,
  auction_id      BIGINT  UNIQUE REFERENCES auctions(id),
  winner_sub      VARCHAR REFERENCES cognito_users(sub),
  final_bid       NUMERIC,
  closed_at       TIMESTAMPTZ DEFAULT NOW(),
  closed_reason   TEXT NOT NULL,
  is_paid         BOOLEAN DEFAULT FALSE,
  tracking_number TEXT
);


-- ============================================================
-- 7. New table: auction_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_sub    VARCHAR NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
  auction_id  BIGINT  NOT NULL REFERENCES auctions(id)      ON DELETE CASCADE,
  type        TEXT    NOT NULL CHECK (type IN ('outbid', 'won')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE
);


-- ============================================================
-- 8. New table: purchases
--    Created fresh with final schema — this table did not exist
--    on main, so no intermediate seller_customer_id step needed.
--    Includes shipping_cost, tracking_number, shipped_at already.
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_sub                VARCHAR  NOT NULL REFERENCES cognito_users(sub),
  seller_sub               VARCHAR  NOT NULL REFERENCES cognito_users(sub),
  item_type                VARCHAR  NOT NULL CHECK (item_type IN ('gallery_post', 'auction')),
  item_id                  BIGINT   NOT NULL,
  quantity                 INT      NOT NULL DEFAULT 1,
  amount_paid              NUMERIC  NOT NULL,
  shipping_cost            NUMERIC  DEFAULT 0,
  processor_transaction_id VARCHAR,
  status                   VARCHAR  NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'completed', 'refunded')),
  tracking_number          TEXT,
  shipped_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 9. gallery_posts: migrate customer_id → seller_sub
-- ============================================================
ALTER TABLE gallery_posts
  ADD COLUMN IF NOT EXISTS seller_sub VARCHAR(255) REFERENCES cognito_users(sub) ON DELETE CASCADE;

UPDATE gallery_posts gp
SET seller_sub = sc.aws_sub
FROM stripe_customers sc
WHERE gp.customer_id = sc.customer_id;

-- Guard: abort if any row couldn't be mapped
DO $$
DECLARE unmapped INT;
BEGIN
  SELECT COUNT(*) INTO unmapped
  FROM gallery_posts
  WHERE seller_sub IS NULL AND customer_id IS NOT NULL;

  IF unmapped > 0 THEN
    RAISE EXCEPTION
      'gallery_posts migration blocked: % row(s) have a customer_id with no matching stripe_customers.aws_sub. '
      'Resolve the orphaned rows and re-run.', unmapped;
  END IF;
END;
$$;

ALTER TABLE gallery_posts ALTER COLUMN seller_sub SET NOT NULL;
ALTER TABLE gallery_posts DROP COLUMN customer_id;   -- auto-drops the FK constraint


-- ============================================================
-- 10. image_uploads: migrate customer_id → user_sub
-- ============================================================
ALTER TABLE image_uploads
  ADD COLUMN IF NOT EXISTS user_sub VARCHAR(255) REFERENCES cognito_users(sub);

UPDATE image_uploads iu
SET user_sub = sc.aws_sub
FROM stripe_customers sc
WHERE iu.customer_id = sc.customer_id;

DO $$
DECLARE unmapped INT;
BEGIN
  SELECT COUNT(*) INTO unmapped
  FROM image_uploads
  WHERE user_sub IS NULL;

  IF unmapped > 0 THEN
    RAISE EXCEPTION
      'image_uploads migration blocked: % row(s) could not be mapped to a cognito sub. '
      'Resolve the orphaned rows and re-run.', unmapped;
  END IF;
END;
$$;

ALTER TABLE image_uploads ALTER COLUMN user_sub SET NOT NULL;
DROP INDEX IF EXISTS idx_image_uploads_customer_time;
ALTER TABLE image_uploads DROP COLUMN customer_id;   -- auto-drops the FK constraint
CREATE INDEX IF NOT EXISTS idx_image_uploads_user_time ON image_uploads (user_sub, created_at);


-- ============================================================
-- 11. inventory_snapshot: migrate customer_id → user_sub
-- ============================================================
ALTER TABLE inventory_snapshot
  ADD COLUMN IF NOT EXISTS user_sub VARCHAR(255) REFERENCES cognito_users(sub) ON DELETE CASCADE;

UPDATE inventory_snapshot ins
SET user_sub = sc.aws_sub
FROM stripe_customers sc
WHERE ins.customer_id = sc.customer_id;

DO $$
DECLARE unmapped INT;
BEGIN
  SELECT COUNT(*) INTO unmapped
  FROM inventory_snapshot
  WHERE user_sub IS NULL;

  IF unmapped > 0 THEN
    RAISE EXCEPTION
      'inventory_snapshot migration blocked: % row(s) could not be mapped to a cognito sub. '
      'Resolve the orphaned rows and re-run.', unmapped;
  END IF;
END;
$$;

ALTER TABLE inventory_snapshot ALTER COLUMN user_sub SET NOT NULL;
ALTER TABLE inventory_snapshot DROP COLUMN customer_id;   -- auto-drops the FK constraint


-- ============================================================
-- 12. Performance indexes
--     Uses CREATE INDEX CONCURRENTLY — safe on live databases,
--     does NOT lock the table. Run outside a transaction block
--     (psql/Beekeeper: execute each statement individually, or
--     remove the BEGIN/COMMIT wrapping if re-running this file).
-- ============================================================

-- Auctions: queried by seller, filtered by active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_seller_sub ON auctions(seller_sub);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_is_active ON auctions(is_active);

-- Bids: high-frequency lookups by auction + ordered by amount
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_auction_bid_amount ON bids(auction_id, bid_amount DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_bidder_sub ON bids(bidder_sub);

-- Purchases: buyer/seller lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchases_buyer_sub ON purchases(buyer_sub);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchases_seller_sub ON purchases(seller_sub);

-- Auction notifications: user sub lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auction_notifications_user_sub ON auction_notifications(user_sub);

-- Gallery posts: seller sub lookups + soft-delete filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gallery_posts_seller_sub ON gallery_posts(seller_sub);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gallery_posts_deleted_at ON gallery_posts(deleted_at) WHERE deleted_at IS NULL;

-- Auctions: end_time used for sorting active auctions and 2-hour recently-ended filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);


-- ============================================================
-- 13. New table: seller_payouts
--     Must be created before the ALTER TABLEs below that
--     add payout_id FKs to auction_results and purchases.
-- ============================================================
CREATE TABLE IF NOT EXISTS seller_payouts (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_sub   VARCHAR      NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
  amount       NUMERIC      NOT NULL,
  period_start TIMESTAMPTZ,
  period_end   TIMESTAMPTZ,
  notes        TEXT,
  paid_by_sub  VARCHAR      REFERENCES cognito_users(sub),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 14. auction_results — add fee tracking + payout linkage
-- ============================================================
ALTER TABLE auction_results
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_id    BIGINT  REFERENCES seller_payouts(id);


-- ============================================================
-- 15. purchases — add fee tracking + payout linkage
-- ============================================================
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_id    BIGINT  REFERENCES seller_payouts(id);


-- ============================================================
-- 16. purchases — add shipping address (encrypted PII)
-- ============================================================
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS shipping_address TEXT;


COMMIT;

-- ============================================================
-- Post-transaction indexes (non-CONCURRENTLY; safe after COMMIT)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller_sub ON seller_payouts(seller_sub);
CREATE INDEX IF NOT EXISTS idx_purchases_payout_id ON purchases(payout_id);
