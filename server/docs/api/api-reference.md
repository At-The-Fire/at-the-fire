# API Endpoint Reference

This document lists and describes **all** API endpoints, their request/response formats, and authentication requirements.

---

## Authentication

- **POST** `/api/v1/auth/login` — User login
- **POST** `/api/v1/auth/refresh-tokens` — Refresh JWT tokens
- **POST** `/api/v1/auth/new-user` — Register new user
- **POST** `/api/v1/auth/create-cookies` — Create session cookies
- **DELETE** `/api/v1/auth/clear-cookies` — Clear session cookies
- **GET** `/api/v1/auth/check-customer` — Check subscription status (auth required)

## User Profile

- **GET** `/api/v1/profile/:sub` — Get user profile (auth required)
- **PUT** `/api/v1/profile/user-update` — Update user profile (auth required)
- **PUT** `/api/v1/profile/customer-update` — Update business profile (auth required)
- **POST** `/api/v1/profile/avatar-upload` — Upload user avatar (auth required)
- **POST** `/api/v1/profile/avatar-delete` — Delete user avatar (auth required)
- **POST** `/api/v1/profile/logo-upload` — Upload business logo (auth required)
- **POST** `/api/v1/profile/logo-delete` — Delete business logo (auth required)

## Users

- **GET** `/api/v1/users/?search=...` — Search users by query

## Gallery (Dashboard)

- **GET** `/api/v1/dashboard/download-inventory-csv` — Download inventory as CSV
- **POST** `/api/v1/dashboard/upload` — Upload image files to S3 (auth required)
- **POST** `/api/v1/dashboard/images` — Store image URLs and public IDs in DB (auth required)
- **POST** `/api/v1/dashboard/transfer` — Transfer main image for post editing (auth required)
- **POST** `/api/v1/dashboard/delete` — Delete image from S3 (auth required)
- **GET** `/api/v1/dashboard` — Get all gallery posts for user (auth required)
- **POST** `/api/v1/dashboard` — Create new gallery post (auth required)
- **PUT** `/api/v1/dashboard/:id` — Update gallery post (auth required)
- **PUT** `/api/v1/dashboard/posts/:id/main-image` — Update main image for post (auth required)
- **DELETE** `/api/v1/dashboard/:id` — Delete gallery post (auth required)
- **DELETE** `/api/v1/dashboard/image/:id` — Delete one gallery image from DB (auth required)
- **GET** `/api/v1/dashboard/:id` — Get gallery post by ID (auth required)
- **GET** `/api/v1/dashboard/urls/:id` — Get URLs for additional images (auth required)

## Gallery (Public)

- **GET** `/api/v1/gallery-posts` — Get all gallery posts (public)
- **GET** `/api/v1/gallery-posts/:id` — Get single gallery post (public)
- **GET** `/api/v1/gallery-posts/urls/:id` — Get additional images for post (public)
- **GET** `/api/v1/gallery-posts/feed/:id` — Get feed posts for user (public)

## Likes

- **POST** `/api/v1/likes/toggle/:postId` — Toggle like for a post (auth required)
- **POST** `/api/v1/likes/batch` — Get like status/count for multiple posts (optional auth)
- **GET** `/api/v1/likes/count/:postId` — Get like count for a post
- **GET** `/api/v1/likes/status/:postId` — Get like status for a post (optional auth)

## Followers

- **POST** `/api/v1/followers` — Follow a user (auth required)
- **DELETE** `/api/v1/followers/:followedId` — Unfollow a user (auth required)
- **GET** `/api/v1/followers/count/:userId` — Get follower/following count
- **GET** `/api/v1/followers/followers/:userId` — Get followers for a user
- **GET** `/api/v1/followers/following/:userId` — Get following for a user
- **GET** `/api/v1/followers/:userId/status` — Check if current user follows another (auth required)

## Conversations

- **GET** `/api/v1/conversations` — List conversations (auth required)
- **POST** `/api/v1/conversations` — Start conversation (auth required)
- **POST** `/api/v1/conversations/messages` — Send message (auth required)
- **GET** `/api/v1/conversations/:id/messages` — Get messages for a conversation (auth required)
- **DELETE** `/api/v1/conversations/:id` — Delete a conversation (auth required)
- **PUT** `/api/v1/conversations/mark-read` — Mark conversation as read (auth required)

## Orders

- **GET** `/api/v1/orders` — Get all orders (auth required)
- **POST** `/api/v1/orders` — Create new order (auth required)
- **PUT** `/api/v1/orders/:orderId` — Update order (auth required)
- **PUT** `/api/v1/orders/:orderId/fulfillment` — Update order fulfillment (auth required)
- **DELETE** `/api/v1/orders/:orderId` — Delete order (auth required)

## Quota Tracking

- **GET** `/api/v1/quota-tracking` — Get quota products (auth required)
- **POST** `/api/v1/quota-tracking` — Add new quota product (auth required)
- **PUT** `/api/v1/quota-tracking/:id` — Update quota product (auth required)
- **DELETE** `/api/v1/quota-tracking/:id` — Delete quota product (auth required)

## Goals

- **GET** `/api/v1/goals` — Get quota goals (auth required)
- **PUT** `/api/v1/goals` — Update quota goals (auth required)

## Inventory Snapshot

- **GET** `/api/v1/inventory-snapshot` — Get inventory snapshots (auth required)
- **POST** `/api/v1/inventory-snapshot` — Add/update inventory snapshot (auth required)

## Stripe & Billing

- **GET** `/api/v1/stripe/billing-period` — Get current billing period (auth required)
- **DELETE** `/api/v1/stripe/cancel-deletion` — Cancel and delete customer data (auth required)
- **GET** `/api/v1/stripe/verify` — Verify Stripe cookies
- **POST** `/api/v1/create-checkout-session` — Create Stripe checkout session
- **POST** `/api/v1/customer-portal` — Create Stripe customer portal session

## Webhooks

- **POST** `/api/v1/webhook` — Stripe event receiver

## Admin/ATF Operations

- **GET** `/api/v1/atf-operations` — Get all users, posts, customers, subscriptions (admin)
- **GET** `/api/v1/atf-operations/invoices` — Get all invoices (admin)
- **DELETE** `/api/v1/atf-operations/delete-user/:sub` — Delete user (admin)
- **DELETE** `/api/v1/atf-operations/delete-subscriber/:sub` — Delete subscriber (admin)

---

For more, see controller files in `lib/controllers/`.
