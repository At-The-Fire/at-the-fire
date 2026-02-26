# Environment & Deployment Guide

This guide covers local setup and environment variable configuration.

---

## Local Setup

```bash
# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client

# Start the server (port 7890)
npm start

# Start the React dev server (port 3000)
npm start --prefix client

# Reset the database (DESTRUCTIVE — drops and recreates all tables)
npm run setup-db --prefix server
```

There is no `.env.example` — copy env vars from Heroku config or the team's shared secrets. The server uses `dotenv` to load `.env` from the server directory.

---

## Key Environment Variables

### Database
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (used in CI and optionally locally) |

### AWS
| Variable | Description |
|---|---|
| `COGNITO_USER_POOL_ID` | Cognito user pool ID |
| `APP_CLIENT_ID` | Cognito app client ID |
| `AWS_REGION` | AWS region (e.g. `us-west-2`) |
| `AWS_BUCKET_NAME` | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `CLOUDFRONT_DOMAIN` | CloudFront domain for image delivery |

### Stripe
| Variable | Description |
|---|---|
| `STRIPE_PRIVATE_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Redis
| Variable | Default | Description |
|---|---|---|
| `REDIS_ENABLED` | `true` | Set to `false` to disable caching |
| `REDIS_HOST` | — | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_USERNAME` | `default` | Redis username |
| `REDIS_PASSWORD` | — | Redis password |

### App
| Variable | Description |
|---|---|
| `ADMIN_ID` | Stripe customer ID of the admin user |
| `ENCRYPTION_KEY` | AES-256 key for PII encryption |
| `CLIENT_URL` | Base URL of the client (used in Stripe redirect URLs) |
| `APP_ENV` | `development` or `production` (controls S3 bucket suffix and logging) |
| `DEV_SERVER` | Set to `dev` to show "DEV" in browser title |
| `NODE_ENV` | `test` disables console errors and uses test mocks |

### Test-only
| Variable | Description |
|---|---|
| `TEST_SUB_FULL_CUSTOMER` | Cognito sub for the full test customer |
| `TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER` | Stripe customer ID for the full test customer (also used as admin in tests) |
| _(+ others)_ | See `ci.yml` for the full list of `TEST_*` vars |

---

## Stripe Local Webhook Testing

Run the Stripe CLI to forward webhook events to your local server:

```bash
stripe listen --forward-to localhost:7890/api/v1/webhook
```

See `docs/api/stripe-cli-quickstart.md` for setup instructions.

---

## Production / Heroku

All env vars are configured in Heroku's config vars dashboard. See `docs/deployment-workflow.md` for the full deploy process.
