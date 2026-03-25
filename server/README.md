![At The Fire Logo](https://atf-main-storage.s3.us-west-2.amazonaws.com/atf-assets/logo-icon-6-192.png)

# At The Fire — Server

**Node.js/Express REST API and WebSocket server for the At The Fire platform.**

_At The Fire_ is a subscription-based gallery and ecommerce platform for artists and collectors. This package contains the backend: REST API, real-time messaging, Stripe webhooks, scheduled jobs, and static serving of the compiled React client.

See the root `README.md` for a full project overview and feature list.

## Tech Stack

### **Core**

- **Node.js 20 & Express**: REST API, CommonJS modules, no TypeScript.
- **PostgreSQL** (`pg`): Primary database, raw parameterized queries — no ORM, no migrations.
- **Redis** (`redis`): Response caching. Disabled gracefully when `REDIS_ENABLED=false`.
- **Socket.IO**: Real-time private messaging.

### **Authentication & Security**

- **AWS Cognito** (`@aws-sdk/client-cognito-identity-provider`, `amazon-cognito-identity-js`): JWT issuance and user management.
- **jsonwebtoken** + **jwks-rsa**: RS256 JWT verification via Cognito JWKS endpoint.
- **CryptoJS**: AES-256 encryption for PII at rest (emails, phone numbers, messages); SHA-256 hashes stored for lookup.
- **Helmet**: HTTP security headers and Content Security Policy (CSP).
- **express-rate-limit**: Rate limiting on sensitive routes.
- **validator**: Input sanitization and validation.
- **cors** + **cookie-parser**: CORS policy and HTTP-only cookie handling.

### **Payments & Subscriptions**

- **Stripe SDK & Webhooks**: Payment processing, subscription lifecycle, and real-time subscription status updates.

### **Storage & Delivery**

- **AWS S3** (`@aws-sdk/client-s3`): Image storage and management.
- **Multer**: Middleware for parsing multipart form data and handling image uploads.

### **Scheduled Jobs**

- **node-cron**: Background jobs (e.g., auction notification processing).

### **Utilities**

- **json2csv**: CSV export for inventory and sales data.
- **dotenv**: Environment variable loading.

### **Testing & Code Quality**

- **Jest** + **Supertest**: Unit and integration tests against real PostgreSQL and Redis services.
- **redis-mock**: Redis mock for isolated unit tests.
- **ESLint** + **Prettier**: Code style enforcement.

## Key Architectural Decisions

- **No ORM, no migrations**: Schema managed by dropping and recreating from `sql/setup.sql`.
- **Redis is optional**: `REDIS_ENABLED=false` causes the Redis client to silently no-op (useful for local dev).
- **PII encryption**: Emails, phone numbers, and messages are encrypted at rest; SHA-256 hashes stored for lookup.
- **Products vs. "quota-tracking"**: What the UI calls "Products" maps to `/api/v1/quota-tracking` routes.
- **Static serving**: Compiled React client served from `lib/clientBuild/build/` in production.

## Controllers

| Controller | Responsibility |
|---|---|
| `auth.js` | Cognito sign-up/sign-in, token refresh |
| `users.js` | User profile management |
| `galleryPosts.js` | Gallery post CRUD |
| `quotaTracking.js` | Product/inventory management |
| `inventorySnapshot.js` | Point-in-time inventory snapshots |
| `orders.js` | Purchase order management |
| `goals.js` | Production quota goals |
| `sales.js` | Sales tracking |
| `auctions.js` | Auction creation and management |
| `bids.js` | Auction bidding |
| `auctionNotifications.js` | Auction event notifications |
| `cart.js` | Shopping cart |
| `checkout.js` | Stripe-powered product checkout |
| `purchases.js` | Buyer purchase history |
| `conversations.js` + `followers.js` + `likes.js` | Social features |
| `dashboard.js` | Aggregated dashboard data |
| `stripe.js` + `webhook.js` | Stripe subscription and webhook handling |
| `customerPortal.js` | Stripe customer portal sessions |
| `profile.js` | Public profile data |
| `atfOperations.js` | Admin/internal operations |

## Team & Ownership

- **Owner / Lead Developer**: [Kevin Nail](https://www.kevinnail.com/)
- **Contributors**: [Tyler Watson](https://www.linkedin.com/in/tylerwatson91), [Jake Doherty](https://www.linkedin.com/in/jacob-doherty1)

## Licensing & Proprietary Information

_At The Fire_ is proprietary software. All rights reserved. No portion of the codebase or design may be reproduced or shared without permission from the owner.

---

For any questions, please contact Kevin Nail at [kevin@kevinnail.com](mailto:kevin@kevinnail.com).
