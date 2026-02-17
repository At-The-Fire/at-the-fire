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
