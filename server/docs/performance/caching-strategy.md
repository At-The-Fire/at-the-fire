# Caching & Performance Strategy

This document summarizes the caching and performance strategies used in the system, including Redis, rate limiting, and other optimizations.

---

## Redis Caching

- See `docs/redis/redis-integration-summary.md` for details
- Used for gallery data, user profiles, conversations, etc.
- Expiration times set per object type
- Cache invalidated on data changes (e.g., post creation, profile update)

## Rate Limiting

- (Add details if implemented, e.g., per-IP or per-user limits)
- Prevents abuse and DoS attacks

## Other Optimizations

- Database indexes on frequently queried fields
- Batched queries and pagination for large lists
- S3/CloudFront for static asset delivery

---

For more, see relevant controller and middleware files.
