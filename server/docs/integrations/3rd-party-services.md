# 3rd Party Services & Integrations

This document summarizes all external services integrated with the system, their purposes, and where to find related code and configuration.

---

## AWS Cognito

- **Purpose:** User authentication and management
- **Integration Points:** `lib/controllers/auth.js`, `lib/middleware/authenticateAWS.js`
- **Env Vars:** `COGNITO_USER_POOL_ID`, `APP_CLIENT_ID`, `AWS_REGION`, etc.
- **Docs:** [AWS Cognito Docs](https://docs.aws.amazon.com/cognito/)

## AWS S3 & CloudFront

- **Purpose:** File/image storage (avatars, post images)
- **Integration Points:** `lib/controllers/profile.js`, `lib/controllers/dashboard.js`
- **Env Vars:** `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUDFRONT_DOMAIN`
- **Docs:** [AWS S3 Docs](https://docs.aws.amazon.com/s3/)

## Stripe

- **Purpose:** Payments, subscriptions, billing
- **Integration Points:** `lib/controllers/webhook.js`, `lib/models/StripeCustomer.js`, `lib/models/Subscriptions.js`
- **Env Vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc.
- **Docs:** [Stripe Docs](https://stripe.com/docs)

## Redis

- **Purpose:** Caching for performance
- **Integration Points:** See `docs/redis/redis-integration-summary.md`
- **Env Vars:** `REDISCLOUD_URL`, `REDIS_PASSWORD`,`REDIS_HOST`,`REDIS_PORT`
- **Docs:** [Redis Docs](https://redis.io/docs/)

---

For more, see the relevant controller/model files and `.env`.
