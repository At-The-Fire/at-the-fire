import { test, expect } from '../fixtures/auth.js';

// Minimal valid 1×1 PNG (base64-encoded) for upload tests
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

async function navigateToProfile(page) {
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByRole('menuitem', { name: 'Profile' }).click();
  await page.waitForURL('**/profile/**');
}

async function openEditMode(page) {
  await page.getByText('Edit').click();
  await page.getByRole('button', { name: 'Save Changes' }).waitFor();
}

test.describe('Profile CRUD', () => {
  test('Upload avatar — supported file types accepted (PNG and JPEG)', async ({ user1Page: page }) => {
    await navigateToProfile(page);
    await openEditMode(page);

    // Upload a valid PNG
    const avatarInput = page.locator('input[name="avatar"]');
    await avatarInput.setInputFiles({
      name: 'test-avatar.png',
      mimeType: 'image/png',
      buffer: MINIMAL_PNG,
    });

    // No error toast should appear for a valid file
    await expect(page.getByText('Only JPG and PNG files are allowed')).not.toBeVisible();
    await expect(page.getByText('File size too large')).not.toBeVisible();

    // Upload a valid JPEG
    await avatarInput.setInputFiles({
      name: 'test-avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: MINIMAL_PNG,
    });

    await expect(page.getByText('Only JPG and PNG files are allowed')).not.toBeVisible();
    await expect(page.getByText('File size too large')).not.toBeVisible();
  });

  test('Upload avatar — unsupported file type rejected with toast warning', async ({ user1Page: page }) => {
    await navigateToProfile(page);
    await openEditMode(page);

    const avatarInput = page.locator('input[name="avatar"]');
    await avatarInput.setInputFiles({
      name: 'test-avatar.gif',
      mimeType: 'image/gif',
      buffer: MINIMAL_PNG,
    });

    await expect(page.getByText('Only JPG and PNG files are allowed')).toBeVisible();
  });

  test('Upload avatar — file size limit enforced (> 10MB rejected with toast)', async ({ user1Page: page }) => {
    await navigateToProfile(page);
    await openEditMode(page);

    // 11 MB buffer exceeds the 10 MB limit
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 0xff);
    const avatarInput = page.locator('input[name="avatar"]');
    await avatarInput.setInputFiles({
      name: 'large-avatar.png',
      mimeType: 'image/png',
      buffer: largeBuffer,
    });

    await expect(page.getByText('File size too large, must be less than 10mb')).toBeVisible();
  });

  test('Replace avatar — upload a new image after one already exists', async ({ user1Page: page }) => {
    await navigateToProfile(page);
    await openEditMode(page);

    // Upload first avatar and save
    const avatarInput = page.locator('input[name="avatar"]');
    await avatarInput.setInputFiles({ name: 'avatar-v1.png', mimeType: 'image/png', buffer: MINIMAL_PNG });
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForLoadState('networkidle');

    // Re-enter edit mode and upload a replacement image
    await openEditMode(page);
    const avatarInputV2 = page.locator('input[name="avatar"]');
    await avatarInputV2.setInputFiles({ name: 'avatar-v2.png', mimeType: 'image/png', buffer: MINIMAL_PNG });
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForLoadState('networkidle');

    // Profile should still be in view mode after saving replacement
    await expect(page.getByText('Edit')).toBeVisible();
  });

  test('Fill in all text fields — optional fields can be cleared and saved', async ({ user1Page: page }) => {
    await navigateToProfile(page);
    await openEditMode(page);

    // Required per UI hint: name fields ("Add your name and avatar (required)")
    await page.getByRole('textbox', { name: 'First Name' }).fill('E2E');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Test User');

    // Optional: all remaining text fields
    await page.getByRole('textbox', { name: 'Display Name' }).fill('E2E Test User');
    await page.getByRole('textbox', { name: 'http://' }).fill('atthefire.com');
    await page.getByRole('textbox', { name: 'instagram.com/' }).fill('atthefire_test');
    await page.getByRole('textbox', { name: 'facebook.com/' }).fill('atthefire_test');
    await page.getByRole('textbox', { name: 'glasspass.com/users/' }).fill('atthefire_test');
    await page.getByRole('textbox', { name: 'tiktok.com/' }).fill('atthefire_test');
    await page.getByRole('textbox', { name: 'Bio' }).fill('E2E test bio entry updated');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForLoadState('networkidle');

    // Should return to view mode (edit button visible again) — no save error
    await expect(page.getByText('Edit')).toBeVisible();
  });

  test('Edit all text fields — changes persist after save and page reload', async ({ user1Page: page }) => {
    await navigateToProfile(page);
    await openEditMode(page);

    // Update all text fields to known test values
    await page.getByRole('textbox', { name: 'First Name' }).fill('E2E');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Test User');
    await page.getByRole('textbox', { name: 'Display Name' }).fill('E2E Test User');
    await page.getByRole('textbox', { name: 'http://' }).fill('atthefire.com');
    await page.getByRole('textbox', { name: 'instagram.com/' }).fill('atthefire_test');
    await page.getByRole('textbox', { name: 'facebook.com/' }).fill('atthefire_test');
    await page.getByRole('textbox', { name: 'glasspass.com/users/' }).fill('atthefire_test');
    await page.getByRole('textbox', { name: 'tiktok.com/' }).fill('atthefire_test');
    await page.getByRole('textbox', { name: 'Bio' }).fill('E2E test bio entry updated');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForLoadState('networkidle');

    // Reload to verify persistence (not just in-memory state)
    await page.reload();

    await expect(page.getByRole('heading', { level: 4 })).toContainText('E2E Test User');
    await expect(page.getByText('E2E test bio entry updated')).toBeVisible();
    await expect(page.locator('a[href*="instagram.com/atthefire_test"]')).toBeVisible();
    await expect(page.locator('a[href*="facebook.com/atthefire_test"]')).toBeVisible();
    await expect(page.locator('a[href*="glasspass.com/users/atthefire_test"]')).toBeVisible();
    await expect(page.locator('a[href*="tiktok.com/atthefire_test"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'atthefire.com' })).toBeVisible();
  });
});
