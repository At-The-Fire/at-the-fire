# Playwright Path B: Setup, Workflow & Maintenance Guide

## What You're Building

A one-time generation pass where Claude Code uses the Playwright MCP to navigate your live app and write `.spec.js` files to disk. After that, all future test runs use `npx playwright test` — no Claude, no tokens, just Playwright executing the scripts and generating its own HTML report.

---

## Part 1: Initial Setup

### Step 1 — Install Playwright in your project

Run this in your project root:

```bash
npm init playwright@latest
```

During the prompt:
- Choose **JavaScript** (unless you prefer TypeScript)
- Choose **Node** as the test runner
- Say **yes** to installing browsers
- Say **no** to adding a GitHub Actions workflow (you can add this later)

This creates:
- `playwright.config.js` — Playwright configuration
- `tests/` — where your spec files will live
- `playwright-report/` — where HTML reports are saved (auto-generated on each run)

---

### Step 2 — Configure `playwright.config.js`

Replace the generated config with this:

```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,           // runs test files in parallel
  retries: 1,                    // retry once on failure before marking as failed
  workers: 4,                    // how many parallel workers (adjust to your machine)
  reporter: [
    ['html', { open: 'never' }], // generates HTML report, doesn't auto-open
    ['list']                     // prints results in terminal as they run
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
});
```

---

### Step 3 — Create your test directory structure

```
tests/
  e2e/
    profile.spec.js
    subscription.spec.js
    dashboard.spec.js
    inventory.spec.js
    orders.spec.js
    quota-tracking.spec.js
    auctions.spec.js
    cart-checkout.spec.js
    my-purchases.spec.js
  fixtures/
    auth.js        ← shared login helpers
  helpers/
    users.js       ← USER1 / USER2 credential helpers
```

Create this structure:

```bash
mkdir -p tests/e2e tests/fixtures tests/helpers
```

---

### Step 4 — Create a shared auth fixture

This avoids repeating login logic in every spec file:

```javascript
// tests/fixtures/auth.js
import { test as base } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export const test = base.extend({
  user1Page: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');
    await page.fill('#email', process.env.USER1_EMAIL);
    await page.fill('#password', process.env.USER1_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await use(page);
    await context.close();
  },

  user2Page: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');
    await page.fill('#email', process.env.USER2_EMAIL);
    await page.fill('#password', process.env.USER2_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

---

### Step 5 — Create your `.env.test` file

```
BASE_URL=http://localhost:3000
USER1_EMAIL=your-test-user1@email.com
USER1_PASSWORD=yourpassword1
USER2_EMAIL=your-test-user2@email.com
USER2_PASSWORD=yourpassword2
```

Add `.env.test` to your `.gitignore` if it isn't already.

---

## Part 2: Generating the Test Files (The One-Time Claude Code Pass)

This is where you spend tokens — once.

### Update your `/e2e-test` custom command

You need a new variant of your command (or modify the existing one) that instructs Claude Code to **write spec files to disk** rather than just running and reporting. Here's the updated command to save at `.claude/commands/e2e-generate.md`:

```markdown
---
name: e2e-generate
description: Generates Playwright .spec.js test files from the E2E checklist. Does NOT run the tests — only produces the files. Run this once per section to build out the test suite.
allowed-tools: Bash, Read, Write, mcp__playwright
---

# E2E Test File Generator

You are generating reusable Playwright test files from the checklist. You are NOT running tests or producing a report. Your only output is `.spec.js` files written to `tests/e2e/`.

## Instructions

1. Read the checklist at `docs/testing/E2E-testing.md`
2. Read the shared auth fixture at `tests/fixtures/auth.js` so you understand what helpers are available
3. You will be told which section to generate. Generate ONLY that section.
4. Navigate the live app using Playwright to discover the real selectors, URLs, and flow for each test
5. Write a complete, working `.spec.js` file for that section to `tests/e2e/[section-name].spec.js`

## File format rules

- Import from `../../fixtures/auth.js` not from `@playwright/test` directly
- Use `test.describe` blocks matching the checklist section name
- Each checklist checkbox = one `test()` block
- Add a `test.skip()` with a comment for any item marked as out of scope in the checklist
- Selectors must be real — navigate the app to find them, do not guess
- Each test must be independent — do not rely on state from a previous test

## Section to generate

