# At The Fire — Contributor Onboarding

<!-- markdownlint-disable MD033 -->

> Full project history + tech stack reference. ~5–7 minute read.

---

## Part 1: Full Project History

### Origins (April–Aug 2023)

The project started around April 2023 — retros started in June, summarized below. The first milestone was getting AWS Cognito `sub` and Stripe `customer_id` into the database together — attaching the sub to Stripe metadata on checkout, receiving it back in a webhook event, and inserting both at once. That linkage became the foundation for all subscription-gating.

#### Jun 2023

Planning phase: wireframes (Whimsical), database schema drafted, Cloudinary account created, MoSCoW board for beta scope. Key schema decisions made here: `cognito_users` (with `first_name`, `last_name`, `bio`), `stripe_customers` (with `display_name`, `logo_image_url`), `social_media_links`, and a `favorites` table.

#### Jul 2023

Development started. Two separate repos (FE + BE). Auth system built: all Cognito sign-up/sign-in/password flows, `AccountContext`, `useAuth` hook, HTTP-only cookies for JWTs. MUI v5 scaffolded. Subscription flow fully wired: checkout session, success/cancel pages, customer portal, monthly/yearly pricing. Webhooks handling `subscription.updated` and `customer.created` events. 30 backend tests passing by end of month.

#### Aug 2023

Gallery and dashboard built: Cloudinary image uploads, full CRUD on posts, CSV download. First real bugs discovered:

- Partial sign-up/purchase flows left orphaned data with `UNIQUE` constraint violations — users had no path to retry
- `is_active` was incorrectly going `false` on cancel; fixed by setting Stripe's portal to cancel at period end instead of immediately
- Encryption attempted (crypto-js), then temporarily reverted — same plaintext produced different ciphertexts, making DB lookups by encrypted value impossible; solved later with SHA-256 hashes stored alongside
- Duplicate Stripe customers when re-subscribing — first pass at fixing this
- Cookie `secure` attribute had a typo in `.env` (`SECURE_COOKIES` missing the `S`); was failing silently on localhost

**Note for Jake, this is about when you stepped away:** The app had: working auth, subscription purchase/cancel/renew, a gallery with Cloudinary images, a basic dashboard for sellers, and a nascent test suite.

---

### What Got Built Next

#### Aug–Dec 2023

