# Plan: Decouple Gallery Posts from Stripe Customer ID

## Context

Gallery posting is being made free (Cognito auth only). The problem: `gallery_posts.customer_id` is a hard FK to `stripe_customers`, so free users (no Stripe record) cannot own gallery posts. Auctions already use the correct pattern: `seller_sub VARCHAR REFERENCES cognito_users(sub)`. This plan migrates gallery posts — and two dependent tables — to use the same pattern.

---

## How Database Migration Works Here (No Migration Framework)

Since this project has no migration framework, schema changes are done in two steps:

1. **One-time migration script** — Run manually against dev and then prod databases. This transforms the live data in-place.
2. **Update `setup.sql`** — The canonical schema file. Updated so `npm run setup-db` recreates the correct schema going forward.

The core technique for migrating a FK column:

```
Add new column (nullable) → populate from joins → verify no NULLs → set NOT NULL → drop old FK constraint → drop old column
```

Wrapping in a transaction means if any step fails, the database rolls back to its original state.

---

## Tables Being Changed

| Table | Old column | New column | FK target | Reason |
|---|---|---|---|---|
| `gallery_posts` | `customer_id → stripe_customers` | `seller_sub → cognito_users(sub)` | Free users can post |
| `purchases` | `seller_customer_id → stripe_customers` | `seller_sub → cognito_users(sub)` | Free user can be a seller |
| `image_uploads` | `customer_id → stripe_customers` | `user_sub → cognito_users(sub)` | Free users can upload images |

**Tables NOT changing** (premium-only, keep Stripe FK):
`orders`, `quota_tracking`, `quota_goals`, `inventory_snapshot`, `subscriptions`, `invoices`

---

## Phase 1: Migration SQL Script

Create `server/sql/migrate_gallery_sub.sql`. Run inside a transaction so any failure rolls back entirely.

```sql
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

-- Verification: must return 0 rows
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

-- Verification: must return 0 rows
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

-- Verification: must return 0 rows
SELECT id, customer_id FROM image_uploads WHERE user_sub IS NULL;

ALTER TABLE image_uploads ALTER COLUMN user_sub SET NOT NULL;
DROP INDEX IF EXISTS image_uploads_customer_id_created_at_idx; -- name may vary, check \d image_uploads
ALTER TABLE image_uploads DROP COLUMN customer_id;
CREATE INDEX ON image_uploads (user_sub, created_at);

COMMIT;
```

> **Run order:** Dev first, verify, then prod.
> **Backup prod first** using `heroku pg:backups:capture` before running against prod.

---

## Phase 2: Update `setup.sql`

In `server/sql/setup.sql`, update the three table definitions to use the new columns. The seed INSERT statements for gallery_posts will also need `seller_sub` values instead of `customer_id`.

Critical changes:
- `gallery_posts`: replace `customer_id VARCHAR(255), FOREIGN KEY (customer_id) REFERENCES stripe_customers...` with `seller_sub VARCHAR(255) NOT NULL REFERENCES cognito_users(sub) ON DELETE CASCADE`
- `purchases`: replace `seller_customer_id VARCHAR(255) NOT NULL, FOREIGN KEY... REFERENCES stripe_customers...` with `seller_sub VARCHAR(255) NOT NULL REFERENCES cognito_users(sub)`
- `image_uploads`: replace `customer_id` with `user_sub`, update the index
- Seed INSERT statements: use the seeded user's `sub` value instead of customer_id

---

## Phase 3: Server Code Changes

### 3a. Models

