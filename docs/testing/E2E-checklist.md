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

- [ ] Upload avatar
  - [ ] Test supported file types
  - [ ] Test file size limits
- [ ] Replace avatar
- [ ] Fill in all text fields
  - [ ] Test required vs optional fields
- [ ] Edit all text fields
  - [ ] Verify changes persist

## Subscription Purchase

> **Claude Code: SKIP the initial purchase, the "Return to dashboard" block, and Change/Cancel subscription items.** Purchasing a new subscription requires a real Stripe account and cannot be automated. Test users (`USER1`, `USER2`) already have customer IDs and the app launches in `BETA_MODE=true`, which bypasses all subscription checks — logo upload and profile branding fields are accessible without a Stripe purchase. Test the logo upload block below independently.

- [ ] Purchase subscription
  - [ ] Verify payment flow
  - [ ] Test error handling
- [ ] Return to dashboard signed in
  - [ ] Verify subscription status shows correctly
  - [ ] Verify _Profile_ updates with logo/ website/ social media accts
  - [ ] Upload logo image
  - [ ] Fill in some/ all text fields
- [ ] Logo upload and profile branding (testable in beta mode — sign in as USER1)
  - [ ] Navigate to _Profile_ via the avatar menu
  - [ ] Upload a logo image — verify it appears in the profile header
  - [ ] Verify the logo appears on USER1's gallery posts (navigate to a gallery post by USER1 and confirm logo is displayed)
  - [ ] Verify the logo appears on USER1's auction listings (navigate to an active auction by USER1 and confirm logo is displayed)
- [ ] Change subscription — SKIP (User 1 has no active Stripe subscription)
  - [ ] Upgrade
  - [ ] Downgrade
- [ ] Cancel Subscription — SKIP (User 1 has no active Stripe subscription)
  - [ ] Verify subscription status shows correctly
  - [ ] Verify CRUD operations are suspended/ disabled

## Dashboard CRUD

### Dashboard

- [ ] Create new post
  - [ ] Test required fields
  - [ ] Enter a valid quantity
    - [ ] Verify quantity accepts only positive integers
    - [ ] Verify quantity field rejects 0, negative numbers, and non-numeric input
  - [ ] Enter a shipping cost — verify it saves and displays correctly at checkout
  - [ ] Verify post displays in _Dashboard_ tab
  - [ ] Verify post displays in _Quota Tracking_ tab with matching quantity
  - [ ] Verify post displays in _Gallery_
  - [ ] Verify post has all text & images displaying correctly
- [ ] Edit post
  - [ ] Edit text fields
  - [ ] Edit quantity
    - [ ] Verify updated quantity saves correctly
    - [ ] Verify updated quantity syncs to corresponding product in _Quota Tracking_
  - [ ] Add image
    - [ ] Test supported formats
  - [ ] Remove image(s)
  - [ ] Replace image(s)
  - [ ] Verify all changes display in _Products_
- [ ] Delete post
  - [ ] Verify post removal
  - [ ] Test any "undo" functionality if present
  - [ ] Verify the product is deleted in _Products_

### Inventory

- [ ] Create new snapshot
  - [ ] Save empty snapshot
  - [ ] Create post
  - [ ] Create new snapshot
  - [ ] Verify graph updates & data accuracy
  - [ ] Test save/update functionality

### Orders

- [ ] Create new order
  - [ ] Verify required fields
- [ ] Edit order
  - [ ] Add item(s)
  - [ ] Change item(s)
  - [ ] Remove item(s)
  - [ ] Verify calculations update correctly
- [ ] Delete order
- [ ] Print order — SKIP (not testable via Playwright)

### Quota Tracking

- [ ] Create new product — test each type individually:
  - [ ] **Auction** type — create, verify it appears in product list
  - [ ] **Direct Sale** type — create, verify it appears in product list
  - [ ] **Inventory** type — create, verify it appears in product list
  - [ ] **Prep-Other** type — create, verify it appears in product list
  - [ ] Test required fields (submit empty form, verify validation)
    > **Note:** The wizard tabs are for organizational display — users can navigate freely between tabs. Validation fires via MUI field indicators and a toast when the Add button is clicked with missing required fields. The Add button correctly gates submission. This is expected behavior; do not mark as a fail.
- [ ] Edit product
  - [ ] Change text fields
  - [ ] Change image
  - [ ] Verify updates save correctly
- [ ] Delete product
  - [ ] Verify removal
