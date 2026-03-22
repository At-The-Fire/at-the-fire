import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const isLocalTarget = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');

export default defineConfig({
  globalSetup: './tests/global-setup.js',
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  maxFailures: process.env.CI ? 0 : 0,
  // Only start local dev servers when targeting localhost.
  // When BASE_URL points to a remote env (e.g. Heroku), skip this entirely.
  webServer: isLocalTarget
    ? [
        {
          command: 'npm run start --prefix server',
          url: 'http://localhost:7890',
          name: 'api',
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: 'npm run start --prefix client',
          url: 'http://localhost:3000',
          name: 'web',
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
      ]
    : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  timeout: 90_000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: process.env.PW_HEADED === '1' ? false : true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 8_000,
    navigationTimeout: 30_000,
  },
  // BROWSER STRATEGY
  // Default: Chromium only. Rationale:
  //   - These are functional E2E tests (logic, state, API) — not CSS/rendering tests.
  //   - React SPA behavior is consistent across browsers; JS engine differences are rare.
  //   - Running all 3 browsers multiplies test count 3×, increasing runtime and server load.
  //   - With fullyParallel:true, multi-browser runs fire concurrent requests to the same
  //     Heroku dev account, which triggers HTTP 429 rate limits on upload endpoints.
  //
  // When to re-enable Firefox/WebKit:
  //   - Pre-release cross-browser smoke runs (add them back temporarily)
  //   - If a Safari- or Firefox-specific bug is reported in production
  //   - Visual/CSS regression checks (pair with a visual diffing tool)
  //   - Running against localhost (no rate limit risk; less latency)
  //
  // To run all 3 browsers one-off:
  //   npx playwright test --project=chromium --project=firefox --project=webkit
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
