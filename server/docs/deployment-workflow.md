# Deployment Workflow

This document outlines the workflow for deploying both the frontend and backend for development and production environments.

---

## Development Deployment

| Frontend | Backend |
| -------- | ------- |
| dev-dev  | dev     |

**Steps:**

1. Ensure the correct environment file is used:
   - Rename your development env file to `env.production` (remove `.dev` extension).
2. Build the frontend with the development environment.
3. Copy the built frontend folder to the backend (dev branch).
4. Push changes to the `dev` branch.
5. Deploy the backend from the development Heroku server.

---

## Production Deployment

| Frontend | Backend |
| -------- | ------- |
| dev-prod | dev     |

**Steps:**

1. Prepare for production:
   - Rename your production env file to `env.production` (remove `.prod` extension).
   - Rename the development env file back to include `.dev` extension.
2. Build the frontend with the production environment.
3. Copy the built frontend folder to the backend (dev branch).
4. Push changes to the `dev` branch.
5. Create a PR: merge `dev` into `main` on GitHub.
6. Ensure CI passes (tests run and are green).
7. Merge the PR into `main`.
8. Switch to the production Heroku account.
9. Deploy the backend from the `main` branch.

---

## Environment File Handling

- You have two environment files:
  - `env.production.dev` (for development)
  - `env.production.prod` (for production)
- Before building, rename the appropriate file to `env.production` so it is included in the build.
- After building, rename it back to avoid confusion.

---

## Summary

- **Development:** Build with dev env, deploy to dev branch/server.
- **Production:** Build with prod env, PR dev → main, pass CI, deploy to main branch/server.
