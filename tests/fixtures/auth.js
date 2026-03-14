
import { test as base } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

function loadEnvFileIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const cwd = process.cwd();
loadEnvFileIfPresent(path.resolve(cwd, '.env.test'));
loadEnvFileIfPresent(path.resolve(cwd, 'server/.env.test'));

function getRequiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. ` +
        `Set it in process env or in .env.test / server/.env.test before running Playwright.`
    );
  }
  return value;
}

async function signIn(page, emailKey, passwordKey) {
  await page.goto('/auth/sign-in');
  await page.fill('#email-input', getRequiredEnv(emailKey));
  await page.fill('#password-input', getRequiredEnv(passwordKey));
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  } catch {
    throw new Error(
      `Sign-in did not reach /dashboard for ${emailKey}. ` +
        `Verify credentials and ensure both client (3000) and server (7890) are running.`
    );
  }
}

export const test = base.extend({
  user1Page: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, 'USER1_EMAIL', 'USER1_PASSWORD');
    await use(page);
    await context.close();
  },

  user2Page: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, 'USER2_EMAIL', 'USER2_PASSWORD');
    await use(page);
    await context.close();
  },
});
export { expect } from '@playwright/test';
