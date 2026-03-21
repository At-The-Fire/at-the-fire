# End-to-End Testing Checklist

## New User Creation

> **Claude Code: SKIP this entire section.** New user creation requires access to a real email inbox (AWS Cognito sends a confirmation email). This section must be tested manually.

- [ ] Sign up with AWS
  - [ ] Verify required fields validation
  - [ ] Handle invalid input cases
- [ ] Receive confirmation email
  - [ ] Verify email arrives
  - [ ] Test confirmation link works
- [ ] Sign in
  - [ ] Test successful login
  - [ ] Test incorrect password handling

## Profile CRUD

- [x] Upload avatar
  - [x] Test supported file types
  - [x] Test file size limits
- [x] Replace avatar
- [x] Fill in all text fields
  - [x] Test required vs optional fields
- [x] Edit all text fields
  - [x] Verify changes persist

## Subscription Purchase

> **Claude Code: SKIP the initial purchase and the "Return to dashboard" block.** Purchasing a new subscription requires a real Stripe account and cannot be automated. Test users (`USER1`, `USER2`) already have active subscriptions. Start this section from "Return to dashboard signed in" onwards.

- [ ] Purchase subscription
  - [ ] Verify payment flow
  - [ ] Test error handling
- [ ] Return to dashboard signed in
  - [ ] Verify subscription status shows correctly
  - [ ] Verify _Profile_ updates with logo/ website/ social media accts
  - [ ] Upload logo image
  - [ ] Fill in some/ all text fields
- [ ] Change subscription — SKIP (User 1 has no active Stripe subscription)
  - [ ] Upgrade
  - [ ] Downgrade
- [ ] Cancel Subscription — SKIP (User 1 has no active Stripe subscription)
  - [ ] Verify subscription status shows correctly
  - [ ] Verify CRUD operations are suspended/ disabled

## Dashboard CRUD

### Dashboard

- [x] Create new post
  - [x] Test required fields
  - [x] Enter a valid quantity
    - [x] Verify quantity accepts only positive integers
    - [x] Verify quantity field rejects 0, negative numbers, and non-numeric input
  - [x] Enter a shipping cost — verify it saves and displays correctly at checkout
  - [x] Verify post displays in _Dashboard_ tab
  - [x] Verify post displays in _Quota Tracking_ tab with matching quantity
  - [x] Verify post displays in _Gallery_
  - [x] Verify post has all text & images displaying correctly
- [x] Edit post
  - [x] Edit text fields
  - [x] Edit quantity
    - [x] Verify updated quantity saves correctly
    - [x] Verify updated quantity syncs to corresponding product in _Quota Tracking_
  - [x] Add image
    - [x] Test supported formats
  - [x] Remove image(s)
  - [x] Replace image(s)
  - [x] Verify all changes display in _Products_
- [x] Delete post
  - [x] Verify post removal
  - [x] Test any "undo" functionality if present
  - [x] Verify the product is deleted in _Products_

### Inventory

- [x] Create new snapshot
  - [x] Save empty snapshot
  - [x] Create post
  - [x] Create new snapshot
  - [x] Verify graph updates & data accuracy
  - [x] Test save/update functionality

### Orders

- [x] Create new order
  - [x] Verify required fields
- [x] Edit order
  - [x] Add item(s)
  - [x] Change item(s)
  - [x] Remove item(s)
  - [x] Verify calculations update correctly
- [x] Delete order
- [x] Print order — SKIP (not testable via Playwright)

### Quota Tracking

- [x] Create new product — test each type individually:
  - [x] **Auction** type — create, verify it appears in product list
  - [x] **Direct Sale** type — create, verify it appears in product list
  - [x] **Inventory** type — create, verify it appears in product list
  - [x] **Prep-Other** type — create, verify it appears in product list
  - [x] Test required fields (submit empty form, verify validation)
    > **Note:** The wizard tabs are for organizational display — users can navigate freely between tabs. Validation fires via MUI field indicators and a toast when the Add button is clicked with missing required fields. The Add button correctly gates submission. This is expected behavior; do not mark as a fail.
- [x] Edit product
  - [x] Change text fields
  - [ ] Change image
  - [x] Verify updates save correctly
- [x] Delete product
  - [x] Verify removal
- [x] Create new product with "Create new gallery post" checked
  - [x] Verify product displays in _Dashboard_ and _Gallery_
    > **Note:** The "Create new gallery post" checkbox is **only available during initial product creation**. Once a product exists, the checkbox will not appear when editing or after returning from an edit flow — this is intentional by design (gallery post + product are created together or not at all). Click the "New" button to start a fresh product form and the checkbox will be present on the Images step.

### Calendar

- [x] Set goals
  - [x] Verify save functionality
  - [x] Verify daily calculations/ correct images/ data
- [x] Edit goals
  - [x] Test updates persist

### Analysis

- [x] Set goals
  - [x] Verify data entry
- [x] Edit goals
  - [x] Test changes save correctly

## Auctions

- [x] Create auction
  - [x] Test required fields (title, starting bid, end date)
  - [x] Upload auction images
  - [x] Enter a shipping cost — verify it appears at BIN/auction-payment step
  - [x] Verify auction appears in public auction listing
- [x] Bid on auction
  - [x] Place a valid bid above minimum
  - [x] Verify bid rejected if below minimum increment
  - [x] Test 5-minute extension rule (bid placed near end time extends auction)
  - [x] Verify highest bid updates correctly
