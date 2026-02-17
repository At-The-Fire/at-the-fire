# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

At The Fire is an artist/maker business platform (gallery, inventory management, subscriptions, messaging). React 18 SPA built with Create React App, deployed to Heroku.

## Commands

- **Dev server:** `npm start`
- **Build:** `npm run build`
- **Run tests:** `npm test` (Jest via react-scripts, interactive by default; use `npm test -- --watchAll=false` for single run)
- **Run single test:** `npm test -- --testPathPattern=<pattern>`
- **Lint:** No dedicated script; ESLint runs via react-scripts. Use `npx eslint src/` to lint manually.

## Code Style

Enforced via `.eslintrc` and `.prettierrc`:
- Single quotes, semicolons required, 2-space indent, 120 char print width
- Strict equality (`===`) enforced
- Trailing commas in ES5 positions
- No `react-in-jsx-scope` rule (React 18 auto-import)
- PropTypes validation is off

## Architecture

### State Management (Hybrid)

**Zustand stores** (`src/stores/`) are the primary state layer:
- `useAuthStore` — auth state, Cognito user, tokens, Stripe customer
- `usePostStore` — gallery and inventory posts
- `useProfileStore`, `useFollowerStore`, `useLikeStore` — social features
- `useNotificationStore` — messaging notifications, unread counts
- `useQuotaStore`, `useSnapshotStore` — production quota/inventory snapshots
- `useStripeStore` — payment state

**React Context** (`src/context/`) is used for `LoadingContext`, `ProfileContext`, `QueryContext` (legacy pattern, coexists with Zustand).

### Data Fetching

Service functions in `src/services/fetch-*.js` wrap the Fetch API:
- All authenticated requests use `credentials: 'include'`
- Base URL from `process.env.REACT_APP_BASE_URL`
- Errors are structured objects: `{ code, message, type }`
- Backend API prefix: `/api/v1/`

Custom hooks in `src/hooks/` compose service calls with store updates and toast notifications. Key hooks: `useProducts`, `useInventory`, `useOrders`, `usePosts`, `useProfile`, `useConversations`.

### Authentication

AWS Cognito via `amazon-cognito-identity-js`. User pool config is in `src/services/userPool.js` using `REACT_APP_POOL_ID` and `REACT_APP_APP_CLIENT_ID` env vars. Auth store handles sign-up, sign-in, token refresh, and sign-out. Cookies managed via `src/services/cookieAPI.js`.

### Routing

React Router v6 in `src/App.js`. Key routes:
- `/` — public gallery
- `/dashboard` — authenticated dashboard (tabbed: posts, products/inventory, analysis)
- `/dashboard/new`, `/dashboard/edit/:id` — post creation/editing
- `/auth/:type` — sign-in/sign-up
- `/messages`, `/messages/:sub` — real-time messaging (socket.io)
- `/subscription/:result?` — Stripe subscription management
- `/profile/:sub` — user profiles
- `/at-the-bon-fire` — admin dashboard

### UI

Material-UI v5 with dark (default) and light themes defined in `App.js`. Brand green primary: `#1f8e3d` (dark) / `#0c410c` (light). Also uses lucide-react icons, react-toastify for notifications, react-dropzone for file uploads, Chart.js for analytics, react-swipeable for mobile gestures.

### Key Domain Concepts

- **Products** are called "quota-tracking" in the backend API (`/api/v1/quota-tracking`)
- Products have a `sales` array tracking individual sale entries with `quantitySold`
- Image uploads go through browser-image-compression then XHR to S3 with progress tracking
- Inventory snapshots capture point-in-time product state

## Environment Variables

Defined in `.env.*` files. Key vars:
- `REACT_APP_BASE_URL` — backend API URL
- `REACT_APP_POOL_ID` / `REACT_APP_APP_CLIENT_ID` — AWS Cognito config
- `REACT_APP_TEST_MONTHLY` / `REACT_APP_TEST_YEARLY` — Stripe price IDs
- `REACT_APP_APP_ENV` — controls dev-only console logging