- Gallery + dashboard fully built out: Cloudinary uploads, full CRUD on posts, profile pages (avatar, logo, bio, social links, business profile)
- Monorepo created: FE + BE consolidated into one repo, deployed to Heroku at [atthefire.com](https://www.atthefire.com)
- PII encryption added at rest: AES-256 on emails, phone numbers, and names; SHA-256 hashes stored alongside for DB lookups without decryption
- **Quota/Production Tracking**: sellers log daily production, color-coded calendar view, monthly analysis with charts
- **Orders**: custom work order/invoice management tab for subscribers
- Social media links on profiles
- Test suite built out to ~60+ tests with CI passing

#### Jul–Oct 2024 *(after a 6-month hiatus)*

- Subscription enforcement tightened: expired/canceled users get a `restricted` flag; all create/edit routes on the dashboard 403, frontend disables those controls
- Image uploads refactored for concurrent uploads to Cloudinary
- **react-toastify** replaced the old custom `<Toast/>` component app-wide
- Lazy loading on the gallery via `IntersectionObserver` (shimmer placeholder on scroll)
- Browser image compression added before upload
- Security hardened: **Helmet** + **express-rate-limit** wired into the Express app
- Major test restructure: folder layout now mirrors app structure (`Unit/` / `Integration/` / `E2E/`)

#### Oct–Dec 2024

- **Auth refactored from React Context → Zustand** — the single biggest architectural change in the project's history (see "Major Problems" below). `useAuth`, `AuthContext`, and `StripeContext` were deleted; replaced by `useAuthStore` and `useStripeStore`.
- Zustand stores progressively introduced for posts, snapshots, and quota data
- Admin dashboard added at `/at-the-bon-fire`: list users, delete from DB + AWS Cognito + Stripe via SDK calls
- Validation middleware added for all major routes (orders, posts, products, profile updates)
- `profileOwnership`, `authDelUp`, `validatePost`, `validateQuotaProduct`, `validateOrder` middleware all added

#### Jan–Feb 2025

- **Image storage migrated from Cloudinary → AWS S3 + CloudFront CDN** — page data transfer dropped from 20MB+ to ~5.6KB per load
- Redis caching added for gallery and profile routes (gallery posts, profile data)
- Followers/following system built (follow a seller, see their feed)
- Likes system built (like a gallery post)
- **Real-time messaging** built with Socket.IO WebSockets: full conversation system, unread counts, live delivery, delete-before-sending
- Free trial subscription support added (60-day trial, `trialStatus` object on every auth'd request)
- **MVP launched February 20, 2025** (293 tests passing at that point)

#### Mar–May 2025

- Separate DEV environment set up: own Cognito user pool, S3 bucket, and Heroku Postgres database, fully decoupled from production
- **OpenAI AI Assistant** tab added to the dashboard: chat mode, analysis/reports mode, image generation
- Product templates: reuse a prior product's config as a starting point for new entries
- `date_sold` field added to products and gallery posts, displayed in calendar ("shelf time")
- Webhook duplication detection (idempotency check via `webhook_events` table)
- Redis retry limit added (was causing infinite calls on service failure)
- 300+ backend tests passing

#### May–Jun 2025

- **Product Tracking** tab added — a dedicated view for all inventory across product types (renamed `QuotaTracking` → `Products`, `InventoryTracking` → `ProductTracking`)
- **Quantity field** added to products: a product can now represent a batch (e.g. 10 pieces), with individual sale entries tracked in a new `product_sales` table and a `Sales` model/controller
- `isProductSold` utility function introduced — determines sold status by comparing total sales qty to batch qty, rather than a simple boolean flag
- **Orders integrated with Products**: order form gained a product dropdown with live inventory counts; creating an order sale decrements inventory; out-of-stock warning added
- Product templates feature: re-use a prior product's config from a dropdown modal

#### Jan–Feb 2026 *(after a 6-month hiatus)*

- Returned to find Redis had gone offline, causing an infinite reconnect loop — added a 10-retry limit with graceful shutdown and a `REDIS_ENABLED` env var toggle
- Fixed subscription renewal for expired (not just canceled) subscribers; renewing no longer re-triggers the 60-day free trial
- **Monorepo migration** (Feb 17, 2026): the two previously separate repos (`at-the-fire-client`, `at-the-fire-server`) were consolidated into this single monorepo. Root `package.json` handles the Heroku `heroku-postbuild` step; CI consolidated into one workflow file. Old build artifacts removed from git tracking. Socket.IO CORS bug fixed in the process (trailing slash on Heroku dev URL was silently failing).
- Inventory/sales quantity refactor continued: `product_sales` table, `Sales` model, and full CRUD routes wired up; `Orders` ↔ `Products` integration partially completed (sale creation on order submit temporarily disabled pending full data-integrity review)

#### Feb–Mar 2026 *(largest sprint in project history)*

- **Full e-commerce layer built**: auctions, bidding, cart, checkout, and buyer purchases all landed in a two-week push
  - `AuctionCard`, `AuctionList`, `AuctionDetail`, `AuctionArchive`, `AuctionForm` with S3 image uploads
  - `CartIcon`, `CartDrawer`, `Checkout`, `PaymentWidget` integrated into the app bar and purchase flow
  - `useCartStore`, `useAuctionEventsStore` added
  - `MyPurchases` component: buyer view of gallery purchases, active bids, and won auctions
  - `TrackingModal` + `TrackingDisplay` for sellers to input and display tracking numbers with carrier-specific URLs
  - Per-auction countdown timers (client-side intervals); real-time WebSocket events for all auction state changes
- **Shipping addresses**: full form capture at checkout, AES-256 encrypted JSON stored in `purchases`, decrypted and displayed to seller with a one-click copy-to-clipboard button
- **Payout system**: `seller_payouts` table, `Payout` model with atomic batch stamping, seller earnings summary and history views in the dashboard
- **Subscription restructure**: Stripe `customer_id` replaced by Cognito `sub` (`seller_sub` / `user_sub`) as the primary FK across all tables. `is_admin` DB column replaced the old `ADMIN_ID` env var approach.
- **Beta/premium access gating**: `BETA_MODE=true` env var bypasses all subscription checks server-side; `hasPremiumAccess` flag flows to the client via `useAuthStore`; premium tabs styled and gated accordingly
- **TOS version tracking**: `accepted_tos_at` and `tos_version` columns added to `cognito_users`, validated on registration
- **Security hardening sprint** (Feb 27): native `crypto` replaced CryptoJS in key places, JWKS verification strengthened (both access + ID tokens), Socket.IO auth got JWT signature verification, rate limits tightened on auth endpoints, multer file size/type validation added, ownership checks added across sales/profile/dashboard/auction routes
- **Soft deletes** added to `gallery_posts` and `quota_tracking` (`deleted_at` column); hard deletes replaced — images preserved until explicitly cleaned up
- `quantity` field added to gallery posts (synced with product qty)
- **E2E cleanup script** added (`server/scripts/e2e-cleanup.js`) — removes all test data while preserving seed user accounts
- **PR #6** merged 524 commits from dev → main (Mar 24): the single largest merge in the project

---

### Major Problems That Took Forever to Solve

#### Auth infinite loop *(mid-2023 → Jan 2025)*

The most persistent bug in the project. Appeared intermittently, often after 24+ hours. A `localStorage` listener watching for auth changes was triggered by AWS Cognito writing a `aws.cognito.test-ls` key on every page interaction. That fired `handleSignOut`, which caused a re-render loop. Removing the localStorage listener finally killed it.

#### Token expiration crashing the server

`jwt.verify` was being used in a synchronous pattern inside async middleware. Errors weren't propagating to the catch block, so expired tokens caused unhandled crashes. Took multiple refactors across several months before it was fully stable.

#### Profile avatar not updating across the app

Spent multiple sessions trying React Context patterns. The root issue was state not threading correctly through nested providers. Zustand solved it in one session once introduced.

#### Duplicate Stripe customers on re-subscribe

When a user canceled and tried to re-subscribe, a second Stripe Customer was being created. Fixed by calling the Stripe List API to search by billing email before creating a new customer.

#### Concurrent Cloudinary uploads breaking everything

When the upload route was refactored for concurrency, `multer` config changed in a way that broke the `public_id` format. This cascaded into broken delete and edit flows and broke many tests that mocked `multer`.

---

### Major Wins

- **Auth to Zustand**: ended 18 months of re-render and infinite loop pain, and unblocked several other features
- **S3 + CloudFront**: 20MB+ → 5.6KB per gallery load. A single afternoon of work.
- **Real-time messaging** built from scratch (DB schema, backend routes, Socket.IO, frontend) essentially in one session
- **Monorepo migration**: two repos collapsed into one, Heroku build pipeline cleaned up, CI consolidated
- **Full e-commerce layer** (auctions, cart, checkout, purchases, payouts, shipping) built in roughly two weeks
- **Subscription restructure**: `customer_id` → `sub` as the canonical FK; beta/premium gating cleanly separated
- **300+ tests** with a well-organized structure, CI green on every merge to main
- **MVP live** at atthefire.com with free trial, real auctions, and full purchase flow end-to-end

---

## Part 2: Tech Stack Reference

*Alphabetical by package. Click any name to jump to its entry.*

### Services & Packages

#### Services

[AWS Cognito](#aws-cognito) · [Stripe](#stripe)

#### Backend packages

[@aws-sdk/client-cognito-identity-provider](#aws-sdk-cognito-idp) · [@aws-sdk/client-s3](#aws-sdk-s3) · [amazon-cognito-identity-js](#amazon-cognito-identity-js) · [compression](#compression) · [crypto-js](#crypto-js) · [express-rate-limit](#express-rate-limit) · [helmet](#helmet) · [json2csv](#json2csv) · [jsonwebtoken + jwks-rsa](#jsonwebtoken--jwks-rsa) · [multer](#multer) · [node-cron](#node-cron) · [pg](#pg) · [redis](#redis) · [socket.io](#socketio-server) · [stripe](#stripe-sdk) · [validator](#validator)

#### Frontend packages

[@mui/material + @emotion](#mui) · [@mui/x-date-pickers](#mui-x-date-pickers) · [browser-image-compression](#browser-image-compression) · [chart.js + react-chartjs-2](#chartjs) · [date-fns](#date-fns) · [jwt-decode](#jwt-decode) · [lucide-react](#lucide-react) · [react-dropzone](#react-dropzone) · [react-modal](#react-modal) · [react-router-dom](#react-router-dom) · [react-swipeable](#react-swipeable) · [react-toastify](#react-toastify) · [socket.io-client](#socketio-client) · [zustand](#zustand)

---

<a id="aws-cognito"></a>

### AWS Cognito

The authentication provider for the entire app. Users sign up, sign in, reset passwords, and change passwords through Cognito — the app never stores or handles passwords itself. Cognito issues three JWTs (access, id, refresh tokens) which are stored in HTTP-only cookies and sent with every authenticated request. The server verifies the `idToken` and `accessToken` on every protected route via JWKS (RS256). The `sub` from the `idToken` is the user's permanent unique identifier across the entire database.

**Critical rule:** Stripe is used *only* for subscription billing. The platform sells glass pipes, a high-risk product category that Stripe prohibits for transactional payments. All marketplace sales and auction payments use a separate payment processor abstracted behind `server/lib/services/paymentService.js`.

- **Key files (server):** `server/lib/middleware/authenticateAWS.js`, `server/lib/controllers/auth.js`, `server/lib/services/userPool.js`
- **Key files (client):** `client/src/stores/useAuthStore.js`, `client/src/services/userPool.js`, `client/src/services/cookieAPI.js`

---

<a id="stripe"></a>

### Stripe

Handles subscription billing only — monthly and yearly plans, upgrades, downgrades, cancels, renewals, free trials, and the customer portal. The server listens for Stripe webhook events at `/api/v1/webhook` (signature verified) to keep subscription status in sync with the database. A `confirmed` flag in `stripe_customers` tracks whether the full purchase flow completed (guards against half-finished transactions). Webhook events are deduplicated via the `webhook_events` table.

- **Key files (server):** `server/lib/controllers/stripe.js`, `server/lib/controllers/webhooks.js`, `server/lib/middleware/authorizeSubscription.js`
- **Key files (client):** `client/src/stores/useStripeStore.js`, `client/src/components/Subscription/`

---

### Backend (`server/`)

<a id="aws-sdk-cognito-idp"></a>

#### [`@aws-sdk/client-cognito-identity-provider`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/)

Used server-side for admin user deletion — removes a user from the Cognito User Pool by sub. Wired into the `/api/v1/atf-operations` admin routes.

- **Key file:** `server/lib/controllers/atfOperations.js`

<a id="aws-sdk-s3"></a>

#### [`@aws-sdk/client-s3`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/)

Handles all image storage: `PutObjectCommand` for uploads, `DeleteObjectCommand` for deletions. Replaced Cloudinary in Jan 2025. Images are served via CloudFront CDN, not directly from S3.

- **Key files:** `server/lib/controllers/dashboard.js`, `server/lib/controllers/profile.js`

<a id="amazon-cognito-identity-js"></a>

#### [`amazon-cognito-identity-js`](https://www.npmjs.com/package/amazon-cognito-identity-js)

Used server-side for the `/auth/refresh-tokens` route — exchanges a refresh token for new access/id tokens. The client-side package of the same name handles sign-in/sign-up flows.

- **Key file:** `server/lib/controllers/auth.js`

<a id="compression"></a>

#### [`compression`](https://github.com/expressjs/compression)

Gzip middleware applied globally in Express to compress HTTP responses. One-liner addition that meaningfully reduces response sizes.

- **Key file:** `server/lib/app.js`

<a id="crypto-js"></a>

#### [`crypto-js`](https://github.com/brix/crypto-js)

AES-256 encryption/decryption for PII at rest (emails, phone numbers, message content). SHA-256 hashes of emails are also stored so encrypted values can be looked up without decrypting. Note: this library is officially discontinued — native `crypto` is being phased in for new security work.

- **Key file:** `server/lib/services/encryption.js`

<a id="express-rate-limit"></a>

#### [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit)

Rate limiting applied to all API routes to prevent abuse. Configured in the Express app factory.

- **Key file:** `server/lib/app.js`

<a id="helmet"></a>

#### [`helmet`](https://helmetjs.github.io/)

Sets HTTP security headers (CSP, HSTS, X-Frame-Options, etc.). Configured with specific directives to allow S3/CloudFront image sources and Socket.IO. Also adds a CSP nonce to inline scripts.

- **Key file:** `server/lib/app.js`

<a id="json2csv"></a>

#### [`json2csv`](https://github.com/juanjodiaz/json2csv)

Converts JSON query results to CSV format for the inventory download feature. Used in one route that lets subscribers export their production data. Note: the original `zemirco/json2csv` repo is abandoned — the active fork under `juanjodiaz` split into scoped packages (`@json2csv/node`, etc.) starting at v6.

- **Key file:** `server/lib/controllers/dashboard.js` (route: `GET /dashboard/download-inventory-csv`)

<a id="jsonwebtoken--jwks-rsa"></a>

#### [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken) + [`jwks-rsa`](https://github.com/auth0/node-jwks-rsa)

Used together in `authenticateAWS` middleware to verify Cognito-issued JWTs. `jwks-rsa` fetches and caches the Cognito public keys (JWKS); `jsonwebtoken` verifies the RS256 signature.

- **Key file:** `server/lib/middleware/authenticateAWS.js`

<a id="multer"></a>

#### [`multer`](https://github.com/expressjs/multer)

Handles `multipart/form-data` for image uploads. Configured with memory storage (not disk) so the file buffer can be piped directly to S3. Previously used for Cloudinary; now routes the buffer to `@aws-sdk/client-s3`.

- **Key files:** `server/lib/controllers/dashboard.js`, `server/lib/controllers/profile.js`

<a id="node-cron"></a>

#### [`node-cron`](https://github.com/node-cron/node-cron)

Runs scheduled jobs — specifically the daily 5 PM PT sweep for auctions that missed their timer-based expiration. The cron job calls the same idempotent `completeAuction()` function used by the per-auction `setTimeout`.

- **Key file:** `server/lib/jobs/auctionTimers.js`

<a id="pg"></a>

#### [`pg`](https://node-postgres.com/)

The PostgreSQL client. All database queries are raw parameterized SQL — no ORM, no migration framework. A single `Pool` instance is shared across the app.

- **Key file:** `server/lib/utils/pool.js`

<a id="redis"></a>

#### [`redis`](https://github.com/redis/node-redis)

Caches gallery posts and profile data to reduce DB load. Has a noop fallback mode (`REDIS_ENABLED=false`) so local dev works without a Redis instance. Has a retry limit to prevent infinite reconnect loops on service failure.

- **Key file:** `server/redisClient.js`

<a id="socketio-server"></a>

#### [`socket.io`](https://socket.io/)

Powers real-time features: live messaging delivery, unread count updates, and all auction events (`bid-placed`, `user-outbid`, `auction-extended`, `auction-ended`, `user-won`, etc.). The `io` instance is attached to the Express app via `app.set('io', io)` so controllers can emit events with `req.app.get('io')`.

- **Key file:** `server/server.js`

<a id="stripe-sdk"></a>

#### [`stripe`](https://github.com/stripe/stripe-node)

The official Stripe Node.js SDK. Used *only* for subscription billing — creating checkout sessions, accessing the customer portal, fetching subscription/invoice data, and verifying webhook signatures. Never used for product sales or auctions (see the Stripe section above).

- **Key files:** `server/lib/controllers/stripe.js`, `server/lib/controllers/webhooks.js`

<a id="validator"></a>

#### [`validator`](https://github.com/validatorjs/validator.js)

String validation utilities used inside validation middleware (email format, URL format, string length, etc.).

- **Key files:** `server/lib/middleware/validateOrder.js`, `validatePost.js`, `validateProfile.js`, `validateUserUpdate.js`

---

### Frontend (`client/`)

<a id="mui"></a>

#### [`@mui/material`](https://mui.com/) + `@emotion/react` + `@emotion/styled`

Material UI v5 is the primary UI component library. Dark/light theme is defined in `App.js` with brand green `#1f8e3d`. `@emotion` is MUI's CSS-in-JS engine.

- **Key file:** `client/src/App.js`

<a id="mui-x-date-pickers"></a>

#### [`@mui/x-date-pickers`](https://mui.com/x/react-date-pickers/)

MUI's date picker components. Used in the production quota tracking form and inventory management form where users enter production dates.

- **Key files:** `client/src/components/DashboardTabs/QuotaTrackingForm.js`, `InventoryMgtForm.js`

<a id="browser-image-compression"></a>

#### [`browser-image-compression`](https://github.com/Donaldcwl/browser-image-compression)

Compresses images client-side before uploading to S3. Applied to gallery post images, product images, profile avatars, and logos. Reduces upload size and S3 storage costs.

- **Key files:** `client/src/components/DashboardTabs/PostForm.js`, `InventoryMgtForm.js`, `Profile.js`

<a id="chartjs"></a>

#### [`chart.js`](https://www.chartjs.org/) + [`react-chartjs-2`](https://react-chartjs-2.js.org/) + [`chartjs-plugin-annotation`](https://www.chartjs.org/chartjs-plugin-annotation/)

Line, bar, and pie charts on the Analysis and Inventory Tracking tabs. The annotation plugin draws goal-line overlays on the graphs.

- **Key file:** `client/src/components/DashboardTabs/Analysis.js`

<a id="date-fns"></a>

#### [`date-fns`](https://date-fns.org/)

Date formatting and arithmetic throughout the app — calendar display, "shelf time" calculations, formatting timestamps. The MUI date pickers also depend on it.

- Used throughout dashboard tab components

<a id="jwt-decode"></a>

#### [`jwt-decode`](https://github.com/auth0/jwt-decode)

Decodes the Cognito JWT payload client-side (no verification — that happens on the server). Used in `useAuthStore` to extract the `sub` and other claims from the `idToken` after sign-in.

- **Key file:** `client/src/stores/useAuthStore.js`

<a id="lucide-react"></a>

#### [`lucide-react`](https://lucide.dev/)

Icon library used as an alternative/supplement to MUI icons in newer components.

- Used in various components throughout `client/src/`

<a id="react-dropzone"></a>

#### [`react-dropzone`](https://react-dropzone.js.org/)

Drag-and-drop file input component. Was used in the post and product upload forms, then removed from PostForm/InventoryMgtForm after causing state issues. May still appear in some components.

- **Key file:** `client/src/components/DashboardTabs/` (check individual tab components)

<a id="react-modal"></a>

#### [`react-modal`](https://github.com/reactjs/react-modal)

Accessible modal overlay component. Used for the image lightbox/modal in gallery detail and some dashboard modals.

- Used in detail/gallery components

<a id="react-router-dom"></a>

#### [`react-router-dom`](https://reactrouter.com/) *(v6)*

Client-side routing. All routes are defined in `App.js`. Uses the v6 API (`<Routes>`, `<Route>`, `useNavigate`, `useParams`, `useLocation`).

- **Key file:** `client/src/App.js`

<a id="react-swipeable"></a>

#### [`react-swipeable`](https://github.com/FormidableLabs/react-swipeable)

Touch swipe gesture detection for the image carousel on the gallery post detail page.

- **Key file:** `client/src/components/GalleryPostDetail/GalleryPostDetail.js`

<a id="react-toastify"></a>

#### [`react-toastify`](https://fkhadra.github.io/react-toastify/)

App-wide toast notification system. Replaced the old custom `<Toast/>` component. Configured with `colored` theme. Used in every hook/fetch file for success, error, and info messages.

- **Key file:** `client/src/App.js` (provider), everywhere else for calls

<a id="socketio-client"></a>

#### [`socket.io-client`](https://socket.io/docs/v4/client-api/)

Client-side Socket.IO — connects to the server's WebSocket for real-time messaging and auction events. Auth token is passed in the connection handshake.

- **Key file:** `client/src/hooks/useMessagingSocket.js`

<a id="zustand"></a>

#### [`zustand`](https://github.com/pmndrs/zustand)

Lightweight global state management. Replaced React Context for auth, stripe, posts, snapshots, quota, followers, likes, and notifications. This was the biggest FE architectural change after the project started — solved the re-render and infinite loop issues that plagued auth for over a year.

- **Key files:** `client/src/stores/useAuthStore.js`, `usePostStore.js`, `useQuotaStore.js`, `useSnapshotStore.js`, `useNotificationStore.js`, `useFollowerStore.js`, `useLikeStore.js`, `useStripeStore.js`
