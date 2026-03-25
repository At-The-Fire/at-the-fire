# 3rd Party Services & Integrations

This document summarizes all external services integrated with the system, their purposes, and relevant env vars.

---

## AWS Cognito

- **Purpose:** User authentication — JWT issuance, sign-up, sign-in, password reset
- **Integration:** `lib/controllers/auth.js`, `lib/middleware/authenticateAWS.js`
- **Env Vars:** `COGNITO_USER_POOL_ID`, `APP_CLIENT_ID`, `AWS_REGION`
- **Docs:** [AWS Cognito Docs](https://docs.aws.amazon.com/cognito/)

---

## AWS S3

- **Purpose:** Image storage — avatars, gallery post images, auction images, business logos
- **Integration:** `lib/controllers/profile.js`, `lib/controllers/dashboard.js`, `lib/controllers/auctions.js`
- **Env Vars:** `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- **Docs:** [AWS S3 Docs](https://docs.aws.amazon.com/s3/)

---

## AWS CloudFront

- **Purpose:** CDN for optimized image delivery in production
- **Integration:** Image URLs use the CloudFront domain in production, S3 URL in development
- **Env Vars:** `CLOUDFRONT_DOMAIN`
- **Docs:** [AWS CloudFront Docs](https://docs.aws.amazon.com/cloudfront/)

---

## Stripe

- **Purpose:** Subscription payments, billing portal, webhook lifecycle
- **Integration:** `lib/controllers/webhook.js`, `lib/controllers/checkout.js`, `lib/controllers/customerPortal.js`, `lib/controllers/stripe.js`, `lib/models/StripeCustomer.js`, `lib/models/Subscriptions.js`
- **Env Vars:** `STRIPE_PRIVATE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Docs:** [Stripe Docs](https://stripe.com/docs)

---

## Redis

- **Purpose:** Response caching for gallery, profiles, and conversations
- **Integration:** `redisClient.js`, used in `lib/controllers/galleryPosts.js`, `profile.js`, `conversations.js`, `dashboard.js`
- **Env Vars:** `REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`
- **Note:** `REDISCLOUD_URL` is used by CI to flush the production Redis cache on deploy to `main`. It is not used by the application server directly.
- **Docs:** [Redis Docs](https://redis.io/docs/)

---

For more, see the relevant controller/model files and `.env`.
