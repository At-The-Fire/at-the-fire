![At The Fire Logo](https://atf-main-storage.s3.us-west-2.amazonaws.com/atf-assets/logo-icon-6-192.png)

# At The Fire

**A Gallery, Auction, and Ecommerce Platform for Artists and Collectors**

_At The Fire_ is a subscription-based gallery and ecommerce platform designed for artists to showcase their collections and sell their work. Collectors can browse, bid on auctions, and purchase directly from artists. The platform features a tiered subscription model- basic accounts are free, while a paid subscription unlocks business accounting, sales analysis, and ecommerce tools. Artists can create posts, manage inventory, run auctions, track sales, and analyze production.

## Features

### Subscription Tiers

- **Basic Account (Free)**: Allows users to log in and out, manage a profile, like posts, follow artists, instant message other users, view galleries, browse and bid on auctions, add items to cart and purchase from artists, and view purchase history.
- **Paid Subscription**: Includes advanced business features such as:
  - **Content Posting**: Create gallery posts that contribute to the inventory list.
  - **Inventory Management**: View inventory snapshots and download CSV files.
  - **Orders & Goals**: Create/manage orders, track daily/monthly production quotas, and set goals.
  - **Data Visualization**: Access graphical and tabular data analysis for sales and production.
  - **Auctions**: Create and manage timed auctions with live bidding.

### Artist Tools

- **Inventory Tracking**: Create and track inventory items, visualize their total value.
- **Download CSV**: Export inventory and sales data for spreadsheet use.
- **Production Management**: Set daily production quotas and track goals with an interactive calendar.
- **Sales Analysis**: Analyze all financial data through interactive graphs and tables.
- **Create and Print Purchase Orders**.
- **Auctions**: Create timed auctions with a start price, manage active and archived auctions.

### Ecommerce & Buyer Features

- **Shopping Cart**: Add items to cart from product listings or auction buy-now offers.
- **Checkout**: Stripe-powered checkout for direct product purchases.
- **Purchase History**: Buyers can view all past purchases.

### User Interaction & Social Features

- **User Profile Page**: Free for all users.
- **Likes & Following**: Like posts and follow other users for a personalized feed.
- **Messaging**: Real-time private messaging via Socket.IO.
- **Stripe Customer Portal**: Manage subscription- purchase, renew, or cancel.
- **Feedback Handling**: Integrated with Google Forms for feedback, suggestions, bug reporting, and customer service.

## Tech Stack

### **Frontend**

- **React 18**: Framework for building user interfaces.
- **React Router v6**: Client-side routing.
- **Material-UI (MUI) v5**: Component library with dark/light themes.
- **Zustand**: Primary state management.
- **Socket.IO client**: Real-time messaging.
- **Chart.js & react-chartjs-2**: Data visualization for sales and production analytics.
- **AWS Cognito** (`amazon-cognito-identity-js`): User authentication.
- **Stripe.js**: Subscription and product checkout.
- **React Swipeable**: Swipe gestures for galleries and calendars.
- **React Dropzone**: Drag & drop file uploads.
- **Browser Image Compression**: Client-side image compression before upload.
- **React Modal**: Modal dialogs.
- **Date-fns**: Date manipulation.
- **lucide-react**: Icon library.
- **React Toastify**: In-app notifications and upload progress.

### **Backend**

- **Node.js & Express**: REST API for handling server-side logic and requests.
- **PostgreSQL** (`pg`): Primary database, raw parameterized queries.
- **Redis**: Response caching.
- **Socket.IO**: Real-time messaging server.
- **AWS Cognito**: JWT issuance and verification (RS256 via JWKS).
- **AWS S3 (SDK v3)**: Image storage and management.
- **AWS CloudFront**: CDN for optimized image delivery.
- **Stripe SDK & Webhooks**: Payment processing, subscription management, and real-time subscription status updates.
- **CryptoJS**: AES-256 encryption for securing sensitive user data.
- **Multer**: Middleware for handling image uploads.
- **Helmet**: HTTP security headers and content security policies (CSP).
- **json2csv**: CSV export.

### **Testing & Code Quality**

- **Jest**: Unit and integration testing.
- **Supertest**: HTTP endpoint testing.
- **React Testing Library**: UI component testing.
- **Prettier**: Code formatting.
- **ESLint**: JavaScript linter for consistent coding style.

## Team & Ownership

- **Owner / Lead Developer**: [Kevin Nail](https://www.kevinnail.com/)
- **Contributors**: [Tyler Watson](https://www.linkedin.com/in/tylerwatson91), [Jake Doherty](https://www.linkedin.com/in/jacob-doherty1)

## Licensing & Proprietary Information

_At The Fire_ is proprietary software. All rights reserved. No portion of the codebase or design may be reproduced or shared without permission from the owner.

---

### Contact & Support

For any questions, please contact Kevin Nail at [kevin@kevinnail.com](mailto:kevin@kevinnail.com).

---

If you're part of the journey, welcome, and thanks for being here- let's keep the fire burning.
