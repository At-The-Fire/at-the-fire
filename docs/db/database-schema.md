# Database Schema & Data Flow

This document provides a detailed overview of the main database tables, their relationships, and how data flows through the system.

---

## 1. Main Entities & Tables

_User & Auth_

- **cognito_users**: User profile info (sub, name, email, etc.)
- **stripe_customers**: Business/subscription profile, maps users to Stripe customer records

_Social_

- **followers**: User follow relationships (many-to-many self-join)
- **likes**: Likes on posts (user ↔ post)
- **conversations**: Messaging conversations between users
- **conversation_participants**: Users in each conversation
- **conversation_visibility**: Per-user visibility for conversations
- **messages**: Individual messages in conversations

_Gallery & Inventory_

- **gallery_posts**: Posts (artwork/products) created by users; supports quantity and sold flag
- **posts_imgs**: Additional images for posts
- **quota_tracking**: Quota products (what the UI calls "Products") for a customer
- **product_sales**: Individual sale entries per quota_tracking product
- **quota_goals**: Quota goals for a customer
- **inventory_snapshot**: Point-in-time inventory snapshots for analytics
- **orders**: Purchase orders created by a seller for clients
- **image_uploads**: Tracks daily image upload count per customer

_Auctions & Ecommerce_

- **auctions**: Timed auction listings (standalone, not linked to gallery_posts)
- **bids**: Bids placed on auctions
- **auction_results**: Winner, payment, and shipping lifecycle per closed auction (1:1 with auctions)
- **auction_notifications**: In-app notifications (outbid, won) per user
- **purchases**: Payment records for direct gallery_post sales (and future auction payments)

_Billing_

- **subscriptions**: Stripe subscription records
- **invoices**: Stripe invoice records
- **cancellation_data**: Cancellation reason/feedback captured from Stripe on subscription cancel
- **failed_transactions**: Stripe payment failure log
- **webhook_events**: Idempotency log — deduplicates incoming Stripe webhook events

---

## 2. Relationships (Foreign Keys & Structure)

- `cognito_users.sub` ↔ `stripe_customers.aws_sub` (1:1 or 1:0)
- `gallery_posts.customer_id` ↔ `stripe_customers.customer_id` (N:1)
- `posts_imgs.post_id` ↔ `gallery_posts.id` (N:1)
- `followers.follower_id`/`followed_id` ↔ `cognito_users.sub` (M:N)
- `likes.sub` ↔ `cognito_users.sub`, `likes.post_id` ↔ `gallery_posts.id`
- `conversation_participants.user_sub` ↔ `cognito_users.sub`, `conversation_participants.conversation_id` ↔ `conversations.id`
- `conversation_visibility.user_sub` ↔ `cognito_users.sub`, `conversation_visibility.conversation_id` ↔ `conversations.id`
- `messages.conversation_id` ↔ `conversations.id`, `messages.sender_sub` ↔ `cognito_users.sub`
- `orders.customer_id` ↔ `stripe_customers.customer_id`
- `quota_tracking.customer_id` ↔ `stripe_customers.customer_id`, `quota_tracking.post_id` ↔ `gallery_posts.id`
- `product_sales.product_id` ↔ `quota_tracking.id` (N:1)
- `quota_goals.customer_id` ↔ `stripe_customers.customer_id`
- `inventory_snapshot.customer_id` ↔ `stripe_customers.customer_id`
- `subscriptions.customer_id` ↔ `stripe_customers.customer_id`
- `invoices.customer_id` ↔ `stripe_customers.customer_id`, `invoices.subscription_id` ↔ `subscriptions.subscription_id`
- `auctions.seller_sub` ↔ `cognito_users.sub` (N:1)
- `bids.auction_id` ↔ `auctions.id`, `bids.bidder_sub` ↔ `cognito_users.sub`
- `auction_results.auction_id` ↔ `auctions.id` (1:1), `auction_results.winner_sub` ↔ `cognito_users.sub`
- `auction_notifications.user_sub` ↔ `cognito_users.sub`, `auction_notifications.auction_id` ↔ `auctions.id`
- `purchases.buyer_sub` ↔ `cognito_users.sub`, `purchases.seller_customer_id` ↔ `stripe_customers.customer_id`

---

## 3. Data Flow Example (User Journey)

1. **Signup/Login**
   - User is created in `cognito_users` (AWS Cognito).
   - On subscription, a `stripe_customers` record is created and linked to the user.
2. **Profile & Business**
   - User profile data is stored in `cognito_users`.
   - Business profile (display name, logo, etc.) is in `stripe_customers`.