[SECTION NAME WILL BE PASSED HERE]
```

### How to run the generation pass

Run this once per section in Claude Code. You can do them sequentially or in separate sessions:

```
/e2e-generate Profile CRUD
/e2e-generate Subscription
/e2e-generate Dashboard CRUD
/e2e-generate Inventory
/e2e-generate Orders
/e2e-generate Quota Tracking
/e2e-generate Auctions
/e2e-generate Cart and Checkout
/e2e-generate My Purchases
```

Each invocation navigates your app, writes one `.spec.js` file, and exits. After all sections are done, your `tests/e2e/` folder is fully populated.

---

## Part 3: Running the Tests (Free, Forever)

### Run everything

```bash
npx playwright test
```

### Run a specific file

```bash
npx playwright test tests/e2e/auctions.spec.js
```

### Run a specific test by name

```bash
npx playwright test -g "bid on auction"
```

### Run in headed mode (watch the browser)

```bash
npx playwright test --headed
```

### View the HTML report after a run

```bash
npx playwright show-report
```

The report lives at `playwright-report/index.html` and includes:
- Pass/fail per test
- Screenshots on failure
- Video replay of failing tests
- Full error traces with line numbers

---

## Part 4: What a Spec File Looks Like

For your reference coming from Jest — Playwright's syntax will feel familiar:

```javascript
// tests/e2e/dashboard.spec.js
import { test, expect } from '../fixtures/auth.js';

test.describe('Dashboard CRUD', () => {

  test('create new post — required fields validation', async ({ user1Page }) => {
    const page = user1Page;
    await page.goto('/dashboard');
    await page.click('[data-testid="new-post-button"]');
    await page.click('[type="submit"]');
    await expect(page.locator('.field-error')).toBeVisible();
  });

  test('create new post — valid submission', async ({ user1Page }) => {
    const page = user1Page;
    await page.goto('/dashboard');
    await page.click('[data-testid="new-post-button"]');
    await page.fill('[name="title"]', 'Test Post');
    await page.fill('[name="quantity"]', '10');
    await page.click('[type="submit"]');
    await expect(page.locator('.post-list')).toContainText('Test Post');
  });

  test('quantity rejects non-numeric input', async ({ user1Page }) => {
    const page = user1Page;
    await page.goto('/dashboard');
    await page.click('[data-testid="new-post-button"]');
    await page.fill('[name="quantity"]', 'abc');
    await page.click('[type="submit"]');
    await expect(page.locator('[name="quantity"]')).toHaveValue('');
  });

});
```

**Jest vs Playwright comparison:**

| Jest | Playwright |
|------|------------|
| `describe()` | `test.describe()` |
| `it()` / `test()` | `test()` |
| `expect(x).toBe(y)` | `expect(locator).toHaveText(y)` |
| `beforeEach()` | `test.beforeEach()` |
| `jest.mock()` | Not needed — you're testing real UI |
| DOM via jsdom | Real browser (Chromium/Firefox/WebKit) |

The biggest shift: in Jest you're usually testing logic in isolation. In Playwright you're asserting on what the real browser renders, so expectations are on DOM elements, not return values.

---

## Part 5: Maintenance Workflow (New Features Going Forward)

This is the part that keeps everything seamless long-term.

### When you add a new feature

**Step 1 — Add checklist items first**

Update `docs/testing/E2E-testing.md` with the new feature's test cases before writing any code. This keeps your checklist as the source of truth.

**Step 2 — Generate the new spec (or extend an existing one)**

If it's a new section:
```
/e2e-generate [New Feature Name]
```

If it extends an existing section (e.g., you added a field to Dashboard), tell Claude Code:
```
/e2e-generate Dashboard CRUD — add tests for the new [feature name] field only,
append to tests/e2e/dashboard.spec.js
```

**Step 3 — Run the suite to confirm nothing broke**

```bash
npx playwright test
```

**Step 4 — Commit both the checklist update and the new spec file together**

Keeping them in sync in the same commit means your git history always shows why a test exists.

### When a test breaks after a UI change (selector drift)

This is the most common maintenance task. A button gets renamed, a class changes, and a test starts failing. The fix:

```
/e2e-generate [section name] — the [test name] test is failing because the selector
changed. Navigate the app and update the selector in tests/e2e/[file].spec.js only.
```

Claude Code navigates the live app, finds the new selector, updates the file. Minimal tokens, surgical fix.

### Suggested `package.json` scripts to add

```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --headed",
  "test:e2e:report": "playwright show-report",
  "test:e2e:auctions": "playwright test tests/e2e/auctions.spec.js",
  "test:e2e:dashboard": "playwright test tests/e2e/dashboard.spec.js"
}
```

Then you just run `npm run test:e2e` from anywhere in the project.

---

## Summary: The Full Picture

```
ONE TIME (tokens spent here):
  /e2e-generate [section] × 9 sections
  → produces tests/e2e/*.spec.js

EVERY RUN AFTER (free):
  npx playwright test
  → real browser executes all specs
  → HTML report generated at playwright-report/
  → no Claude, no tokens

NEW FEATURES (minimal tokens):
  Update checklist → /e2e-generate [section] → commit spec + checklist together
```
