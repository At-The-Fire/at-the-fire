import { test, expect } from '../fixtures/auth.js';

/**
 * My Purchases — E2E tests
 *
 * Page lives at /my-purchases, reached via avatar menu → "Purchases".
 * The page heading is "My Orders" (h4).
 * Three sections (desktop, shown as h6 headings + divider):
 *   - Gallery Purchases
 *   - Active Bids
 *   - Won Auctions
 *
 * USER2 (buyer / knailgear@gmail.com) has:
 *   - 0 gallery purchases
 *   - 0 active bids
 *   - 4 won auctions (incl. BIN and bid wins)
 *
 * Badge logic (UserMenu.js):
 *   - Avatar shows combined numeric badge when unreadWonCount + unreadOutbidCount > 0
 *   - "Purchases" menuitem gets class "shimmer" + coloured won/outbid spans
 *   - markAllRead() fires on MyPurchases mount → clears server-side read state
 */

test.describe('My Purchases', () => {
  // ─────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────
  test.describe('Navigation', () => {
    test('avatar menu contains a Purchases item that navigates to /my-purchases', async ({
      user2Page: page,
    }) => {
      await page.goto('/dashboard');
      await page.click('button[aria-label="Open settings"]');
      await expect(page.getByRole('menuitem', { name: 'Purchases' })).toBeVisible();
      await page.getByRole('menuitem', { name: 'Purchases' }).click();
      await expect(page).toHaveURL(/\/my-purchases/);
    });

    test('direct navigation to /my-purchases loads the page', async ({ user2Page: page }) => {
      await page.goto('/my-purchases');
      // Page heading is "My Orders"
      await expect(page.getByRole('heading', { name: 'My Orders', level: 4 })).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // View purchase history
  // ─────────────────────────────────────────────
  test.describe('View purchase history', () => {
    test('page shows the three section headings', async ({ user2Page: page }) => {
      await page.goto('/my-purchases');
      await expect(page.getByRole('heading', { name: 'My Orders', level: 4 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Gallery Purchases' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Active Bids' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Won Auctions' })).toBeVisible();
    });

    test('Gallery Purchases section renders (USER2 has no gallery purchases — shows empty state)', async ({
      user2Page: page,
    }) => {
      await page.goto('/my-purchases');
      await expect(page.getByRole('heading', { name: 'Gallery Purchases' })).toBeVisible();
      // USER2 has no gallery purchases — empty state message expected
      await expect(page.getByText('No purchases yet.')).toBeVisible();
    });

    test('Active Bids section renders (USER2 has no active bids — shows empty state)', async ({
      user2Page: page,
    }) => {
      await page.goto('/my-purchases');
      await expect(page.getByRole('heading', { name: 'Active Bids' })).toBeVisible();
      await expect(page.getByText('No active bids.')).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // Auction purchases
  // ─────────────────────────────────────────────
  test.describe('Auction purchases', () => {
    test('Won Auctions section renders a table with correct column headers', async ({
      user2Page: page,
    }) => {
      await page.goto('/my-purchases');
      await expect(page.getByRole('heading', { name: 'Won Auctions' })).toBeVisible();
      // Table should be visible (USER2 has won auctions)
      const table = page.locator('table').last();
      await expect(table).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Item' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Final Bid' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Won On' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Payment' })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: 'Tracking' })).toBeVisible();
    });

    test('won auction appears in the Won Auctions table with title, price, date, and payment status', async ({
      user2Page: page,
    }) => {
      await page.goto('/my-purchases');
      // E2E Test Auction Rig — won via bid, $150, Mar 12 2026
      const rigRow = page.getByRole('row', { name: /E2E Test Auction Rig/i });
      await expect(rigRow).toBeVisible();
      await expect(rigRow.getByText('$150.00')).toBeVisible();
      await expect(rigRow.getByText('Mar 12, 2026')).toBeVisible();
      await expect(rigRow.getByText('Unpaid')).toBeVisible();
    });

    test('buy-it-now auction purchase appears in the Won Auctions table', async ({
      user2Page: page,
    }) => {
      await page.goto('/my-purchases');
      // E2E Test Auction Live — BIN purchase at $100
      const binRow = page.getByRole('row', { name: /E2E Test Auction Live/i });
      await expect(binRow).toBeVisible();
      await expect(binRow.getByText('$100.00')).toBeVisible();
      await expect(binRow.getByText('Mar 12, 2026')).toBeVisible();
      await expect(binRow.getByText('Unpaid')).toBeVisible();
    });

    test('won auction row shows a tracking link when tracking number is present', async ({
      user2Page: page,
    }) => {
      await page.goto('/my-purchases');
      // E2E Test Auction Rig has tracking number E2ETEST123456789
      const rigRow = page.getByRole('row', { name: /E2E Test Auction Rig/i });
      const trackingLink = rigRow.getByRole('link', { name: /E2ETEST123456789/i });
      await expect(trackingLink).toBeVisible();
      const href = await trackingLink.getAttribute('href');
      expect(href).toContain('E2ETEST123456789');
    });
  });

  // ─────────────────────────────────────────────
  // Won/outbid badge clears on visit
  // ─────────────────────────────────────────────
  test.describe('Won/outbid badge clears on visit', () => {
    test.skip(
      'badge is visible in avatar menu BEFORE navigating to Purchases (requires pending won/outbid state)',
      async ({ user2Page: page }) => {
        // This test requires unreadWonCount > 0 or unreadOutbidCount > 0 at test time.
        // Those counts are cleared server-side by markAllRead() on every /my-purchases mount,
        // and only restored when a new auction-ended/user-outbid WebSocket event fires.
        // Cannot be reliably asserted without triggering an auction event in the test.
        //
        // To test manually: place a bid, get outbid by another user, then check the avatar badge.
      }
    );

    test('after navigating to /my-purchases, no won/outbid badge appears on the avatar', async ({
      user2Page: page,
    }) => {
      await page.goto('/my-purchases');
      // Wait for markAllRead to fire (triggered on mount)
      await expect(page.getByRole('heading', { name: 'My Orders', level: 4 })).toBeVisible();

      // Open avatar menu — Purchases item should NOT have shimmer class or won/outbid counts
      await page.click('button[aria-label="Open settings"]');
      const purchasesItem = page.getByRole('menuitem', { name: /Purchases/i });
      await expect(purchasesItem).toBeVisible();

      // The won/outbid spans only render when counts > 0
      await expect(purchasesItem.locator('span').filter({ hasText: /won/ })).toHaveCount(0);
      await expect(purchasesItem.locator('span').filter({ hasText: /outbid/ })).toHaveCount(0);
    });

    test('avatar badge count is absent after visiting /my-purchases', async ({
      user2Page: page,
    }) => {
      await page.goto('/my-purchases');
      await expect(page.getByRole('heading', { name: 'My Orders', level: 4 })).toBeVisible();

      // The avatar badge only renders when totalBadgeCount > 0 (unreadCount + won + outbid)
      // After markAllRead() fires, won/outbid counts are 0.
      // The MUI Badge badgeContent is null when count is 0 — badge element absent.
      // We check that no numeric badge overlays the avatar button.
      const avatarButton = page.getByRole('button', { name: 'Open settings' });
      await expect(avatarButton).toBeVisible();
      // The badge Typography only renders when totalBadgeCount > 0
      const badgeText = avatarButton.locator('.MuiBadge-badge');
      // Either hidden/absent or showing 0 — should not show a positive number
      const count = await badgeText.count();
      if (count > 0) {
        const text = await badgeText.textContent();
        const num = parseInt(text?.trim() || '0', 10);
        expect(num).toBe(0);
      }
    });

    test.skip(
      'badge does not reappear after sign out and back in (requires prior won/outbid state)',
      async ({ user2Page: page }) => {
        // After markAllRead() fires, the server marks notifications read.
        // On next login the badge should NOT reappear unless a new event occurred.
        // This test is skipped because we cannot guarantee a fresh won/outbid state
        // at test time without orchestrating a live auction completion.
      }
    );
  });
});
