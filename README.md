![At The Fire Logo](https://atf-main-storage.s3.us-west-2.amazonaws.com/atf-assets/logo-icon-6-192.png)

# At The Fire

**A Gallery Platform for Artists and Collectors**

_At The Fire_ is a subscription-based gallery site designed for artists to showcase their collections and offer their work for sale. Collectors are welcome to subscribe as well. The platform features a tiered subscription model—basic accounts are free, while a paid subscription unlocks business accounting and sales analysis tools. Artists can create posts, manage inventory, track sales, and analyze production.

## Features

### Subscription Tiers

- **Basic Account (Free)**: Social features available to all users:
  - Manage a profile, like posts, and follow other users for a personal feed
  - Send and receive private messages
- **Paid Subscription**: Full business toolkit:
  - **Content Posting**: Create gallery posts that contribute to the inventory list
  - **Inventory Management**: View inventory snapshots and download CSV files
  - **Orders & Goals**: Create/manage orders, track daily/monthly production quotas, and set goals
  - **Data Visualization**: Graphical and tabular data analysis for sales and production

### Artist Tools

- **Inventory Tracking**: Create and track inventory items, visualize their total value
- **Download CSV**: Export inventory and sales data for spreadsheet use
- **Production Management**: Set daily production quotas and track goals with an interactive calendar
- **Sales Analysis**: Analyze all financial data through interactive graphs and tables
- **Create and Print Purchase Orders**

### User Interaction & Social Features

- **User Profile Page**: Available to all users
- **Stripe Customer Portal**: Manage subscription—purchase, renew, or cancel
- **Feedback Handling**: Integrated with Google Forms for feedback, suggestions, bug reporting, and customer service

## Tech Stack

### Frontend

- **React 18** with Create React App
- **Material-UI (MUI) v5**: Component library with dark/light themes
- **Zustand**: Primary state management
- **React Router v6**: Client-side routing
- **Socket.IO client**: Real-time messaging
- **Chart.js**: Data visualization for sales and production analytics
- **AWS Cognito** (`amazon-cognito-identity-js`): User authentication
- **Stripe.js**: Subscription checkout
- **React Dropzone**: Drag & drop file/image uploads
- **React Swipeable**: Swipe gestures for galleries and calendars
- **Date-fns**: Date manipulation
- **React Toastify**: In-app notifications

### Backend

- **Node.js 20 & Express**: REST API (CommonJS, no TypeScript)
- **PostgreSQL** (`pg`): Primary database, raw parameterized queries
- **Redis**: Response caching
- **Socket.IO**: Real-time messaging server
- **AWS Cognito**: JWT issuance and verification (RS256 via JWKS)
- **AWS S3 (SDK v3)**: Image storage
- **Stripe SDK & Webhooks**: Payment processing and subscription lifecycle
- **CryptoJS**: AES-256 encryption for PII at rest
- **Helmet**: HTTP security headers and CSP
- **Multer**: Image upload handling
- **json2csv**: CSV export

### Testing & Code Quality

- **Jest**: Unit and integration tests (both client and server)
- **Supertest**: HTTP endpoint testing
- **React Testing Library**: UI component testing
- **ESLint** + **Prettier**: Code style enforcement

## Team & Ownership

- **Owner / Lead Developer**: [Kevin Nail](https://www.kevinnail.com/)
- **Contributors**: [Tyler Watson](https://www.linkedin.com/in/tylerwatson91), [Jake Doherty](https://www.linkedin.com/in/jacob-doherty1)

## Future Plans

- **Ecommerce**: Shopping cart and direct sales features to help artists sell on the platform
- **Full Deployment**: Planned once resources and funding are secured

## Licensing

_At The Fire_ is proprietary software. All rights reserved. No portion of the codebase or design may be reproduced or shared without permission from the owner.

---

For questions, contact Kevin Nail at [kevin@kevinnail.com](mailto:kevin@kevinnail.com).

---

_If you're part of the journey, welcome, and thanks for being here—let's keep the fire burning._
