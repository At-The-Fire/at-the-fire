-- Migration: decouple gallery_posts, purchases, image_uploads from stripe_customers
-- Run pre-migration verification checks before executing this script.
-- Test locally first. Back up prod before running there.

BEGIN;

-- ============================================================
-- 1. gallery_posts: customer_id → seller_sub
-- ============================================================
ALTER TABLE gallery_posts
  ADD COLUMN seller_sub VARCHAR(255) REFERENCES cognito_users(sub) ON DELETE CASCADE;

UPDATE gallery_posts gp
SET seller_sub = sc.aws_sub
FROM stripe_customers sc
WHERE gp.customer_id = sc.customer_id;

-- Must return 0 before proceeding
SELECT id, customer_id FROM gallery_posts WHERE seller_sub IS NULL;

ALTER TABLE gallery_posts ALTER COLUMN seller_sub SET NOT NULL;
ALTER TABLE gallery_posts DROP CONSTRAINT gallery_posts_customer_id_fkey;
ALTER TABLE gallery_posts DROP COLUMN customer_id;

-- ============================================================
-- 2. purchases: seller_customer_id → seller_sub
-- ============================================================
ALTER TABLE purchases
  ADD COLUMN seller_sub VARCHAR(255) REFERENCES cognito_users(sub);

UPDATE purchases p
SET seller_sub = sc.aws_sub
FROM stripe_customers sc
WHERE p.seller_customer_id = sc.customer_id;

-- Must return 0 before proceeding
SELECT id, seller_customer_id FROM purchases WHERE seller_sub IS NULL;

ALTER TABLE purchases ALTER COLUMN seller_sub SET NOT NULL;
ALTER TABLE purchases DROP COLUMN seller_customer_id;

-- ============================================================
-- 3. image_uploads: customer_id → user_sub
-- ============================================================
ALTER TABLE image_uploads
  ADD COLUMN user_sub VARCHAR(255) REFERENCES cognito_users(sub);

UPDATE image_uploads iu
SET user_sub = sc.aws_sub
FROM stripe_customers sc
WHERE iu.customer_id = sc.customer_id;

-- Must return 0 before proceeding
SELECT id, customer_id FROM image_uploads WHERE user_sub IS NULL;

ALTER TABLE image_uploads ALTER COLUMN user_sub SET NOT NULL;
DROP INDEX IF EXISTS idx_image_uploads_customer_time;
ALTER TABLE image_uploads DROP COLUMN customer_id;
CREATE INDEX idx_image_uploads_user_time ON image_uploads (user_sub, created_at);

-- ============================================================
-- 4. inventory_snapshot: customer_id → user_sub
-- ============================================================
ALTER TABLE inventory_snapshot
  ADD COLUMN user_sub VARCHAR(255) REFERENCES cognito_users(sub) ON DELETE CASCADE;

UPDATE inventory_snapshot ins
SET user_sub = sc.aws_sub
FROM stripe_customers sc
WHERE ins.customer_id = sc.customer_id;

-- Must return 0 before proceeding
SELECT id, customer_id FROM inventory_snapshot WHERE user_sub IS NULL;

ALTER TABLE inventory_snapshot ALTER COLUMN user_sub SET NOT NULL;
ALTER TABLE inventory_snapshot DROP CONSTRAINT inventory_snapshot_customer_id_fkey;
ALTER TABLE inventory_snapshot DROP COLUMN customer_id;

COMMIT;
