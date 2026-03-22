import { test, expect } from '../fixtures/auth.js';
import * as path from 'node:path';
import { request as playwrightRequest } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test item — created in beforeAll, deleted in afterAll
// ---------------------------------------------------------------------------

const cwd = process.cwd();
const user1StatePath = path.resolve(cwd, 'tests/.auth/user1.json');

const API_BASE = process.env.BASE_URL || 'http://localhost:7890';

const TEST_ITEM = {
  title: 'E2E Checkout Marble',
  description: 'E2E test item for checkout flows — do not buy manually.',
  image_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  category: 'Marbles',
  price: 50,
  public_id: 'e2e_checkout_marble_test',
  num_imgs: 1,
  sold: false,
  date_sold: null,
  quantity: 10,
  shippingCost: 8,
};

let testItemId = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to the public gallery and wait for cards to render. */
async function goToGallery(page) {
  await page.goto('/');
  await page.locator('.gallery-item').first().waitFor({ timeout: 10000 });
}

/**
 * Find the first purchasable gallery card (has a visible Buy Now button).
 * Returns the card locator, or null if none found.
 */
async function findFirstPurchasableCard(page) {
  const cards = page.locator('.gallery-item');
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const btn = card.getByRole('button', { name: 'Buy Now' });
    if (await btn.isVisible()) return card;
  }
  return null;
}

/** Navigate to the E2E Checkout Marble post detail. */
async function goToCheckoutMarbleDetail(page) {
  await page.goto(`/gallery/${testItemId}`);
  await page.getByRole('heading', { name: 'E2E Checkout Marble' }).waitFor({ timeout: 10000 });
}