- [ ] Create new product with "Create new gallery post" checked
  - [ ] Verify product displays in _Dashboard_ and _Gallery_
    > **Note:** The "Create new gallery post" checkbox is **only available during initial product creation**. Once a product exists, the checkbox will not appear when editing or after returning from an edit flow — this is intentional by design (gallery post + product are created together or not at all). Click the "New" button to start a fresh product form and the checkbox will be present on the Images step.

### Calendar

- [ ] Set goals
  - [ ] Verify save functionality
  - [ ] Verify daily calculations/ correct images/ data
- [ ] Edit goals
  - [ ] Test updates persist

### Analysis

- [ ] Set goals
  - [ ] Verify data entry
- [ ] Edit goals
  - [ ] Test changes save correctly

## Auctions

- [ ] Create auction
  - [ ] Test required fields (title, starting bid, end date)
  - [ ] Upload auction images
  - [ ] Enter a shipping cost — verify it appears at BIN/auction-payment step
  - [ ] Verify auction appears in public auction listing
- [ ] Bid on auction
  - [ ] Place a valid bid above minimum
  - [ ] Verify bid rejected if below minimum increment
  - [ ] Test 5-minute extension rule (bid placed near end time extends auction)
  - [ ] Verify highest bid updates correctly
- [ ] Buy It Now
  - [ ] Purchase at buy-it-now price
  - [ ] Verify auction closes immediately
  - [ ] Verify a congratulations message appears in the messaging system from the seller
  - [ ] Buyer receives "You won!" success toast in real-time (on-site, no page refresh needed)
  - [ ] _Messages_ badge increments immediately in the avatar menu — does not require navigating away and back
  - [ ] Avatar badge reflects updated combined total (messages + won + outbid)
  - [ ] "Pay Now" button is visible on the won auction card (red button, not just a "Payment Needed" label)
  - [ ] Click "Pay Now" — verify it navigates to the checkout page with correct item title and final bid amount
  - [ ] Shipping address form is present and required fields are enforced (same as gallery checkout)
  - [ ] Complete checkout with valid address — verify redirect to /my-purchases
  - [ ] Won auction card in /my-purchases shows "Paid" status after payment
  - [ ] Seller (USER1) navigates to Dashboard → Sales tab — verify winner's shipping address is visible on the closed auction row
- [ ] Outbid notification (buyer)
  - [ ] Warning toast appears if on-site when outbid
  - [ ] _Purchases_ menu shows orange "N outbid" count on next login if offline when outbid
  - [ ] Badge clears on navigating to _My Purchases_
- [ ] Auction end — winner (buyer)
  - [ ] Success toast appears if on-site when auction closes (applies to both BIN and natural expiry)
  - [ ] _Purchases_ menu shows green "N won" shimmer/count on next login
  - [ ] Avatar badge shows combined total (messages + won + outbid)
  - [ ] Badge clears on navigating to _My Purchases_
  - [ ] Verify a congratulations message appears in the messaging system from the seller
  - [ ] "Pay Now" button is visible on the won auction card — navigate to checkout, complete payment with address
  - [ ] After payment, won auction card shows "Paid" status
- [ ] Auction end — seller (BIN notification breadcrumb trail)
  - > **Claude Code note:** All five indicators below are driven by the same `pendingShipmentsCount` store value. Test them together in a single BIN flow: trigger BIN as USER2, then immediately inspect all five as USER1 without navigating away. They should all light up simultaneously. Then enter a tracking number and verify they all clear.
  - [ ] "Your auction sold!" success toast appears in real-time (on-site) — toast text directs seller to "Dashboard → Sales to enter tracking"
  - [ ] _Workspace_ dropdown menu item shows shimmer effect and "(N)" count (e.g. "Workspace (1)") — same treatment as the Messages item
  - [ ] _Workspace_ button in the navbar shows an orange numeric badge
  - [ ] _Dashboard_ tab in the Workspace area shows an orange numeric badge on the tab label
  - [ ] _Sales_ toggle button inside the Dashboard tab shows an orange numeric badge
  - [ ] All five indicators are present immediately on login/refresh — not only reactive to the current session's BIN event
  - [ ] Entering a tracking number in the Sales tab decrements all counts in real-time; all indicators disappear when all sales are tracked
  - [ ] Closed auction rows without tracking show an orange border in Dashboard > Sales tab
  - [ ] Gallery sale rows without tracking show an orange border in Dashboard > Sales tab
- [ ] Real-time list observation (two-user)
  - [ ] User 2 is already on `/auctions` when User 1 creates a new auction — verify the new auction card appears on User 2's page without refreshing
  - [ ] User 2 is on `/auctions` when User 1 BINs an auction — verify the card flips to "closed" on User 2's list without refreshing
  - [ ] Countdown timer ticks — open an active auction card, read the countdown display, wait 2 seconds, verify the displayed time has changed
