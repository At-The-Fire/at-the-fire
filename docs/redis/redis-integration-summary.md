# Redis Integration Summary

This document provides a quick reference for developers to understand how and where Redis is used in the system. It lists the main data objects cached in Redis, their keys, and their structures, as well as which parts of the backend interact with Redis.

---

## Overview

Redis is used as a caching layer to improve performance and reduce database load for frequently accessed data. The following controllers in the backend interact with Redis:

- `galleryPosts.js`
- `dashboard.js`
- `profile.js`
- `conversations.js`

---

## Connection

Redis is configured via environment variables:

| Variable | Default | Description |
|---|---|---|
| `REDIS_ENABLED` | `true` | Set to `false`/`0`/`off`/`no` to disable |
| `REDIS_HOST` | — | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_USERNAME` | `default` | Redis username |
| `REDIS_PASSWORD` | — | Redis password |

The client is a singleton — initialized once on first call to `getRedisClient()` and reused for all subsequent calls.

---

## Disabling Redis (temporary)

Redis is optional. You can disable it without removing any Redis-related code paths.

### Env toggle

Set the environment variable `REDIS_ENABLED=false` (also accepts `0`, `off`, `no`).

When disabled, the backend returns a **no-op Redis client** from `getRedisClient()` so calls like `get`, `set`, `del`, and `ttl` won't throw, but caching is effectively turned off:

- `get()` always returns `null` (cache miss)
- `set()` returns `'OK'` (no data stored)
- `del()` returns `0`
- `ttl()` returns `-2` (key does not exist)

### Failure fallback

If Redis is enabled but the connection fails (expired Redis plan, wrong credentials, network issues), the client also falls back to the same no-op behavior to keep the app running.

---

## Cached Data Objects

### 1. Gallery Data

- **Key:** `gallery:main`
- **Type:** Array of Gallery Post objects
- **Used in:** Gallery homepage, dashboard
- **Object Structure:**
  ```js
  {
    id,
      created_at,
      title,
      description,
      image_url,
      category,
      price,
      customer_id,
      public_id,
      num_imgs,
      display_name,
      logo_image_url,
      sub,
      sold;
  }
  ```

### 2. User Profile Data

- **Key:** `profile:<sub>`
- **Type:** User Profile object
- **Used in:** User profile endpoints
- **Object Structure:**
  ```js
  {
    sub, createdAt, imageUrl, publicId, firstName, lastName, bio, socialMediaLinks;
  }
  ```

### 3. Business Profile Data

- **Key:** `bizProfile:<sub>`
- **Type:** Business Profile (Stripe Customer) object
- **Used in:** Business profile endpoints
- **Object Structure:**
  ```js
  {
    awsSub, customerId, name, displayName, logoImageUrl, logoPublicId, websiteUrl;
  }
  ```

### 4. User's Gallery Posts

- **Key:** `profilePosts:<sub>`
- **Type:** Array of Gallery Post objects (see above)
- **Used in:** User profile, dashboard

### 5. Conversations for a User

- **Key:** `conversation:<sub>`
- **Type:** Array of Conversation objects
- **Used in:** Messaging system
- **Object Structure:**
  ```js
  {
    id,
    created_at,
    updated_at,
    is_sender,
    first_message_sent,
    unread_count,
    participants: [
      {
        sub,
        firstName,
        lastName,
        userAvatar,
        displayName,
        logoImage
      }
    ],
    last_message: {
      id,
      content,
      sender_sub,
      sender_display_user_name,
      sender_logo,
      created_at
    }
  }
  ```

---

## Expiration Times

- Gallery and conversations caches: **5 minutes**
- User and business profiles: **24 hours**
- User's gallery posts: **5 minutes**

---

## Cache Invalidation

| Key | Invalidated by |
|---|---|
| `gallery:main` | Post create, update, delete, image operations (`dashboard.js`) |
| `profilePosts:<sub>` | Post create, update, delete, image operations (`dashboard.js`) |
| `profile:<sub>` | Avatar upload/delete, user profile update, logo upload/delete (`profile.js`) |
| `bizProfile:<sub>` | Business profile update (`profile.js`) |
| `conversation:<sub>` | Message sent, conversation started/deleted, mark-read (`conversations.js`) |

## Notes

- All cached objects are JSON-serialized strings (`JSON.stringify` / `JSON.parse`).
- Cache keys are invalidated eagerly on write — no TTL-only strategy for mutable data.

---

For more details, see the relevant controller files in `lib/controllers/`.
