import { chromium } from '@playwright/test';
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

async function saveStorageState(browser, baseURL, email, password, outPath) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto('/auth/sign-in');
  const emailInput = page.locator('#email-input');
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 });
  await emailInput.click();
  await emailInput.fill(email);
  const passwordInput = page.locator('#password-input');
  await passwordInput.click();
  await passwordInput.fill(password);
  await page.locator('[data-testid="submit-button"]').click();

  try {
    await page.waitForURL(/\/(dashboard|profile\/)/, { timeout: 30_000 });
  } catch {
    throw new Error(`Global setup sign-in failed for ${email}. URL: ${page.url()}`);
  }

  await context.storageState({ path: outPath });
  await context.close();
}

export default async function globalSetup() {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const authDir = path.resolve(cwd, 'tests/.auth');
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();

  await saveStorageState(
    browser,
    baseURL,
    process.env.USER1_EMAIL,
    process.env.USER1_PASSWORD,
    path.join(authDir, 'user1.json')
  );

  await saveStorageState(
    browser,
    baseURL,
    process.env.USER2_EMAIL,
    process.env.USER2_PASSWORD,
    path.join(authDir, 'user2.json')
  );

  await browser.close();
}
