# Environment & Deployment Guide

This guide explains how to set up and deploy the system in local, staging, and production environments.

---

## Environment Setup

- **Clone the repo** and install dependencies: `npm install`
- **Copy `.env.example` to `.env`** and fill in required values
- **Key Env Vars:**
  - AWS: `COGNITO_USER_POOL_ID`, `APP_CLIENT_ID`, `AWS_REGION`, `AWS_BUCKET_NAME`, etc.
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Redis: `REDIS_URL`
  - Database: `DATABASE_URL`
  - See Heroku server settings for entire list

## Local Development

- Start the server: `npm run dev` or `node server.js`
- Use local database and test credentials
- Use Stripe test mode
- Set up Stripe CLI listener
  - Stripe CLI quick start guide in **/docs/api/**

## Staging/Production

- Set all secrets and production env vars
- Use production database and Stripe keys
- Deploy using your preferred method (e.g., Docker, cloud service, CI/CD)
- Run migrations if needed: `npm run migrate`

## Deployment Checklist

- All env vars set
- Database migrated
- Webhooks configured (Stripe, etc.)
- Monitoring/logging enabled

---

For more, see the README and deployment scripts.
