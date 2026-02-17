![At The Fire Logo](https://atf-main-storage.s3.us-west-2.amazonaws.com/atf-assets/logo-icon-6-192.png)

# At The Fire

**A Gallery Platform for Artists and Collectors**

_At The Fire_ is a subscription-based gallery site designed for artists to showcase their collections and offer their work for sale. Collectors are welcome to subscribe as well. The platform features a tiered subscription model—basic accounts are free, while a paid subscription unlocks business accounting and sales analysis tools. Artists can create posts, manage inventory, track sales, and analyze production.

## Features

### Subscription Tiers

- **Basic Account (Free)**: Social media
  - Allows users to log in and out
  - Manage a profile, 'like' posts,
  - Follow other users for their own personal feed,
  - Send private messages.
- **Paid Subscription**: Includes advanced business features such as:
  - **Content Posting**: Create gallery posts that contribute to the inventory list.
  - **Inventory Management**: View inventory snapshots and download CSV files.
  - **Orders & Goals**: Create/manage orders, track daily/monthly production quotas, and set goals.
  - **Data Visualization**: Access graphical and tabular data analysis for sales and production.

### Artist Tools

- **Inventory Tracking**: Create and track inventory items, visualize their total value.
- **Download CSV**: Export inventory and sales data for spreadsheet use.
- **Production Management**: Set daily production quotas and track goals with an interactive calendar.
- **Sales Analysis**: Analyze all financial data through interactive graphs and tables.
- **Create and Print Purchase Orders**.

### User Interaction & Social Features

- **User Profile Page**: Free for all users with basic functionalities.
- **Stripe Customer Portal**: Manage subscription—purchase, renew, or cancel.
- **Feedback Handling**: Integrated with Google Forms for feedback, suggestions, bug reporting, and customer service.

## Tech Stack

### **Frontend**

- **React**: Framework for building user interfaces.
- **Material-UI (MUI)**: Components for UI design.
- **React Modal**: For displaying modals.
- **React Swipeable**: Adds swipe features to galleries and calendars.
- **React Dropzone**: Drag & drop file uploads.
- **React Graph.js**: Data visualization for inventory tracking and CSV download.
- **Zustand**: State management for simpler handling of app state.
- **React Toastify**: For notifications.

### **Backend**

- **Node.js & Express**: Backend framework for handling server-side logic and requests.
- **AWS Cognito**: User authentication for secure user management.
- **CryptoJS**: AES-256 encryption for handling user data.
- **Stripe SDK & Webhooks**: Payment processing, subscription management, and real-time updates for subscription status.
- **Multer**: Middleware for handling image uploads.
- **Hemlet**: Content security policies (CSP)

### **Image Management**

- **AWS S3 (AWS SDK v3)**: For image storage and management.

### **User Interface Features**

- **Material-UI Lab & Date Pickers**: Enhanced components for an improved user experience.
- **Date-fns**: For date manipulation within the application.

### **Dashboard & Content Management**

- **Content Posting**: Artists can create posts directly via the dashboard.
- **Inventory Management**: Create gallery posts that add to inventory and generate CSVs.
- **Financial Overview**: Visualize inventory value with graphs and tables.
- **Production History**: Track production via a color-coded calendar.
- **Analysis Tools**: Graphs and tables for a detailed look at finances and production.

### **Stripe Integration**

- **Stripe Customer Portal**: Handles all subscription purchases, renewals, and cancellations, as well as customer details.

### **Data Visualization**

- **Chart.js & Chart.js Annotation Plugin**: Graphs and visual annotations for data insights.

### **Testing & Code Quality**

- **Jest**: Unit testing for JavaScript code.
- **Supertest**: HTTP endpoint testing.
- **AWS-SDK-Mock**: Mock AWS services for testing.
- **Testing Library**: UI component testing.
- **Prettier**: For code formatting.
- **ESLint**: JavaScript linter for consistent coding style.

## Team & Ownership

- **Owner/ Lead Developer**: [Kevin Nail](https://www.kevinnail.com/)
- **Team Members/Contributors**: [Tyler Watson](https://www.linkedin.com/in/tylerwatson91), [Jake Doherty](https://www.linkedin.com/in/jacob-doherty1)

## Future Plans

- **Monetization**: Planning to introduce a shopping cart and more ecommerce features to help artists sell directly on the site.
- **Social Media Features**: Implement "likes" and "followers" to boost social interaction on the platform.
- **Deployment**: Full deployment planned once resources and funding are secured.

## Licensing & Proprietary Information

- _At The Fire_ is proprietary software. All rights reserved. No portion of the codebase or design may be reproduced or shared without permission from the owner.

---

### Contact & Support

For any questions, please contact Kevin Nail at [kevin@kevinnail.com](mailto:kevin@kevinnail.com).

---

This README provides a high-level overview of the project, and it's intended to keep everyone aligned on the vision and status of _At The Fire_. If you're part of the journey, welcome, and thanks for being here—let's keep the fire burning.
