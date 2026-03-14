import { test, expect } from '../fixtures/auth.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to the public gallery and wait for cards to render. */
async function goToGallery(page) {
  await page.goto('/');
  // Wait for at least one gallery item card to appear
  await page.locator('.gallery-item').first().waitFor({ timeout: 10000 });
}

/** Navigate to the E2E Checkout Marble post detail and wait for it to load. */
async function goToCheckoutMarbleDetail(page) {
  await page.goto('/gallery/11');
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
  // =========================================================================
  // Buy Now from gallery card
  // =========================================================================
  test.describe('Buy Now from gallery card', () => {
    test('Buy Now button is visible on purchasable items', async ({ user2Page: page }) => {
      await goToGallery(page);

      // The E2E Checkout Marble item is purchasable (not sold, price > 0, qty > 0)
      // Its Buy Now button should be visible inside a gallery-item card
      const marbleCard = page
        .locator('.gallery-item')
        .filter({ has: page.getByText('E2E Checkout Marble') });
      await expect(marbleCard.getByRole('button', { name: 'Buy Now' })).toBeVisible();
    });

    test('Buy Now button is not shown on sold items', async ({ user2Page: page }) => {
      await goToGallery(page);

      // Sold items display a SOLD badge and have no Buy Now button.
      // The condition in GalleryCard: !item.sold && item.price > 0 && item.quantity > 0
      // Find a card with SOLD text and confirm it has no Buy Now button.
      const soldCards = page.locator('.gallery-item').filter({ has: page.getByText('SOLD') });
      const count = await soldCards.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        await expect(soldCards.nth(i).getByRole('button', { name: 'Buy Now' })).not.toBeAttached();
      }
    });

    test('Click Buy Now on gallery card — redirects to /checkout with correct item title and price', async ({
      user2Page: page,
    }) => {
      await goToGallery(page);

      const marbleCard = page
        .locator('.gallery-item')
        .filter({ has: page.getByText('E2E Checkout Marble') });

      await marbleCard.getByRole('button', { name: 'Buy Now' }).click();

      await page.waitForURL('**/checkout');

      // Order summary must show the item title and $50 price (qty 1 from card)
      await expect(page.getByText('E2E Checkout Marble × 1')).toBeVisible();
      await expect(page.getByText('$50')).toBeVisible();
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

      // Change quantity to 2 (post has 2 in stock).
      // The quantity selector is a MUI Select — click the combobox to open, then pick the option.
      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: '2' }).click();

      await page.getByRole('button', { name: 'Buy Now' }).click();

      await page.waitForURL('**/checkout');

      // Checkout should reflect qty = 2: "E2E Checkout Marble × 2" and total = 50*2 + 8 = $108
      await expect(page.getByText('E2E Checkout Marble × 2')).toBeVisible();
      await expect(page.getByText('$108')).toBeVisible();
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
      // Item line: qty 1 from detail page default
      await expect(page.getByText('E2E Checkout Marble × 1')).toBeVisible();
      // Price column for item subtotal
      await expect(page.getByText('$50')).toBeVisible();
      // Total line
      await expect(page.getByText('Total')).toBeVisible();
    });

    test('Shipping cost appears as a line item when shipping > $0', async ({ user2Page: page }) => {
      await goToCheckoutMarbleDetail(page);
      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');

      // E2E Checkout Marble has $8 shipping
      await expect(page.getByText('Shipping')).toBeVisible();
      await expect(page.getByText('$8')).toBeVisible();
    });

    test('Total = item price × quantity + shipping', async ({ user2Page: page }) => {
      await goToCheckoutMarbleDetail(page);
      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');

      // Price: $50, qty: 1, shipping: $8 → total: $58
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

      // Should redirect to /my-purchases after successful order
      await page.waitForURL('**/my-purchases', { timeout: 15000 });

      // My Purchases page heading
      await expect(page.getByRole('heading', { name: 'My Orders' })).toBeVisible();

      // The new purchase for "E2E Checkout Marble" should appear in the Gallery Purchases table
      await expect(page.getByText('E2E Checkout Marble')).toBeVisible();
    });

    test('Inventory is decremented after purchase', async ({ user2Page: page }) => {
      // Read stock before purchase by visiting the post detail
      await goToCheckoutMarbleDetail(page);

      // Capture the "X in stock" text
      const stockText = await page.getByText(/in stock/).textContent();
      const stockBefore = parseInt(stockText, 10);
      expect(stockBefore).toBeGreaterThan(0);

      // Buy 1 unit
      await page.getByRole('button', { name: 'Buy Now' }).click();
      await page.waitForURL('**/checkout');
      await completePayment(page);
      await page.waitForURL('**/my-purchases', { timeout: 15000 });

      // Navigate back to the post detail and check the updated stock
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

      // Verify there is at least one row in the Gallery Purchases table
      await expect(page.getByRole('cell', { name: 'E2E Checkout Marble' })).toBeVisible();
    });
  });

  // =========================================================================
  // Navigate to /checkout directly (no item state)
  // =========================================================================
  test.describe('Direct /checkout navigation (no item state)', () => {
    test('Shows "Nothing to purchase" message with Browse Gallery button when navigated to directly', async ({
      user2Page: page,
    }) => {
      // Navigate directly to /checkout — no location.state.item is provided,
      // so the component renders the empty state.
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
      // Gallery root should load
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
