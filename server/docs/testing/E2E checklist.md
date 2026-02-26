# End-to-End Testing Checklist

## Updated Checklist in Google Docs:

[End to End Testing Checklist](https://docs.google.com/document/d/1eJF8kxKujJvzi54orGLwJX1w0CpwypjI5HTmj9R3uR0/edit?usp=sharing)

## New User Creation

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
- [ ] Remove/replace avatar
  - [ ] Verify default avatar appears when removed
- [ ] Fill in all text fields
  - [ ] Test required vs optional fields
- [ ] Edit all text fields
  - [ ] Verify changes persist

## Subscription Purchase

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
  - [ ] Verify post displays in _Dashboard_ tab
  - [ ] Verify post displays in _Quota Tracking_ tab
  - [ ] Verify post displays in _Gallery_
  - [ ] Verify post has all text & images displaying correctly
- [ ] Edit post
  - [ ] Edit text fields
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

- [ ] Create new product
  - [ ] Auction/direct sale/inventory
  - [ ] Prep-other
  - [ ] Test required fields
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
- [ ] Auction end
  - [ ] Verify auction result recorded on close
  - [ ] Verify seller notified
  - [ ] Verify winner notified
- [ ] Archive auction
  - [ ] Verify archived auction no longer appears in active listings

## Cart & Checkout

- [ ] Add item to cart
  - [ ] Verify item appears in cart with correct price and quantity
  - [ ] Test adding duplicate item (quantity update)
- [ ] Cart validation
  - [ ] Verify out-of-stock items are flagged
  - [ ] Verify quantities don't exceed available inventory
- [ ] Checkout
  - [ ] Complete checkout with test card **4242424242424242**
  - [ ] Verify payment intent created and confirmed
  - [ ] Verify inventory decremented after purchase
  - [ ] Verify purchase record created
- [ ] Failed checkout
  - [ ] Use card **4000000000000341** to test payment failure
  - [ ] Verify inventory is not decremented on failure
  - [ ] Verify error message displayed

## My Purchases

- [ ] View purchase history
  - [ ] Verify all completed purchases appear
  - [ ] Verify purchase details (item, price, date) are correct
- [ ] Auction purchases
  - [ ] Verify won auction appears in purchases
  - [ ] Verify buy-it-now purchase appears in purchases