- [ ] Archive auction — **automatic, not a user action**
  - > **Claude Code note:** Archiving is automatic — closed auctions move to an archive page on a timed cycle (approximately 48 hours after closing), not instantly, so sellers can still see the auction close in real time. There is no archive button. To test: verify a closed auction still appears on the live auctions page immediately after closing.
  - [ ] Closed auction remains visible on live auction page immediately after closing (not instant-removed)
  - [ ] Closed auction eventually appears on the archive page
  - [ ] Closed auction no longer appears in active listings after archive cycle runs

## Buy Now & Checkout

> **Claude Code note:** The checkout uses a placeholder payment processor — no real payment provider is integrated yet. Any card details entered will result in a successful transaction. Do not use Stripe test card numbers; they have no meaning here. The "Failed checkout" block cannot be tested until a real payment processor is integrated.
>
> The cart/add-to-cart model has been replaced with a Buy Now flow. Clicking "Buy Now" on a gallery card navigates to the post detail page (intentional — the detail page exposes the quantity selector, which matters when quantity > 1). From the detail page, clicking "Buy Now" navigates straight to checkout. There is no cart or cart drawer.

- [ ] Buy Now from gallery card
  - [ ] Verify "Buy Now" button is visible on purchasable items (not sold, price > 0, quantity > 0)
  - [ ] Verify "Buy Now" is not shown on sold items
  - [ ] Click "Buy Now" — verify it navigates to the post detail page (this is intentional — the detail page has a quantity selector so buyers can choose how many to purchase when quantity > 1)
- [ ] Buy Now from post detail
  - [ ] Select quantity from dropdown
  - [ ] Click "Buy Now" — verify checkout shows correct item and selected quantity
- [ ] Checkout
  - [ ] Verify order summary shows correct item, quantity, and total
  - [ ] Verify shipping cost appears as a line item in order summary (when > $0)
  - [ ] Verify total = item price × quantity + shipping
  - [ ] Shipping address form is visible below the order summary
    - [ ] Full Name, Address Line 1, City, State, ZIP fields are present and required
    - [ ] Address Line 2 and Country fields are present and optional
    - [ ] Place Order button is disabled while any required address field is empty
    - [ ] Helper text "Complete your shipping address above to place your order" is visible while disabled
  - [ ] Attempt to submit with a required address field empty
    - [ ] `toast.warn` appears identifying the missing field (e.g. "Full name is required", "City is required")
    - [ ] Order is NOT placed — user remains on checkout page
  - [ ] Fill in all required address fields — verify Place Order button becomes enabled
  - [ ] Complete checkout with valid address (placeholder processor — any card details will succeed)
  - [ ] Verify redirect to /my-purchases with new purchase visible
  - [ ] Verify inventory decremented after purchase
  - [ ] Verify purchase record created
- [ ] Seller sees buyer's shipping address **[two-user: USER2 buys from USER1]**
  - [ ] Sign in as USER2, complete a Buy Now purchase using a recognizable address (e.g. "123 Test St, Portland, OR 97201")
  - [ ] Sign in as USER1, navigate to Dashboard → Sales tab
  - [ ] Locate the sale row for the item USER2 just purchased
  - [ ] Verify the buyer's address is displayed on the row: full name, street, city, state, ZIP
  - [ ] Verify the address shown matches what USER2 entered at checkout (correct name, correct city/state/ZIP)
- [ ] Navigate to /checkout directly (no item state)
  - [ ] Verify "Nothing to purchase" message is shown with Browse Gallery button
- [ ] Failed checkout
  - [ ] **Claude Code: SKIP — placeholder processor always succeeds; no failure path exists until a real payment processor is integrated**
  - [ ] Verify inventory is not decremented on failure
  - [ ] Verify error message displayed

## Seller Earnings Tab

> **Claude Code note:** Test as a seller (USER1) who has at least one completed purchase against their listings. The Earnings tab is a new 4th toggle in the Dashboard tab group alongside Posts, Auctions, and Sales.

- [ ] Seller navigates to Dashboard and clicks the **Earnings** toggle button
  - [ ] Earnings view loads without error
  - [ ] "Pending Payout" card is visible
  - [ ] "Total Paid Out" card is visible
  - [ ] Payout history section is visible

- [ ] Seller has no sales — verify empty state
  - [ ] "Pending Payout" shows $0.00
  - [ ] "Total Paid Out" shows $0.00
  - [ ] Payout history shows "No payouts recorded yet"

