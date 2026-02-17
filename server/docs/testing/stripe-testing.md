# Stripe Integration Testing Guide

## Important Note

> **These tests are limited in scope.** The primary goal of using the Stripe CLI and VS Code extension is to confirm that the backend receives and processes event data correctly. These tests are not intended for verifying database updates or full integration. Ensure that comprehensive end-to-end testing is conducted separately using the test credit card numbers listed below to validate full system behavior.

## Test Environment Setup

- Stripe Dashboard set to Test Mode
- Customer Portal handles subscription management
- Webhooks update the database based on Stripe events
- Server endpoint: `/api/v1/webhook`

## Critical Webhook Events

Our application listens for the following events:

1. **`customer.created`**

   - Triggered when a new customer signs up

2. **`charge.succeeded`**

   - Confirms successful payment processing

3. **`invoice.created`**

   - Indicates the start of a new billing cycle

4. **`invoice.payment_succeeded`**

   - Confirms payment collection

5. **`customer.subscription.updated`**

   - Handles plan changes (upgrades/downgrades)

6. **`customer.subscription.deleted`**

   - Manages subscription cancellations

7. **`payment_intent.payment_failed`**
   - Handles failed payments

## Local Testing with Stripe VS Code Extension

### Initial Setup

1. **Install Stripe Extension for VS Code**

   - Ensure you have the [Stripe VS Code Extension](https://marketplace.visualstudio.com/items?itemName=stripe.vscode-stripe) installed.
   - The extension requires the Stripe CLI to function; ensure it is already installed and configured.

2. **Login to Stripe Through the Extension**
   - Open the command palette in VS Code (`Cmd+Shift+P` or `Ctrl+Shift+P`).
   - Type and select `Stripe: Log in to Stripe`.
   - Follow the prompts in your browser to authenticate and connect to your Stripe account.
   - You will see a confirmation message when login is successful.

### Stripe CLI Quick Start Guide

**Install in PowerShell/Command Prompt:**

- Open PowerShell and type the following commands:

  ```shell
  cd [path/to/stripe.exe]  # Paste the direct path to the exe file
  ./stripe.exe
  ./stripe login
  ./stripe listen --forward-to localhost:4242/api/v1/webhook
  ```

**Install Stripe Extension in VS Code:**

- Install the Stripe extension.
- Download the CLI, unzip it, and move it to your chosen directory:
  - Visit [Stripe CLI Documentation](https://docs.stripe.com/stripe-cli#install) for Windows installation.
  - Download the latest Windows zip file from GitHub.
  - Unzip the `stripe_X.X.X_windows_x86_64.zip` file.
  - Add the path to the unzipped `stripe.exe` file to your Path environment variable.

**Update Environment Variables:**

- Search for "Environment Variables" in Windows.
- Open “Environment Variables,” choose “Path” in User variables, click “Edit,” and add the directory path (e.g., `C:\[path\to\directory]`).

**Configure VS Code Extension:**

- Open Stripe extension settings in VS Code.
- Locate “Stripe: CLI Install Path” and paste the path (right-click > copy as path).
- A VS Code prompt should open to log in to Stripe; follow the prompts.

### Testing Webhooks Locally

#### Trigger Specific Events

1. Use the command palette to run `Stripe: Trigger Event`.
2. Select from the list of available events:

   ```shell
   # You can still use the CLI commands if needed:
   stripe trigger customer.created
   stripe trigger charge.succeeded
   stripe trigger invoice.created
   stripe trigger invoice.payment_succeeded
   stripe trigger customer.subscription.updated
   stripe trigger customer.subscription.deleted
   stripe trigger payment_intent.payment_failed
   ```

### Monitor Results

- Verify webhook endpoint responses.
- Confirm that your application handles event data appropriately.

## E2E Manual Testing Procedures

### 1. New Subscription Flow

- Sign up on the site
- Purchase subscription through the Customer Portal
- Confirm dashboard access is granted

### 2. Subscription Management

- Upgrade from monthly to yearly plan
- Cancel subscription
- Verify access restrictions
- Renew subscription
- Confirm access is restored

## Test Credit Cards for E2E testing specific scenarios

- **4242424242424242** – Successful payment
- **4000000000000341** – Payment failure
- **4000002760003184** – Requires authentication

## Common Testing Scenarios

### Successful Subscription

- Use card: **4242424242424242**
- Verify webhook sequence:
  - `customer.created`
  - `invoice.created`
  - `charge.succeeded`
  - `invoice.payment_succeeded`

### Failed Payment

- Use card: **4000000000000341**
- Verify `payment_intent.payment_failed` event
- Confirm access restrictions

### Subscription Changes

- Upgrade subscription
- Verify `customer.subscription.updated`
- Confirm Subscription Management on Dashboard tab reflects the new plan

### Subscription Cancellation

- Cancel via Customer Portal
- Verify `customer.subscription.deleted`
- Confirm access restrictions
- Verify data retention

## Notes

- All webhook events include `customerId` for database relations
- Subscription status determines user access rights
- Customer Portal manages all subscription modifications
- Database updates reflect Stripe as the source of truth

## Additional Resources

### Stripe Testing

- [Test Mode](https://docs.stripe.com/test-mode)
- [Testing Stripe Billing](https://docs.stripe.com/billing/testing#webhooks)
- [Automated Testing](https://docs.stripe.com/automated-testing)
- [Testing Credit Cards](https://docs.stripe.com/testing#cards)
- [Customer Portal](https://docs.stripe.com/customer-management)

### General Stripe Docs

- [Stripe-docs](https://stripe.com/docs)
- [Stripe-cli](https://stripe.com/docs/stripe-cli)
- [Subscriptions](https://stripe.com/docs/billing/subscriptions/)
- [Webhooks](https://stripe.com/docs/webhooks)
