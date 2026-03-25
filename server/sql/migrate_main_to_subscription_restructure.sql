-- =============================================================================
-- MIGRATION GUIDE: main → subscription-restructure
-- =============================================================================
-- This is a manual step-by-step execution guide for Beekeeper Studio.
-- DO NOT run this as a single script.
--
-- Execute each numbered section in order. Sections that contain BEGIN/COMMIT
-- should be run as a block (select all lines in that section and execute).
-- Index creation statements (SECTION C) must be run ONE AT A TIME.
--
-- Covers every schema change accumulated across:
--   • migrations/2026-03-02-main-to-dev-setup-schema-sync.md
--   • migrations/add_tos_fields_to_cognito_users.md
--   • migrations/add_shipping_cost.md
--   • migrations/add_tracking_to_purchases.sql
--   • sql/migrate_gallery_sub.sql
-- =============================================================================


-- =============================================================================
-- PRE-FLIGHT CHECKS
-- Run each of these read-only queries first. All counts must be 0 before
-- proceeding. If any check fails, stop and resolve before running anything else.
-- =============================================================================

-- Check 1: Any gallery posts with NULL customer_id?
-- (These would fail the NOT NULL step in Section B Step 9.)
SELECT COUNT(*) AS posts_with_null_customer_id FROM gallery_posts WHERE customer_id IS NULL;

-- Check 2: Any gallery posts whose customer_id has no match in stripe_customers?
SELECT COUNT(*) AS unmapped_posts
FROM gallery_posts gp
LEFT JOIN stripe_customers sc ON gp.customer_id = sc.customer_id
WHERE sc.customer_id IS NULL AND gp.customer_id IS NOT NULL;

-- Check 3: Any stripe_customers rows with a NULL aws_sub that are referenced by gallery_posts?
SELECT COUNT(*) AS posts_with_null_aws_sub
FROM gallery_posts gp
JOIN stripe_customers sc ON gp.customer_id = sc.customer_id
WHERE sc.aws_sub IS NULL;

-- Check 4: Preview the full customer_id → seller_sub mapping.
-- Eyeball this — every row should map to YOUR cognito sub.
SELECT gp.id, gp.title, gp.customer_id, sc.aws_sub AS future_seller_sub
FROM gallery_posts gp
JOIN stripe_customers sc ON gp.customer_id = sc.customer_id
ORDER BY gp.id;


-- =============================================================================
-- SECTION A: New columns on existing tables + new e-commerce tables
-- Run this entire block as one transaction (select all, execute).
-- Safe to roll back if anything fails — no data is moved or dropped here.
-- =============================================================================

BEGIN;

-- -------------------------------------------------------
-- 1. cognito_users — add TOS acceptance fields + is_admin
-- -------------------------------------------------------
ALTER TABLE cognito_users
  ADD COLUMN IF NOT EXISTS accepted_tos_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tos_version     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_admin        BOOLEAN DEFAULT false;

-- -------------------------------------------------------
-- 2. gallery_posts — add new columns
--    (the FK change happens in Section B Step 9)
-- -------------------------------------------------------
ALTER TABLE gallery_posts
  ADD COLUMN IF NOT EXISTS quantity      INTEGER     DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC     DEFAULT 0;

-- -------------------------------------------------------
-- 3. quota_tracking — add soft-delete column
-- -------------------------------------------------------
ALTER TABLE quota_tracking
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- -------------------------------------------------------
-- 4. New table: auctions
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- 5. New table: bids
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS bids (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auction_id  BIGINT      NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_sub  VARCHAR     NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
  bid_amount  NUMERIC     NOT NULL CHECK (bid_amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 6. New table: auction_results
--    (platform_fee, seller_net, payout_id are added in Section D
--     after seller_payouts is created)
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- 7. New table: auction_notifications
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_sub    VARCHAR     NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE,
  auction_id  BIGINT      NOT NULL REFERENCES auctions(id)       ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('outbid', 'won')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE
);

-- -------------------------------------------------------
-- 8. New table: purchases
--    (platform_fee, seller_net, payout_id, shipping_address
--     are added in Section D after seller_payouts is created)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_sub                VARCHAR     NOT NULL REFERENCES cognito_users(sub),
  seller_sub               VARCHAR     NOT NULL REFERENCES cognito_users(sub),
  item_type                VARCHAR     NOT NULL CHECK (item_type IN ('gallery_post', 'auction')),
  item_id                  BIGINT      NOT NULL,
  quantity                 INT         NOT NULL DEFAULT 1,
  amount_paid              NUMERIC     NOT NULL,
  shipping_cost            NUMERIC     DEFAULT 0,
  processor_transaction_id VARCHAR,
  status                   VARCHAR     NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'completed', 'refunded')),
  tracking_number          TEXT,
  shipped_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;


