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

> **Claude Code: SKIP the initial purchase and the "Return to dashboard" block.** Purchasing a new subscription requires a real Stripe account and cannot be automated. Test users (`USER1`, `USER2`) already have active subscriptions. Start this section from "Change subscription" onwards.

- [ ] Purchase subscription
  - [ ] Verify payment flow
  - [ ] Test error handling
- [ ] Return to dashboard signed in
  - [ ] Verify subscription status shows correctly
  - [ ] Verify _Profile_ updates with logo/ website/ social media accts
  - [ ] Upload logo image
  - [ ] Fill in some/ all text fields
- [ ] Change subscription
  - [ ] Upgrade
  - [ ] Downgrade
- [ ] Cancel Subscription
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
- [ ] Print order
  - [ ] Verify formatting

### Quota Tracking

- [ ] Create new product — test each type individually:
  - [ ] **Auction** type — create, verify it appears in product list
  - [ ] **Direct Sale** type — create, verify it appears in product list
  - [ ] **Inventory** type — create, verify it appears in product list
  - [ ] **Prep-Other** type — create, verify it appears in product list
  - [ ] Test required fields (submit empty form, verify validation)
- [ ] Edit product
  - [ ] Change text fields
  - [ ] Change image
  - [ ] Verify updates save correctly
- [ ] Delete product
  - [ ] Verify removal
- [ ] Create new product with "Create new gallery post" checked
  - [ ] Verify product displays in _Dashboard_ and _Gallery_

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
  - [ ] Verify purchase appears in buyer's purchases
  - [ ] Verify a congratulations message appears in the messaging system from the seller
  - [ ] Buyer receives "You won!" success toast in real-time (on-site, no page refresh needed)
  - [ ] _Messages_ badge increments immediately in the avatar menu — does not require navigating away and back
  - [ ] Avatar badge reflects updated combined total (messages + won + outbid)
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
- [ ] Archive auction — **automatic, not a user action**
  - > **Claude Code note:** Archiving is automatic — closed auctions move to an archive page on a timed cycle (approximately 48 hours after closing), not instantly, so sellers can still see the auction close in real time. There is no archive button. To test: verify a closed auction still appears on the live auctions page immediately after closing.
  - [ ] Closed auction remains visible on live auction page immediately after closing (not instant-removed)
  - [ ] Closed auction eventually appears on the archive page
  - [ ] Closed auction no longer appears in active listings after archive cycle runs

## Buy Now & Checkout

> **Claude Code note:** The checkout uses a placeholder payment processor — no real payment provider is integrated yet. Any card details entered will result in a successful transaction. Do not use Stripe test card numbers; they have no meaning here. The "Failed checkout" block cannot be tested until a real payment processor is integrated.
>
> The cart/add-to-cart model has been replaced with a direct Buy Now flow. Clicking "Buy Now" on a gallery card or post detail navigates straight to checkout with that single item — there is no cart or cart drawer.

- [ ] Buy Now from gallery card
  - [ ] Verify "Buy Now" button is visible on purchasable items (not sold, price > 0, quantity > 0)
  - [ ] Verify "Buy Now" is not shown on sold items
  - [ ] Click "Buy Now" — verify redirect to checkout with correct item title and price
- [ ] Buy Now from post detail
  - [ ] Select quantity from dropdown
  - [ ] Click "Buy Now" — verify checkout shows correct item and selected quantity
- [ ] Checkout
  - [ ] Verify order summary shows correct item, quantity, and total
  - [ ] Verify shipping cost appears as a line item in order summary (when > $0)
  - [ ] Verify total = item price × quantity + shipping
  - [ ] Complete checkout (placeholder processor — any card details will succeed)
  - [ ] Verify redirect to /my-purchases with new purchase visible
  - [ ] Verify inventory decremented after purchase
  - [ ] Verify purchase record created
- [ ] Navigate to /checkout directly (no item state)
  - [ ] Verify "Nothing to purchase" message is shown with Browse Gallery button
- [ ] Failed checkout
  - [ ] **Claude Code: SKIP — placeholder processor always succeeds; no failure path exists until a real payment processor is integrated**
  - [ ] Verify inventory is not decremented on failure
  - [ ] Verify error message displayed

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