3. **Gallery/Posts**
   - User (via their business/customer) creates posts in `gallery_posts`.
   - Each post can have multiple images (`posts_imgs`).
   - Posts can be liked (`likes`), tracked for quotas (`quota_tracking`), and referenced in orders.
4. **Followers & Social**
   - Users can follow/unfollow each other (`followers`).
5. **Conversations**
   - Users can start conversations (`conversations`, `conversation_participants`).
   - Messages are stored in `messages`.
6. **Orders**
   - Orders are created for a customer (`orders`), referencing items/posts.
7. **Auctions & Ecommerce**
   - Artists create auction listings (`auctions`) with a start price, optional buy-now price, and end time.
   - Bidders place bids (`bids`); the current bid is tracked on the auction row.
   - When an auction closes (timer or buy-now), a result is recorded (`auction_results`) with winner, final bid, and closed reason.
   - Outbid and won events create in-app notifications (`auction_notifications`).
   - Direct product purchases create payment intent + confirm flow, resulting in `purchases` rows. Gallery post quantity is decremented; if it reaches 0, `sold` is set to true.
8. **Quota & Inventory**
   - Quota products and goals are tracked per customer.
   - Inventory snapshots are periodically saved.
9. **Billing**
   - Subscriptions and invoices are managed per customer.
   - Stripe webhooks update these records.

---

## 4. Hierarchy & Structure

- **User** (`cognito_users`)
  - ↳ **Business Profile** (`stripe_customers`)
    - ↳ **Posts** (`gallery_posts`)
      - ↳ **Images** (`posts_imgs`)
      - ↳ **Likes**
      - ↳ **Quota Tracking** (`quota_tracking`)
        - ↳ **Product Sales** (`product_sales`)
    - ↳ **Orders**
    - ↳ **Quota Goals**
    - ↳ **Inventory Snapshots**
    - ↳ **Subscriptions**
      - ↳ **Invoices**
      - ↳ **Cancellation Data**
    - ↳ **Auctions** (`auctions`)
      - ↳ **Bids** (`bids`)
      - ↳ **Auction Results** (`auction_results`)
    - ↳ **Purchases** (`purchases`)
  - ↳ **Auction Notifications** (`auction_notifications`)
  - ↳ **Followers**
  - ↳ **Conversations**
    - ↳ **Messages**

---

## 5. Visual ERD (Entity Relationship Diagram)

> **Note:** The one-to-one relationship between `cognito_users` and `stripe_customers` is enforced by unique constraints on both `cognito_users.customer_id` and `stripe_customers.aws_sub` in the schema.

```mermaid
Diagram
  COGNITO_USERS ||--|| STRIPE_CUSTOMERS : "has"
  STRIPE_CUSTOMERS ||--o{ GALLERY_POSTS : "owns"
  GALLERY_POSTS ||--o{ POSTS_IMGS : "has"
  GALLERY_POSTS ||--o{ LIKES : "receives"
  COGNITO_USERS ||--o{ LIKES : "gives"
  COGNITO_USERS ||--o{ FOLLOWERS : "follows"
  COGNITO_USERS ||--o{ FOLLOWERS : "is_followed_by"
  STRIPE_CUSTOMERS ||--o{ ORDERS : "places"
  STRIPE_CUSTOMERS ||--o{ QUOTA_TRACKING : "tracks"
  QUOTA_TRACKING ||--o{ PRODUCT_SALES : "has"
  STRIPE_CUSTOMERS ||--o{ QUOTA_GOALS : "sets"
  STRIPE_CUSTOMERS ||--o{ INVENTORY_SNAPSHOT : "has"
  STRIPE_CUSTOMERS ||--o{ SUBSCRIPTIONS : "subscribes"
  SUBSCRIPTIONS ||--o{ INVOICES : "billed_by"
  COGNITO_USERS ||--o{ CONVERSATION_PARTICIPANTS : "participates"
  CONVERSATION_PARTICIPANTS }o--|| CONVERSATIONS : "in"
  CONVERSATIONS ||--o{ MESSAGES : "contains"
  COGNITO_USERS ||--o{ MESSAGES : "sends"
  COGNITO_USERS ||--o{ AUCTIONS : "lists"
  AUCTIONS ||--o{ BIDS : "receives"
  AUCTIONS ||--o| AUCTION_RESULTS : "closes_to"
  COGNITO_USERS ||--o{ AUCTION_NOTIFICATIONS : "receives"
  AUCTIONS ||--o{ AUCTION_NOTIFICATIONS : "triggers"
  COGNITO_USERS ||--o{ PURCHASES : "buys"
  STRIPE_CUSTOMERS ||--o{ PURCHASES : "sells"
```

---

For more details, see the models in `lib/models/`.
