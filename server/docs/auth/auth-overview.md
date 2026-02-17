# Authentication & Authorization Overview

This document summarizes how authentication and authorization are handled in the system, including key technologies, middleware, and best practices for developers.

---

## Authentication Flow

- **Primary Provider:** AWS Cognito (user pool)
- **Session Management:** JWT tokens (access, ID, refresh) stored in HTTP-only cookies
- **Login/Signup:**
  - Users sign up/sign in via AWS Cognito
  - Upon successful login, tokens are issued and set as cookies
- **Token Refresh:**
  - Refresh token endpoint exchanges refresh token for new access/ID tokens

## Authorization

- **Middleware:**
  - `authenticateAWS`: Verifies JWT and user session
  - `authorizeSubscription`: Checks if user has an active subscription
  - `profileOwnership`: Ensures user can only access/modify their own profile
- **Role/Permission Model:**
  - Most endpoints are user-specific (scoped by Cognito sub)
  - Admin logic (if any) is checked via special customerId or env var

## Admin Authentication & Authorization

- **Admin Identification:**
  - Admin users are determined by a special `customerId` (usually set in an environment variable, e.g., `ADMIN_ID`), or by checking a specific flag/role in the user or customer record.
  - The check is typically performed in controller logic or middleware by comparing the current user's `customerId` to the configured admin value.
- **Admin Middleware:**
  - The `adminIdCheck` middleware (`lib/middleware/adminIdCheck.js`) is used to enforce admin-only access to sensitive routes (such as `/api/v1/atf-operations`).
  - This middleware checks that the authenticated user's `customerId` matches the configured admin value and denies access otherwise.
- **Admin-Only Endpoints/Actions:**
  - Certain endpoints (such as those under `/api/v1/atf-operations` or other management routes) are restricted to admin users only and are protected by the `adminIdCheck` middleware.
  - These endpoints may allow actions like viewing all users, deleting users/subscribers, or accessing system-wide data.
- **Best Practices:**
  - Always check for admin status server-side (never trust client input).
  - Use environment variables for admin IDs to avoid hardcoding sensitive values.
  - Clearly document which endpoints are admin-only and ensure they are not accessible to regular users.
  - Consider logging admin actions for audit purposes.

## Error Handling

- Invalid/expired tokens result in 401/403 responses
- All protected endpoints require valid authentication

## Key Files

- `lib/middleware/authenticateAWS.js`
- `lib/middleware/adminIdCheck.js`
- `lib/controllers/auth.js`

---

For more details, see the relevant middleware and controller files.