- [x] Buy It Now
  - [x] Purchase at buy-it-now price
  - [x] Verify auction closes immediately
  - [x] Verify purchase appears in buyer's purchases
  - [x] Verify a congratulations message appears in the messaging system from the seller
  - [x] Buyer receives "You won!" success toast in real-time (on-site, no page refresh needed)
  - [x] _Messages_ badge increments immediately in the avatar menu — does not require navigating away and back
  - [x] Avatar badge reflects updated combined total (messages + won + outbid)
- [x] Outbid notification (buyer)
  - [x] Warning toast appears if on-site when outbid
  - [x] _Purchases_ menu shows orange "N outbid" count on next login if offline when outbid
  - [x] Badge clears on navigating to _My Purchases_
- [x] Auction end — winner (buyer)
  - [x] Success toast appears if on-site when auction closes (applies to both BIN and natural expiry)
  - [x] _Purchases_ menu shows green "N won" shimmer/count on next login
  - [x] Avatar badge shows combined total (messages + won + outbid)
  - [x] Badge clears on navigating to _My Purchases_
  - [x] Verify a congratulations message appears in the messaging system from the seller
- [x] Auction end — seller (BIN notification breadcrumb trail)
  - > **Claude Code note:** All five indicators below are driven by the same `pendingShipmentsCount` store value. Test them together in a single BIN flow: trigger BIN as USER2, then immediately inspect all five as USER1 without navigating away. They should all light up simultaneously. Then enter a tracking number and verify they all clear.
  - [x] "Your auction sold!" success toast appears in real-time (on-site) — toast text directs seller to "Dashboard → Sales to enter tracking"
  - [x] _Workspace_ dropdown menu item shows shimmer effect and "(N)" count (e.g. "Workspace (1)") — same treatment as the Messages item
  - [x] _Workspace_ button in the navbar shows an orange numeric badge
  - [x] _Dashboard_ tab in the Workspace area shows an orange numeric badge on the tab label
  - [x] _Sales_ toggle button inside the Dashboard tab shows an orange numeric badge
  - [x] All five indicators are present immediately on login/refresh — not only reactive to the current session's BIN event
  - [x] Entering a tracking number in the Sales tab decrements all counts in real-time; all indicators disappear when all sales are tracked
  - [x] Closed auction rows without tracking show an orange border in Dashboard > Sales tab
  - [x] Gallery sale rows without tracking show an orange border in Dashboard > Sales tab
- [x] Real-time list observation (two-user)
  - [x] User 2 is already on `/auctions` when User 1 creates a new auction — verify the new auction card appears on User 2's page without refreshing
  - [x] User 2 is on `/auctions` when User 1 BINs an auction — verify the card flips to "closed" on User 2's list without refreshing
  - [x] Countdown timer ticks — open an active auction card, read the countdown display, wait 2 seconds, verify the displayed time has changed
- [x] Archive auction — **automatic, not a user action**
  - > **Claude Code note:** Archiving is automatic — closed auctions move to an archive page on a timed cycle (approximately 48 hours after closing), not instantly, so sellers can still see the auction close in real time. There is no archive button. To test: verify a closed auction still appears on the live auctions page immediately after closing.
  - [x] Closed auction remains visible on live auction page immediately after closing (not instant-removed)
  - [ ] Closed auction eventually appears on the archive page
  - [ ] Closed auction no longer appears in active listings after archive cycle runs

## Buy Now & Checkout

> **Claude Code note:** The checkout uses a placeholder payment processor — no real payment provider is integrated yet. Any card details entered will result in a successful transaction. Do not use Stripe test card numbers; they have no meaning here. The "Failed checkout" block cannot be tested until a real payment processor is integrated.
>
> The cart/add-to-cart model has been replaced with a Buy Now flow. Clicking "Buy Now" on a gallery card navigates to the post detail page (intentional — the detail page exposes the quantity selector, which matters when quantity > 1). From the detail page, clicking "Buy Now" navigates straight to checkout. There is no cart or cart drawer.

- [x] Buy Now from gallery card
  - [x] Verify "Buy Now" button is visible on purchasable items (not sold, price > 0, quantity > 0)
  - [x] Verify "Buy Now" is not shown on sold items
  - [x] Click "Buy Now" — verify it navigates to the post detail page (this is intentional — the detail page has a quantity selector so buyers can choose how many to purchase when quantity > 1)
- [x] Buy Now from post detail
  - [x] Select quantity from dropdown
  - [x] Click "Buy Now" — verify checkout shows correct item and selected quantity
- [x] Checkout
  - [x] Verify order summary shows correct item, quantity, and total
  - [x] Verify shipping cost appears as a line item in order summary (when > $0)
  - [x] Verify total = item price × quantity + shipping
  - [x] Complete checkout (placeholder processor — any card details will succeed)
  - [x] Verify redirect to /my-purchases with new purchase visible
  - [x] Verify inventory decremented after purchase
  - [x] Verify purchase record created
- [x] Navigate to /checkout directly (no item state)
  - [x] Verify "Nothing to purchase" message is shown with Browse Gallery button
- [x] Failed checkout
  - [x] **Claude Code: SKIP — placeholder processor always succeeds; no failure path exists until a real payment processor is integrated**
  - [ ] Verify inventory is not decremented on failure
  - [ ] Verify error message displayed

## My Purchases

- [x] View purchase history
  - [x] Verify all completed purchases appear
  - [x] Verify purchase details (item, price, date) are correct
- [x] Auction purchases
  - [x] Verify won auction appears in purchases
  - [x] Verify buy-it-now purchase appears in purchases
- [x] Won/outbid badge clears on visit
  - [x] _Purchases_ shimmer/count is visible before navigating here
  - [x] Badge disappears on arrival (mark-as-read fires on mount)
  - [x] Log out and back in — badge does not reappear
