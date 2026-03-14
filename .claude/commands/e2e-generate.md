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
5. Confirm the browser launches successfully before writing any file

---

## Execution Rules

- Generate ONLY the section passed to you. Do not generate other sections.
- Navigate the live app using Playwright to discover real selectors, URLs, and flows before writing any test. Do not guess selectors.
- Each test must be fully independent — no test may rely on state created by another test.
- Keep sessions separate when both users are needed. Do not mix credentials between roles in the same flow.

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
