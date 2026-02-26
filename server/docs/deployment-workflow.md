# Deployment Workflow

This document outlines how the app is built and deployed to Heroku for development and production.

---

## Overview

The monorepo has two Heroku apps:
- **Dev server** — deployed from the `dev` branch (or feature branches)
- **Production server** — deployed from `main`, gated by CI

The server statically serves the compiled React client from `lib/clientBuild/build/`. On Heroku deploy, the `heroku-postbuild` script automatically builds the client and copies it into place — no manual copy step required.

---

## Development Deployment

1. Configure the client env file for the dev backend URL:
   - Use `.env.production.dev` (rename/copy to `.env.production` before building if needed).
2. Push changes to the `dev` branch.
3. Heroku auto-deploys the `dev` app, runs `heroku-postbuild` (builds client + copies to server).

---

## Production Deployment

1. Configure the client env file for the production backend URL:
   - Use `.env.production.prod` (rename/copy to `.env.production` before building if needed).
2. Open a PR: merge `dev` → `main` on GitHub.
3. CI runs automatically (lint + server tests against real PostgreSQL and Redis).
4. On CI pass, merge the PR.
5. Heroku auto-deploys the production app from `main`, runs `heroku-postbuild`.
6. CI also flushes the production Redis cache after a direct push/merge to `main`.

---

## Client Environment Files

The React client uses `.env.production` at build time to set the backend URL and other client-side vars:

| File | Purpose |
|---|---|
| `.env.production.dev` | Points client at the dev Heroku backend |
| `.env.production.prod` | Points client at the production Heroku backend |

Rename the appropriate file to `.env.production` before building, then rename it back after.

---

## Heroku Build Script

Defined in root `package.json`:

```
npm run heroku-postbuild
```

This builds the React client (`npm run build --prefix client`) and copies the output into `server/lib/clientBuild/build/` so the Express server can serve it statically.

---

## Summary

| Target | Branch | Triggered by |
|---|---|---|
| Dev | `dev` | Push to `dev` |
| Production | `main` | PR merge + CI pass |