- [ ] After a gallery post purchase is made against the seller's listing **[two-user: USER2 buys from USER1]**
  - [ ] Seller clicks Earnings tab
  - [ ] "Pending Payout" shows a non-zero dollar amount
  - [ ] "Total Paid Out" still shows $0.00

- [ ] After an auction payment is completed against the seller's auction **[two-user: USER2 pays for won auction from USER1]**
  - [ ] Seller clicks Earnings tab
  - [ ] "Pending Payout" reflects the auction seller net
  - [ ] "Total Paid Out" still shows $0.00

## Admin Payouts Panel

> **Claude Code note:** Test as an admin user. Navigate to `/at-the-bon-fire` and click **Payouts** in the sidebar. This panel has two tables: "Owed to Sellers" and "Payout History."

- [ ] Admin navigates to `/at-the-bon-fire` → clicks **Payouts** in the sidebar
  - [ ] Payouts panel loads without error
  - [ ] "Owed to Sellers" table is visible
  - [ ] "Payout History" table is visible

- [ ] With no sales in the system
  - [ ] "Owed to Sellers" table is empty or all rows show $0.00 pending
  - [ ] "Payout History" shows "No payouts recorded yet"

- [ ] After a seller has completed sales **[two-user: USER2 makes a purchase from USER1 first]**
  - [ ] Seller (USER1) appears in the "Owed to Sellers" table
  - [ ] Pending balance shown for USER1 is greater than $0.00
  - [ ] "Pay Now" button is enabled for USER1's row

- [ ] Admin clicks "Pay Now" for a seller with a pending balance
  - [ ] A dialog/modal opens
  - [ ] Amount field is pre-filled with the seller's pending balance
  - [ ] Notes field is present and editable
  - [ ] Period start and end date fields are present (optional)
  - [ ] Admin can edit the amount, enter notes, and confirm

- [ ] Admin confirms the payout
  - [ ] Dialog closes
  - [ ] Seller's pending balance in the "Owed to Sellers" table updates to $0.00
  - [ ] "Pay Now" button becomes disabled for that seller
  - [ ] New row appears in "Payout History" with the correct seller name, amount, and date

- [ ] Seller (USER1) returns to Dashboard → Earnings tab after payout is recorded
  - [ ] "Pending Payout" now shows $0.00
  - [ ] "Total Paid Out" reflects the payout amount
  - [ ] Payout appears in the payout history list with the correct date and amount

- [ ] Seller makes a new sale after receiving a payout **[two-user: USER2 makes another purchase]**
  - [ ] Seller visits Earnings tab
  - [ ] "Pending Payout" reflects only the new sale (not previously paid sales)
  - [ ] "Total Paid Out" remains at the prior payout amount

## My Purchases

- [ ] View purchase history
  - [ ] Verify all completed purchases appear
  - [ ] Verify purchase details (item, price, date) are correct
- [ ] Auction purchases
  - [ ] Verify won auction appears in purchases
  - [ ] Verify buy-it-now purchase appears in purchases
- [ ] Won/outbid badge clears on visit
  - [ ] _Purchases_ shimmer/count is visible before navigating here
  - [ ] Badge disappears on arrival (mark-as-read fires on mount)
  - [ ] Log out and back in — badge does not reappear

---

## Post-Test Cleanup

> Run after every E2E session to remove accumulated test data (posts, products, auctions, purchases, payouts, messages, S3 images) from the dev database. Preserves the test user accounts themselves.

**Script:** `server/scripts/e2e-cleanup.js`

> **Run from PowerShell** — does not work in bash/Git Bash on Windows. Use `;` to separate env vars.

### Dry run first (preview what will be deleted — no changes made)

```
heroku run --env "USER1_EMAIL=kevinnail@hotmail.com;USER2_EMAIL=knailgear@gmail.com" "node server/scripts/e2e-cleanup.js --dry-run" --app at-the-fire-dev
```

### Run the cleanup

```
heroku run --env "USER1_EMAIL=kevinnail@hotmail.com;USER2_EMAIL=knailgear@gmail.com" "node server/scripts/e2e-cleanup.js" --app at-the-fire-dev
```

### What gets deleted
- Gallery posts + additional images (S3 included)
- Quota tracking products + sales records
- Test orders (order numbers > 24; seed orders 21–24 are preserved)
- Inventory snapshots
- Auctions + bids + auction results + auction notifications
- Purchases (both USER1 as seller and USER2 as buyer)
- Seller payouts
- Image upload quota log
- Conversations + messages between USER1 and USER2
- Likes and follows by either test user

### What is preserved
- User accounts (`cognito_users`, `stripe_customers`, subscriptions, quota goals)
- Seed orders 21–24