-- =============================================================================
-- SECTION B: Data migrations — customer_id → cognito sub
-- CRITICAL: These move real production data. Each step is its own transaction.
-- Read all notes before executing.
--
-- NOTE ON posts_imgs: those rows link to gallery_posts.id (the BIGINT identity
-- column), which never changes. The hundreds of image links are NOT touched.
-- =============================================================================

-- -------------------------------------------------------
-- 9. gallery_posts: customer_id → seller_sub
--
-- IMPORTANT: After running the UPDATE but BEFORE committing, run the
-- checkpoint SELECT below and verify both counts match your total post count.
-- If they match: run COMMIT.
-- If something looks wrong: run ROLLBACK instead — no damage done.
-- -------------------------------------------------------
BEGIN;

ALTER TABLE gallery_posts
  ADD COLUMN IF NOT EXISTS seller_sub VARCHAR(255) REFERENCES cognito_users(sub) ON DELETE CASCADE;

UPDATE gallery_posts gp
SET seller_sub = sc.aws_sub
FROM stripe_customers sc
WHERE gp.customer_id = sc.customer_id;

-- Guard: raises an exception and rolls back if any row couldn't be mapped
DO $$
DECLARE unmapped INT;
BEGIN
  SELECT COUNT(*) INTO unmapped
  FROM gallery_posts
  WHERE seller_sub IS NULL AND customer_id IS NOT NULL;

  IF unmapped > 0 THEN
    RAISE EXCEPTION
      'gallery_posts migration blocked: % row(s) have a customer_id with no matching '
      'stripe_customers.aws_sub. Resolve the orphaned rows and re-run.', unmapped;
  END IF;
END;
$$;

-- *** CHECKPOINT — run this SELECT now (while still inside the transaction) ***
-- Both numbers should be equal and should match your total gallery post count.
-- If they match, run COMMIT below. If not, run ROLLBACK.
SELECT COUNT(*) AS total_posts, COUNT(seller_sub) AS mapped_posts FROM gallery_posts;

-- COMMIT or ROLLBACK based on the checkpoint above:
COMMIT;
-- ROLLBACK;

-- After COMMIT, run these two lines individually:
ALTER TABLE gallery_posts ALTER COLUMN seller_sub SET NOT NULL;
ALTER TABLE gallery_posts DROP COLUMN customer_id;  -- auto-drops the FK constraint


-- -------------------------------------------------------
-- 10. image_uploads: customer_id → user_sub
-- -------------------------------------------------------
BEGIN;

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

COMMIT;

-- After COMMIT, run these individually:
ALTER TABLE image_uploads ALTER COLUMN user_sub SET NOT NULL;
DROP INDEX IF EXISTS idx_image_uploads_customer_time;
ALTER TABLE image_uploads DROP COLUMN customer_id;  -- auto-drops the FK constraint
CREATE INDEX IF NOT EXISTS idx_image_uploads_user_time ON image_uploads (user_sub, created_at);


-- -------------------------------------------------------
-- 11. inventory_snapshot: customer_id → user_sub
-- -------------------------------------------------------
BEGIN;

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

COMMIT;

-- After COMMIT, run these individually:
ALTER TABLE inventory_snapshot ALTER COLUMN user_sub SET NOT NULL;
ALTER TABLE inventory_snapshot DROP COLUMN customer_id;  -- auto-drops the FK constraint


-- =============================================================================
-- SECTION C: Performance indexes
-- CONCURRENTLY cannot run inside a transaction. Run each statement below
-- ONE AT A TIME — do not select-all and execute this section as a block.
-- =============================================================================

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


-- =============================================================================
-- SECTION D: seller_payouts table + fee/payout columns on auction_results
--            and purchases
-- seller_payouts must exist before the ALTER TABLEs below that add payout_id
-- FKs referencing it. Run this entire block as one transaction.
-- =============================================================================

BEGIN;

-- -------------------------------------------------------
-- 13. New table: seller_payouts
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- 14. auction_results — fee tracking + payout linkage
-- -------------------------------------------------------
ALTER TABLE auction_results
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_id    BIGINT  REFERENCES seller_payouts(id);

-- -------------------------------------------------------
-- 15. purchases — fee tracking + payout linkage
-- -------------------------------------------------------
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_id    BIGINT  REFERENCES seller_payouts(id);

-- -------------------------------------------------------
-- 16. purchases — shipping address (AES-256 encrypted PII)
-- -------------------------------------------------------
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS shipping_address TEXT;

COMMIT;


-- =============================================================================
-- SECTION E: Final indexes (run individually)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller_sub ON seller_payouts(seller_sub);
CREATE INDEX IF NOT EXISTS idx_purchases_payout_id ON purchases(payout_id);


-- =============================================================================
-- POST-MIGRATION: Flag your admin user
-- After everything above is complete, run this with your actual cognito sub.
-- Find your sub in the Cognito console or: SELECT sub, email FROM cognito_users;
-- =============================================================================
-- UPDATE cognito_users SET is_admin = true WHERE sub = '<your-cognito-sub>';
