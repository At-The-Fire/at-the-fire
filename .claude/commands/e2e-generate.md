---
name: e2e-generate
description: Generates Playwright .spec.js test files from the E2E checklist. Does NOT run tests or produce a report. Run once per checklist section to build out the test suite.
allowed-tools: Bash, Read, Write, mcp__playwright
---

# E2E Test File Generator

You are generating reusable Playwright test files from the checklist. You are NOT running tests or producing a report. Your only output is `.spec.js` files written to `tests/e2e/`.

---

## Before You Begin

1. Read the full checklist at `docs/testing/E2E-testing.md`
2. Read `tests/fixtures/auth.js` to understand available helpers
3. Load `BASE_URL` from `.env.test` (default: `http://localhost:3000`)
4. Load credentials from `.env.test`:
   - `USER1_EMAIL`, `USER1_PASSWORD` — seller / initiator / primary actor
   - `USER2_EMAIL`, `USER2_PASSWORD` — buyer / responder / secondary actor
5. **For every feature in the section you are generating, read the relevant React component source files in `client/src/components/` before writing a single selector.** This is mandatory — not optional. The selectors you write must come from actual JSX in those files, not from convention or assumption.

---

## Execution Rules

- Generate ONLY the section passed to you. Do not generate other sections.
- **Read component source first, then confirm with Playwright.** Do not write selectors from memory or convention. The source is the authority on CSS class names, button text, input types, and ARIA roles.
- Each test must be fully independent — no test may rely on state created by another test.
- Keep sessions separate when both users are needed. Do not mix credentials between roles in the same flow.

---

## Known Patterns in This Codebase (Do Not Violate)

These are confirmed facts about this app. Writing tests that contradict them will produce broken tests:

- **Auction list cards are `<div className="auction-preview-item">` with `onClick` — they are NOT `<a>` tags.** There are no `href` attributes on cards. To navigate to a detail page, click the card div and wait for `waitForURL(/\/auctions\/\d+/)`.
- **Auction titles are rendered only in `img[alt]` on the list page** (`AuctionPreviewItem`). `getByText(title)` will NOT find them. Use `locator('img[alt="..."]')`.
- **`datetime-local` inputs are not `textbox` role.** Use `locator('input[type="datetime-local"]')` directly.
- **Modals (`AuctionBidModal`, `ConfirmBINModal`) use `role="dialog"`** and are rendered via `createPortal` — `getByRole('dialog')` works correctly.
- **After auction creation, the app navigates to `/dashboard`**, not to the new auction's detail page. To get the auction ID, navigate to `/auctions` after creation, find the card by `img[alt]`, click it, and read the URL.
- **`waitForURL` predicates must not match the current URL.** On `/dashboard/auctions/new`, a predicate containing `"dashboard"` resolves immediately. Always use exact pathname checks: `url.pathname === '/dashboard'`.

---

## Skip Rules

Your checklist contains `> Claude Code: SKIP` or `> Claude Code note:` annotations. Follow them precisely:

- If a section or block is marked `SKIP`, wrap every test in that block with `test.skip()` and include the reason as a comment.
- If a note describes a constraint or limitation (e.g. automatic archiving, placeholder payment processor), incorporate that understanding into how you write the test — do not skip unless explicitly told to.
- Honor the following known skips without needing to be told:
  - New User Creation (requires real email inbox)
  - Subscription initial purchase (requires real Stripe account)
  - Failed checkout (placeholder processor always succeeds)
  - Auction archive cycle (automatic, not a user action — test only the immediate post-close state)

---

## File Format Rules

- Import from `../../fixtures/auth.js`, not directly from `@playwright/test`
- Use `test.describe` blocks matching the checklist section name exactly
- Each checklist checkbox = one `test()` block
- Skipped items = `test.skip()` with a comment explaining why
- Selectors must be real — navigate the app to confirm them before writing
- Use `user1Page` for seller/initiator actions, `user2Page` for buyer/responder actions
- Where a test requires both users, open both fixtures and label actions clearly in comments

---

## Output

Write the completed file to `tests/e2e/[section-name].spec.js`.

Confirm the file was written and state:
- The file path
- How many `test()` blocks were written
- How many `test.skip()` blocks were written and why

---

## Section to Generate

[SECTION NAME WILL BE PASSED HERE]
