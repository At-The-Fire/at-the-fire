# Caching & Performance Strategy

This document summarizes the caching and performance strategies used in the system.

---

## Redis Caching

See `docs/redis/redis-integration-summary.md` for full detail on keys, TTLs, and invalidation.

**Summary:**
- `gallery:main` — public gallery posts, 5 min TTL
- `profile:<sub>` / `bizProfile:<sub>` — user and business profiles, 24 hr TTL
- `profilePosts:<sub>` — a user's own gallery posts, 5 min TTL
- `conversation:<sub>` — conversation list for a user, 5 min TTL

Cache is invalidated eagerly on writes (no stale-while-revalidate). Redis disabled gracefully when `REDIS_ENABLED=false`.

---

## Rate Limiting

Implemented via `express-rate-limit` in `lib/app.js`, applied globally.

| Environment | Window | Max requests |
|---|---|---|
| Production | 15 minutes | 3,000 |
| Test | 1 minute | 150 |

Returns `429` with `{ code: 429, message: 'Too many requests, slow down.' }` when exceeded. Uses standard `RateLimit-*` headers.

---

## Database Indexes

Indexes defined in `sql/setup.sql` on frequently queried fields:

| Index | Table | Columns |
|---|---|---|
| `idx_image_uploads_customer_time` | `image_uploads` | `customer_id, created_at` |
| `idx_sales_product` | `product_sales` | `product_id` |
| `likes_user_gallery_idx` | `likes` | `sub, post_id` |
| `likes_gallery_item_idx` | `likes` | `post_id` |
| `idx_messages_conversation_id` | `messages` | `conversation_id` |
| `idx_messages_sender_sub` | `messages` | `sender_sub` |
| `idx_conversation_participants_user_sub` | `conversation_participants` | `user_sub` |

---

## Static Asset Delivery

Images are stored in AWS S3 and served via CloudFront CDN in production. The client compresses images browser-side before upload (`browser-image-compression`). CloudFront cache headers are set to `public, max-age=31536000, immutable` on upload.

---

For more, see `lib/app.js` (rate limiting), `sql/setup.sql` (indexes), and `docs/redis/`.
