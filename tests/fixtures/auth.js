
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

const user1StatePath = path.resolve(cwd, 'tests/.auth/user1.json');
const user2StatePath = path.resolve(cwd, 'tests/.auth/user2.json');

export const test = base.extend({
  user1Page: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: user1StatePath });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  user2Page: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: user2StatePath });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
export { expect } from '@playwright/test';