/** Fill in and submit the placeholder payment form on /checkout. */
async function completePayment(page) {
  await page.getByLabel('Card number').fill('4111 1111 1111 1111');
  await page.getByLabel('MM/YY').fill('12/30');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: 'Place order' }).click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Buy Now & Checkout', () => {
  test.beforeAll(async () => {
    // Create the test item via API so tests are self-contained.
    const apiRequest = await playwrightRequest.newContext({
      storageState: user1StatePath,
      baseURL: API_BASE,
    });

    const res = await apiRequest.post('/api/v1/dashboard/', {
      data: TEST_ITEM,
    });

    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`Failed to create test item: ${res.status()} — ${body}`);
    }

    const created = await res.json();
    testItemId = created.id;
    await apiRequest.dispose();
  });

  test.afterAll(async () => {
    if (!testItemId) return;

    const apiRequest = await playwrightRequest.newContext({
      storageState: user1StatePath,
      baseURL: API_BASE,
    });

    await apiRequest.delete(`/api/v1/dashboard/${testItemId}`);
    await apiRequest.dispose();
    testItemId = null;
  });

  // =========================================================================
  // Buy Now from gallery card
  // =========================================================================
  test.describe('Buy Now from gallery card', () => {
    test('Buy Now button is visible on purchasable items', async ({ user2Page: page }) => {
      await goToGallery(page);

      // Target the known test item directly — avoids timing issues with findFirstPurchasableCard
      const testCard = page.locator('.gallery-item').filter({ hasText: 'E2E Checkout Marble' });
      await expect(testCard.first()).toBeVisible({ timeout: 15_000 });
      await expect(testCard.first().getByRole('button', { name: 'Buy Now' })).toBeVisible();
    });

    test('Buy Now button is not shown on sold items', async ({ user2Page: page }) => {
      await goToGallery(page);

      const soldCards = page.locator('.gallery-item').filter({ has: page.getByText('SOLD') });
      const count = await soldCards.count();

      // Skip if no sold items are currently in the gallery (environment-dependent)
      if (count === 0) {
        test.skip();
        return;
      }

      for (let i = 0; i < count; i++) {
        await expect(soldCards.nth(i).getByRole('button', { name: 'Buy Now' })).not.toBeAttached();
      }
    });

    test('Click Buy Now on gallery card — navigates to post detail page (intentional: quantity selector lives there)', async ({
      user2Page: page,
    }) => {
      await goToGallery(page);

      const purchasableCard = await findFirstPurchasableCard(page);
      if (!purchasableCard) {
        test.skip();
        return;
      }

      await purchasableCard.getByRole('button', { name: 'Buy Now' }).click();

      // GalleryCard.handleBuyNow navigates to /gallery/${item.id} — NOT /checkout.
      await page.waitForURL(/\/gallery\/\d+/);
      // Post detail page should have loaded
      await expect(page.getByRole('button', { name: 'Buy Now' })).toBeVisible({ timeout: 10_000 });
    });
  });

  // =========================================================================
  // Buy Now from post detail
  // =========================================================================
  test.describe('Buy Now from post detail', () => {
    test('Select quantity from dropdown and click Buy Now — checkout shows correct item and quantity', async ({
      user2Page: page,
    }) => {
      await goToCheckoutMarbleDetail(page);

      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: '2' }).click();

      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');

      await expect(page.getByText('E2E Checkout Marble × 2')).toBeVisible();
      await expect(page.getByText('$108').first()).toBeVisible();
    });
  });

  // =========================================================================
  // Checkout page
  // =========================================================================
  test.describe('Checkout', () => {
    test('Order summary shows correct item, quantity, and total', async ({ user2Page: page }) => {
      await goToCheckoutMarbleDetail(page);
      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');

      await expect(page.getByRole('heading', { name: 'Order Summary' })).toBeVisible();
      await expect(page.getByText('E2E Checkout Marble × 1')).toBeVisible();
      await expect(page.getByText('$50')).toBeVisible();
      await expect(page.getByText('Total', { exact: true })).toBeVisible();
    });

    test('Shipping cost appears as a line item when shipping > $0', async ({ user2Page: page }) => {
      await goToCheckoutMarbleDetail(page);
      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');

      await expect(page.getByText('Shipping')).toBeVisible();
      await expect(page.getByText('$8')).toBeVisible();
    });

    test('Total = item price × quantity + shipping', async ({ user2Page: page }) => {
      await goToCheckoutMarbleDetail(page);
      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');

      const totalEl = page.getByText('$58').last();
      await expect(totalEl).toBeVisible();
    });

    test('Complete checkout — redirects to /my-purchases with new purchase visible', async ({
      user2Page: page,
    }) => {
      await goToCheckoutMarbleDetail(page);
      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');

      await completePayment(page);

      await page.waitForURL('**/my-purchases', { timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'My Orders' })).toBeVisible();
      await expect(page.getByText('E2E Checkout Marble')).toBeVisible();
    });

    test('Inventory is decremented after purchase', async ({ user2Page: page }) => {
      await goToCheckoutMarbleDetail(page);

      const stockText = await page.getByText(/in stock/).textContent();
      const stockBefore = parseInt(stockText, 10);
      expect(stockBefore).toBeGreaterThan(0);

      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');
      await completePayment(page);
      await page.waitForURL('**/my-purchases', { timeout: 15000 });

      await goToCheckoutMarbleDetail(page);
      const updatedStockText = await page.getByText(/in stock/).textContent();
      const stockAfter = parseInt(updatedStockText, 10);
      expect(stockAfter).toBe(stockBefore - 1);
    });

    test('Purchase record is created in My Orders', async ({ user2Page: page }) => {
      await goToCheckoutMarbleDetail(page);
      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');
      await completePayment(page);
      await page.waitForURL('**/my-purchases', { timeout: 15000 });

      await expect(page.getByRole('cell', { name: 'E2E Checkout Marble' }).first()).toBeVisible();
    });
  });

  // =========================================================================
  // Navigate to /checkout directly (no item state)
  // =========================================================================
  test.describe('Direct /checkout navigation (no item state)', () => {
    test('Shows "Nothing to purchase" message with Browse Gallery button when navigated to directly', async ({
      user2Page: page,
    }) => {
      await page.goto('/checkout');
      await expect(page.getByText('Nothing to purchase.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Browse Gallery' })).toBeVisible();
    });

    test('Browse Gallery button on empty checkout navigates to the gallery', async ({
      user2Page: page,
    }) => {
      await page.goto('/checkout');
      await page.getByRole('button', { name: 'Browse Gallery' }).click();
      await page.waitForURL('**/', { timeout: 10000 });
      await expect(page).toHaveURL(/\/$/);
    });
  });

  // =========================================================================
  // Failed checkout
  // =========================================================================
  test.describe('Failed checkout', () => {
    test.skip('Inventory is not decremented on payment failure — SKIP: placeholder processor always succeeds; no failure path exists until a real payment processor is integrated', async () => {});
    test.skip('Error message is displayed on payment failure — SKIP: placeholder processor always succeeds; no failure path exists until a real payment processor is integrated', async () => {});
  });
});
