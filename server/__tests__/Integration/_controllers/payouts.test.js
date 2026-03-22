const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

const mockAdmin = {
  sub: process.env.TEST_SUB_FULL_CUSTOMER,
  customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
};

const mockSeller = {
  sub: process.env.TEST_SUB_WITH_PROFILE,
  customerId: process.env.TEST_STRIPE_CUSTOMER_ID_WITH_PROFILE || 'non_admin_customer',
};

const authState = { user: null };

jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.userAWSSub = authState.user?.sub;
  req.customerId = authState.user?.customerId;
  next();
});

describe('Payouts routes', () => {
  const seedPaidAuctionResult = async ({
    sellerSub,
    winnerSub,
    sellerNet = 108,
    platformFee = 12,
  }) => {
    const { rows: auctionRows } = await pool.query(
      `
      INSERT INTO auctions (
        title, description, image_urls, start_price, buy_now_price,
        current_bid, start_time, end_time, is_active, seller_sub, shipping_cost
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
      `,
      [
        'Payout Auction',
        'Auction for payout tests',
        ['https://example.com/a.jpg'],
        100,
        500,
        120,
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(Date.now() - 30 * 60 * 1000),
        false,
        sellerSub,
        0,
      ],
    );

    await pool.query(
      `
      INSERT INTO auction_results (
        auction_id, winner_sub, final_bid, closed_reason, is_paid, seller_net, platform_fee
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [auctionRows[0].id, winnerSub, 120, 'expired', true, sellerNet, platformFee],
    );

    return auctionRows[0].id;
  };

  beforeEach(async () => {
    authState.user = mockAdmin;
    await setup(pool);
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  describe('GET /api/v1/payouts/summary', () => {
    it('returns seller summaries for admin', async () => {
      await pool.query(
        `
        INSERT INTO purchases (
          buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid,
          status, seller_net, platform_fee
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [mockAdmin.sub, mockSeller.sub, 'gallery_post', 1, 1, 100, 'completed', 90, 10],
      );

      const response = await request(app).get('/api/v1/payouts/summary');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((row) => row.seller_sub === mockSeller.sub)).toBe(true);
    });

    it('returns 403 for non-admin', async () => {
      authState.user = mockSeller;

      const response = await request(app).get('/api/v1/payouts/summary');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You do not have permission: access denied');
    });
  });

  describe('GET /api/v1/payouts', () => {
    it('returns payout history for admin', async () => {
      await pool.query(
        `
        INSERT INTO seller_payouts (seller_sub, amount, period_start, period_end, notes, paid_by_sub)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [mockSeller.sub, 100, '2026-03-01', '2026-03-15', 'Existing payout', mockAdmin.sub],
      );

      const response = await request(app).get('/api/v1/payouts');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].seller_sub).toBe(mockSeller.sub);
      expect(Number(response.body[0].amount)).toBe(100);
    });
  });

  describe('POST /api/v1/payouts', () => {
    it('creates payout and stamps eligible purchases and paid auctions', async () => {
      await pool.query(
        `
        INSERT INTO purchases (
          buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid,
          status, seller_net, platform_fee
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [mockAdmin.sub, mockSeller.sub, 'gallery_post', 1, 1, 100, 'completed', 90, 10],
      );

      const auctionId = await seedPaidAuctionResult({
        sellerSub: mockSeller.sub,
        winnerSub: mockAdmin.sub,
      });

      const response = await request(app).post('/api/v1/payouts').send({
        sellerSub: mockSeller.sub,
        amount: 198,
        periodStart: '2026-03-01',
        periodEnd: '2026-03-15',
        notes: 'Biweekly payout',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.seller_sub).toBe(mockSeller.sub);
      expect(Number(response.body.amount)).toBe(198);

      const payoutId = response.body.id;

      const { rows: purchaseRows } = await pool.query(
        'SELECT payout_id FROM purchases WHERE seller_sub = $1',
        [mockSeller.sub],
      );
      expect(purchaseRows.every((row) => Number(row.payout_id) === Number(payoutId))).toBe(true);

      const { rows: resultRows } = await pool.query(
        'SELECT payout_id FROM auction_results WHERE auction_id = $1',
        [auctionId],
      );
      expect(Number(resultRows[0].payout_id)).toBe(Number(payoutId));
    });

    it('returns 400 when sellerSub is missing', async () => {
      const response = await request(app).post('/api/v1/payouts').send({ amount: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('sellerSub is required');
    });

    it('returns 400 when amount is not positive', async () => {
      const response = await request(app)
        .post('/api/v1/payouts')
        .send({ sellerSub: mockSeller.sub, amount: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('amount must be a positive number');
    });
  });

  describe('GET /api/v1/payouts/my-earnings', () => {
    it('returns pending balance, total paid out, and seller payout history', async () => {
      const { rows: existingPayoutRows } = await pool.query(
        `
        INSERT INTO seller_payouts (seller_sub, amount, period_start, period_end, notes, paid_by_sub)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, amount
        `,
        [mockSeller.sub, 60, '2026-03-01', '2026-03-15', 'Payout history row', mockAdmin.sub],
      );
      const existingPayoutId = existingPayoutRows[0].id;

      await pool.query(
        `
        INSERT INTO purchases (
          buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid,
          status, seller_net, platform_fee, payout_id
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL),
          ($1, $2, $3, $4, $5, $6, $7, $10, $9, $11)
        `,
        [
          mockAdmin.sub,
          mockSeller.sub,
          'gallery_post',
          1,
          1,
          100,
          'completed',
          60,
          10,
          40,
          existingPayoutId,
        ],
      );

      await seedPaidAuctionResult({
        sellerSub: mockSeller.sub,
        winnerSub: mockAdmin.sub,
        sellerNet: 30,
        platformFee: 5,
      });

      const auctionPaidOutId = await seedPaidAuctionResult({
        sellerSub: mockSeller.sub,
        winnerSub: mockAdmin.sub,
        sellerNet: 20,
        platformFee: 5,
      });
      await pool.query('UPDATE auction_results SET payout_id = $2 WHERE auction_id = $1', [
        auctionPaidOutId,
        existingPayoutId,
      ]);

      authState.user = mockSeller;
      const response = await request(app).get('/api/v1/payouts/my-earnings');

      expect(response.status).toBe(200);
      expect(response.body.pendingBalance).toBe(90); // 60 purchase + 30 auction
      expect(response.body.totalPaidOut).toBe(60); // 40 purchase + 20 auction
      expect(Array.isArray(response.body.payouts)).toBe(true);
      expect(response.body.payouts).toHaveLength(1);
      expect(Number(response.body.payouts[0].amount)).toBe(60);
    });
  });
});