**`server/lib/models/Post.js`**
- `postNewPost(...)`: remove `customerId` param, add `sellerSub`; update INSERT to use `seller_sub`
- `updateById(...)`: remove `customerId` param; remove `customer_id = $7` from UPDATE (owner doesn't change on edit)
- `getFeedPosts(sub)`: update JOIN — instead of `JOIN stripe_customers ON gallery_posts.customer_id = sc.customer_id`, join `cognito_users ON gallery_posts.seller_sub = cu.sub` then `LEFT JOIN stripe_customers ON cu.sub = sc.aws_sub` (to still get display_name, logo etc.)
- `getById()`: add `seller_sub` to SELECT so ownership checks work in controllers

**`server/lib/models/AWSUser.js`**
- `getGalleryPosts(customer_id)` → `getGalleryPosts(sub)`: change param name and `WHERE customer_id=$1` → `WHERE seller_sub=$1`
- `checkAndRecordImageUploads(customer_id, count)` → `checkAndRecordImageUploads(sub, count)`: change param, update query to use `user_sub`

**`server/lib/models/Gallery.js`**
- `getGalleryPosts()`: update JOIN — `JOIN stripe_customers AS s ON g.customer_id = s.customer_id` → `JOIN cognito_users AS cu ON g.seller_sub = cu.sub LEFT JOIN stripe_customers AS s ON cu.sub = s.aws_sub`
- `getGalleryPostsByStripeId(customerId)` → `getGalleryPostsBySub(sub)`: update param and WHERE clause
- `getGalleryPostById(id)`: update JOIN same as above

**`server/lib/models/InventorySnapshot.js`**
- `fetchCurrentPosts(customerId)`: change to `fetchCurrentPosts(sub)`, update `WHERE customer_id=$1` → `WHERE seller_sub=$1`. (This is called from a premium route where `req.userAWSSub` is available alongside `req.customerId`.)

**`server/lib/models/StripeCustomer.js`**
- `deleteSubscriber(sub)` transaction (~line 196): change `DELETE FROM gallery_posts WHERE customer_id=$1` → `DELETE FROM gallery_posts WHERE seller_sub=$1` (passing the aws_sub/sub directly)

**`server/lib/models/Purchase.js`**
- `getBySellerCustomerId(customerid)` → `getBySellerSub(sub)`: rename, update WHERE clause
- `create(...)`: update INSERT to use `seller_sub` instead of `seller_customer_id`

### 3b. Controllers

**`server/lib/controllers/dashboard.js`**
- All `req.customerId` → `req.userAWSSub` for gallery post operations
- Ownership checks: `post.customer_id !== req.customerId` → `post.seller_sub !== req.userAWSSub`
- `POST /upload`: `AWSUser.checkAndRecordImageUploads(req.customerId, ...)` → use `req.userAWSSub`
- `GET /`: `AWSUser.getGalleryPosts(req.customerId)` → `AWSUser.getGalleryPosts(req.userAWSSub)`
- `POST /`: `Post.postNewPost(..., req.customerId, ...)` → pass `req.userAWSSub` as `sellerSub`
- `PUT /:id`: `Post.updateById(..., customerId, ...)` → remove customerId param
- Remove all `if (req.restricted)` blocks — gallery posts are now free and `authorizeSubscription` is not in this route chain, so `req.restricted` is always undefined (falsy). These checks are dead code.

**`server/lib/controllers/purchases.js`**
- `POST /confirm`: when fetching post, use `gallery_posts.seller_sub` for the new `seller_sub` column in purchases INSERT
- `GET /seller`: replace `SELECT customer_id FROM stripe_customers WHERE aws_sub=$1` lookup with direct `req.userAWSSub`; call `Purchase.getBySellerSub(req.userAWSSub)`
- `PUT /:id/tracking`: ownership check currently looks up `stripe_customers WHERE customer_id=$1` — update to look up seller by `purchase.seller_sub` directly

**`server/lib/controllers/atfOperations.js`**
- `DELETE /delete-user/:sub`: `AWSUser.getGalleryPosts(stripeCustomer.customerId)` → `AWSUser.getGalleryPosts(sub)` (the sub is already available in this route); `DELETE FROM gallery_posts WHERE customer_id=$1` → `WHERE seller_sub=$1`

**`server/lib/app.js`**
- Dashboard route (`/api/v1/dashboard`) stays as `[jsonParser, authenticateAWS]` — no subscription middleware needed.

### 3c. Middleware

**`server/lib/middleware/authorizeSubscription.js`**
- No changes — it stays as-is for premium routes. It is not (and should not be) in the dashboard route chain.

---

## Phase 4: Client Code Changes

Minimal. The client does not explicitly send `customerId` in gallery post API calls — it sends cookies and the server resolves identity from the JWT.

- **`client/src/stores/useAuthStore.js`**: No change. `customerId` is still used for premium feature routing.
- **`client/src/hooks/usePosts.js`**: No change — still reads `data.restricted` from GET /dashboard response (will always be `false` now).
- **`client/src/components/DashboardTabs/DashboardTabs.js`**: No change — premium tab gating via `hasPremiumAccess` is unaffected.

---

## Execution Order (Minimize Risk)

1. Write `server/sql/migrate_gallery_sub.sql`
2. Update `server/sql/setup.sql` to match new schema
3. Run migration on dev database — verify the SELECT checks return 0 rows before COMMIT
4. Update all server models (Post, AWSUser, Gallery, InventorySnapshot, StripeCustomer, Purchase)
5. Update all server controllers (dashboard, purchases, atfOperations)
6. Run server tests
7. Manual smoke test on dev (create post as free user, edit, delete, purchase)
8. Backup prod (`heroku pg:backups:capture`) → run migration on prod → deploy

---

## Verification Checklist

- [ ] `GET /api/v1/dashboard` returns posts for an authenticated free user (no Stripe record)
- [ ] `POST /api/v1/dashboard` creates a post linked to Cognito sub (`seller_sub` populated in DB)
- [ ] `PUT /api/v1/dashboard/:id` updates the post; a different user gets 403
- [ ] `DELETE /api/v1/dashboard/:id` deletes the post
- [ ] `POST /api/v1/purchases/confirm` records a purchase with `seller_sub` from gallery_posts
- [ ] `GET /api/v1/purchases/seller` returns sales for the seller by sub
- [ ] `GET /api/v1/gallery-posts` (public feed) shows all posts with seller display info
- [ ] Premium features (Orders, Products, Goals) still work for subscribed users
- [ ] Admin `DELETE /api/v1/atf-operations/delete-user/:sub` cleans up gallery posts

---

## Critical Files

| File | Change type |
|---|---|
| `server/sql/migrate_gallery_sub.sql` | NEW — one-time migration script |
| `server/sql/setup.sql` | Schema update |
| `server/lib/models/Post.js` | postNewPost, updateById, getFeedPosts, getById |
| `server/lib/models/AWSUser.js` | getGalleryPosts, checkAndRecordImageUploads |
| `server/lib/models/Gallery.js` | getGalleryPosts, getGalleryPostsByStripeId, getGalleryPostById |
| `server/lib/models/InventorySnapshot.js` | fetchCurrentPosts |
| `server/lib/models/StripeCustomer.js` | deleteSubscriber |
| `server/lib/models/Purchase.js` | getBySellerCustomerId → getBySellerSub, create |
| `server/lib/controllers/dashboard.js` | All gallery post routes |
| `server/lib/controllers/purchases.js` | /confirm, /seller, /:id/tracking |
| `server/lib/controllers/atfOperations.js` | DELETE /delete-user/:sub |
