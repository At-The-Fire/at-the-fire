# Google Sheets Export — At The Fire

## Context

The platform generates rich operational data (gallery posts, products, sales, auctions, orders) but users currently have no way to analyze it outside the app. The only existing export is a gallery inventory CSV (`GET /api/v1/gallery-posts/download-inventory-csv` using `json2csv`). A "Studio Dashboard" Google Sheets export would:
- Act as a premium subscription feature with tangible, external value
- Give artists a visual, chart-ready studio report in their own Google Drive
- Bridge the gap between production tracking and accounting/analytics

---

## What Gets Exported

A single spreadsheet with 5 tabs, combining data from existing routes:

| Tab | Data Source | Key Columns |
|-----|-------------|-------------|
| **Overview** | Aggregated from all | Total produced, sold, revenue, avg price, inventory value |
| **Sales** | `gallery_posts` (sold=true) + `auction_results` | Date, Item, Type (gallery/auction/order), Price, Fee, Net |
| **Inventory** | `gallery_posts` (sold=false) + `quota_tracking` | Title, Category, Price, Date Created, Status |
| **Production** | `quota_tracking` + `product_sales` | Piece, Date, Production Time, Category, Sale Price |
| **Monthly Summary** | Aggregated by month | Month, Pieces Produced, Pieces Sold, Revenue, Avg Price |

---

## Architecture

### Auth Flow

```
User clicks "Export to Google Sheets"
  → Frontend redirects to Google OAuth consent (scopes: spreadsheets + drive.file)
  → Google redirects back with auth code
  → Server exchanges code for access token (server-side OAuth)
  → Server creates spreadsheet in user's Drive
  → Returns spreadsheet URL to client
  → Client opens URL in new tab
```

### Tech Stack Additions

**Server:**
- `npm install googleapis` — official Google APIs Node.js client
- New controller: `server/lib/controllers/sheetsExport.js`
- New route: `GET /api/v1/export/sheets` (auth required)
- New OAuth callback route: `GET /api/v1/export/sheets/callback`

**Client:**
- New button in `DashboardTabs` header (premium-gated via `hasPremiumAccess`)
- No new npm packages needed (plain window redirect for OAuth)

### Google Cloud Setup (one-time, manual)

1. Create project in Google Cloud Console
2. Enable Google Sheets API + Google Drive API
3. Create OAuth 2.0 credentials (Web Application type)
4. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` to `.env`

---

## Implementation Plan

### Phase 1 — Server (new file + route)

**`server/lib/controllers/sheetsExport.js`**

```js
// 1. initiateOAuth(req, res)
//    → builds Google OAuth URL with scopes, redirects user

// 2. handleCallback(req, res)
//    → exchanges code for tokens
//    → calls createStudioDashboard(tokens, userSub)
//    → redirects client to returned spreadsheet URL

// 3. createStudioDashboard(auth, userSub)
//    → queries all data in parallel (posts, products, sales, auctions)
//    → creates spreadsheet via sheets.spreadsheets.create
//    → writes data via sheets.spreadsheets.values.batchUpdate
//    → applies formatting via sheets.spreadsheets.batchUpdate (bold headers, freeze row 1, number formats)
//    → returns spreadsheetUrl
```

**Data queries (reuse existing models):**
- `Post.getByUserSub(sub)` — gallery posts
- `QuotaProduct.getByUserSub(sub)` — products
- `Sales.getSalesByUserSub(sub)` — product sales
- `Orders.getBySellerSub(sub)` — orders

**Routes to add in `server/lib/routes/`:**
```
GET /api/v1/export/sheets           → initiateOAuth (auth middleware)
GET /api/v1/export/sheets/callback  → handleCallback (no auth, Google redirects here)
```

### Phase 2 — Client (button only)

In `DashboardTabs.js` header area, add:

```jsx
{hasPremiumAccess && (
  <Button onClick={() => window.location.href = '/api/v1/export/sheets'}>
    Export to Google Sheets
  </Button>
)}
```

No new state or store changes needed.

### Phase 3 — Formatting (nice-to-have, can skip for MVP)

After data is written, a `batchUpdate` request adds:
- Bold + background color on row 1 of each sheet
- Freeze row 1
- Column width auto-resize
- 1-2 line charts on Monthly Summary tab (Revenue by Month, Pieces Produced by Month)

Charts are verbose but straightforward `AddChartRequest` objects.

---

## MVP Scope (recommended starting point)

Skip charts and formatting for the true MVP. Ship:
1. OAuth flow works end-to-end
2. Spreadsheet created in user's Drive with 5 tabs
3. Data written correctly with headers
4. Premium-gated button in Dashboard

Add formatting + charts in a follow-up once the flow is proven.

---

## Also Easy: CSV per Dashboard Tab

The existing `download-inventory-csv` pattern is already proven. Adding CSV downloads to other tabs is ~30 min each:
- Analysis tab (has `// TODO Add csv download button` at `Analysis.js:37`)
- Products tab
- Orders tab

These are independent of Google Sheets and could ship first.

---

## Effort Estimate

| Work | Effort |
|------|--------|
| Google Cloud project setup | 30 min (one-time) |
| Server OAuth + spreadsheet creation (MVP, no formatting) | 4–6 hrs |
| Client button | 30 min |
| Formatting + charts | 2–4 hrs additional |
| CSV exports for remaining tabs | 1–2 hrs |

---

## Critical Files

- `server/lib/controllers/galleryPosts.js` — existing CSV export pattern to reuse
- `server/lib/models/Post.js` — gallery post queries
- `server/lib/models/QuotaProduct.js` — product queries
- `server/lib/models/Sales.js` — product sales queries
- `server/lib/models/Orders.js` — orders queries
- `client/src/components/DashboardTabs/DashboardTabs.js` — button placement
- `client/src/stores/useAuthStore.js` — `hasPremiumAccess` for gating
- `server/lib/routes/` — where new export route gets registered

---

## Verification

1. Click "Export to Google Sheets" button → redirects to Google consent screen
2. Approve scopes → redirects back, spreadsheet URL opens in new tab
3. Spreadsheet in Google Drive has correct tabs and data rows
4. Free users do not see the button
5. Test with no data (empty artist account) — spreadsheet still creates with headers only
