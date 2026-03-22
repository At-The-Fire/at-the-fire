const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

// Mock bidder users
// sub_withProfile and sub_partialProfile are seeded in setup.sql and have cognito_users rows,
// which are required for the GET /:id profile JOIN.
const mockBidder1 = {
  email: 'withProfile@example.com',
  sub: process.env.TEST_SUB_WITH_PROFILE,
  customer_id: null,
};

const mockBidder2 = {
  email: 'partialProfile@example.com',
  sub: process.env.TEST_SUB_INCOMPLETE_PROFILE,
  customer_id: 'stripe-customer-id_partialProfile',
};

// Mutable auth state — swap per-test; reset to mockBidder1 in beforeEach
const authState = { user: null };

jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.userAWSSub = authState.user?.sub;
  next();
});

jest.mock('../../../lib/jobs/auctionTimers.js', () => ({
  scheduleAuctionEnd: jest.fn(),
  cancelAuctionEnd: jest.fn(),
  initAuctionTimers: jest.fn(),
  EXTENSION_MS: 5 * 60 * 1000,
  EXTENSION_WINDOW_MS: 60 * 1000,
}));

describe('Bids routes', () => {
  let testAuctionId;

  beforeEach(async () => {
    authState.user = mockBidder1;

    await setup(pool);

    // Create a test auction owned by sub_fullCustomer (a separate seller, not a bidder)
    const { rows } = await pool.query(
      `
      INSERT INTO auctions (
        title, description, image_urls, start_price, buy_now_price,
        current_bid, start_time, end_time, is_active, seller_sub
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        'Test Auction',
        'Test Description',
        ['https://test.com/image1.jpg'],
        100,
        500,
        null,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        true,
        process.env.TEST_SUB_FULL_CUSTOMER,
      ],
    );
    testAuctionId = rows[0].id;
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  describe('GET /api/v1/bids/:id', () => {
    it('returns bids with user profile data for an auction (public)', async () => {
      // Seed a bid so there is something to return
      await pool.query(
        `
        INSERT INTO bids (auction_id, bidder_sub, bid_amount)
        VALUES ($1, $2, $3)
        `,
        [testAuctionId, process.env.TEST_SUB_WITH_PROFILE, 150],
      );

      const response = await request(app).get(`/api/v1/bids/${testAuctionId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: '1',
          auctionId: '1',
          bidAmount: '150',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          user: { firstName: 'First', imageUrl: 'image_url_path' },
        },
      ]);
    });

    it('returns empty array when auction has no bids', async () => {
      const response = await request(app).get(`/api/v1/bids/${testAuctionId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns bids sorted by bid_amount descending', async () => {
      await pool.query(
        `
        INSERT INTO bids (auction_id, bidder_sub, bid_amount)
        VALUES ($1, $2, $3), ($1, $4, $5)
        `,
        [
          testAuctionId,
          process.env.TEST_SUB_WITH_PROFILE,
          150,
          process.env.TEST_SUB_INCOMPLETE_PROFILE,
          250,
        ],
      );

      const response = await request(app).get(`/api/v1/bids/${testAuctionId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: expect.any(String),
          auctionId: expect.any(String),
          bidAmount: '250',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          user: { firstName: '', imageUrl: '' },
        },
        {
          id: expect.any(String),
          auctionId: expect.any(String),
          bidAmount: '150',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          user: { firstName: 'First', imageUrl: 'image_url_path' },
        },
      ]);
    });
  });

  describe('POST /api/v1/bids', () => {
    it('places a bid successfully and returns 201', async () => {
      const response = await request(app).post('/api/v1/bids').send({
        auctionId: testAuctionId,
        bidderSub: process.env.TEST_SUB_WITH_PROFILE,
        bidAmount: 150,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Bid placed successfully',
        bid: {
          id: expect.any(String),
          auctionId: testAuctionId,
          bidderSub: process.env.TEST_SUB_WITH_PROFILE,
          bidAmount: '150',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });

    it('updates the auction current_bid after a successful bid', async () => {
      await request(app).post('/api/v1/bids').send({
        auctionId: testAuctionId,
        bidderSub: process.env.TEST_SUB_WITH_PROFILE,
        bidAmount: 200,
      });

      const { rows } = await pool.query('SELECT current_bid FROM auctions WHERE id = $1', [
        testAuctionId,
      ]);
      expect(Number(rows[0].current_bid)).toBe(200);
    });

    it('returns 400 if required fields are missing', async () => {
      const response = await request(app).post('/api/v1/bids').send({ auctionId: testAuctionId });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/auctionId and bidAmount are required/);
    });

    it('returns 409 if bid is not higher than the current highest bid', async () => {
      // Seed an existing bid at 300
      await pool.query(
        `
        INSERT INTO bids (auction_id, bidder_sub, bid_amount) VALUES ($1, $2, $3)
        `,
        [testAuctionId, process.env.TEST_SUB_WITH_PROFILE, 300],
      );

      // Try to place a lower bid
      const response = await request(app).post('/api/v1/bids').send({
        auctionId: testAuctionId,
        bidderSub: process.env.TEST_SUB_INCOMPLETE_PROFILE,
        bidAmount: 200,
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        message: 'Bid must be higher than current highest bid',
        currentHighest: '300',
      });
    });

    it('returns 409 if bid equals the current highest bid', async () => {
      await pool.query(
        `
        INSERT INTO bids (auction_id, bidder_sub, bid_amount)
        VALUES ($1, $2, $3)
        `,
        [testAuctionId, process.env.TEST_SUB_WITH_PROFILE, 300],
      );

      const response = await request(app).post('/api/v1/bids').send({
        auctionId: testAuctionId,
        bidderSub: process.env.TEST_SUB_INCOMPLETE_PROFILE,
        bidAmount: 300,
      });

      expect(response.status).toBe(409);
    });

    it('creates an outbid notification for the previous highest bidder', async () => {
      // Bidder1 places first bid
      await request(app)
        .post('/api/v1/bids')
        .send({ auctionId: testAuctionId, bidderSub: mockBidder1.sub, bidAmount: 150 });

      // Bidder2 outbids bidder1
      authState.user = mockBidder2;
      await request(app)
        .post('/api/v1/bids')
        .send({ auctionId: testAuctionId, bidderSub: mockBidder2.sub, bidAmount: 250 });

      const { rows } = await pool.query(
        `
        SELECT * FROM auction_notifications
        WHERE user_sub = $1
        AND auction_id = $2
        AND type = 'outbid'
        `,
        [mockBidder1.sub, testAuctionId],
      );

      expect(rows).toHaveLength(1);
    });

    it('does not create an outbid notification when a user outbids themselves', async () => {
      // Same user raises their own bid
      await pool.query(
        `
        INSERT INTO bids (auction_id, bidder_sub, bid_amount)
        VALUES ($1, $2, $3)
        `,
        [testAuctionId, mockBidder1.sub, 150],
      );

      await request(app)
        .post('/api/v1/bids')
        .send({ auctionId: testAuctionId, bidderSub: mockBidder1.sub, bidAmount: 250 });

      const { rows } = await pool.query(
        `
        SELECT * FROM auction_notifications
        WHERE user_sub = $1 AND type = 'outbid'
        `,
        [mockBidder1.sub],
      );
      expect(rows).toHaveLength(0);
    });

    it('extends the auction end_time when bid is placed within the extension window', async () => {
      // Set the auction to end in 30 seconds (within the 60-second EXTENSION_WINDOW_MS)
      const shortEndTime = new Date(Date.now() + 30 * 1000);
      await pool.query(
        `
        UPDATE auctions SET end_time = $1
        WHERE id = $2
        `,
        [shortEndTime, testAuctionId],
      );

      await request(app)
        .post('/api/v1/bids')
        .send({ auctionId: testAuctionId, bidderSub: mockBidder1.sub, bidAmount: 150 });

      const { rows } = await pool.query('SELECT end_time FROM auctions WHERE id = $1', [
        testAuctionId,
      ]);
      const newEndTime = new Date(rows[0].end_time);

      // End time should now be roughly shortEndTime + 5 minutes
      expect(newEndTime.getTime()).toBeGreaterThan(shortEndTime.getTime() + 4 * 60 * 1000);
    });

    it('does not extend auction when bid is placed with plenty of time remaining', async () => {
      // Default end_time is 7 days out — well outside the extension window
      const { rows: before } = await pool.query('SELECT end_time FROM auctions WHERE id = $1', [
        testAuctionId,
      ]);
      const originalEndTime = new Date(before[0].end_time).getTime();

      await request(app)
        .post('/api/v1/bids')
        .send({ auctionId: testAuctionId, bidderSub: mockBidder1.sub, bidAmount: 150 });

      const { rows: after } = await pool.query('SELECT end_time FROM auctions WHERE id = $1', [
        testAuctionId,
      ]);
      const newEndTime = new Date(after[0].end_time).getTime();

      // End time should be unchanged (within a few ms tolerance)
      expect(Math.abs(newEndTime - originalEndTime)).toBeLessThan(1000);
    });
  });

  describe('POST /api/v1/bids/buy-it-now', () => {
    it('processes a buy-it-now purchase and closes the auction (200)', async () => {
      const response = await request(app)
        .post('/api/v1/bids/buy-it-now')
        .send({ auctionId: testAuctionId, buyerSub: mockBidder1.sub });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Auction purchased successfully',
        result: {
          id: expect.any(Number),
          auction_id: testAuctionId,
          winner_sub: mockBidder1.sub,
          final_bid: '500',
          closed_at: expect.any(String),
          closed_reason: 'buy_now',
          is_paid: false,
          tracking_number: null,
          payout_id: null,
          platform_fee: '0',
          seller_net: '0',
        },
        bid: {
          id: expect.any(String),
          auctionId: testAuctionId,
          bidderSub: mockBidder1.sub,
          bidAmount: '500',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });

    it('sets the auction is_active to false after buy-it-now', async () => {
      await request(app)
        .post('/api/v1/bids/buy-it-now')
        .send({ auctionId: testAuctionId, buyerSub: mockBidder1.sub });

      const { rows } = await pool.query('SELECT is_active FROM auctions WHERE id = $1', [
        testAuctionId,
      ]);
      expect(rows[0].is_active).toBe(false);
    });

    it('creates an auction_results record with the buy_now_price', async () => {
      await request(app)
        .post('/api/v1/bids/buy-it-now')
        .send({ auctionId: testAuctionId, buyerSub: mockBidder1.sub });

      const { rows } = await pool.query('SELECT * FROM auction_results WHERE auction_id = $1', [
        testAuctionId,
      ]);
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].final_bid)).toBe(500); // buy_now_price from setup
      expect(rows[0].closed_reason).toBe('buy_now');
    });

    it('returns 400 when the auction is already closed', async () => {
      await pool.query('UPDATE auctions SET is_active = false WHERE id = $1', [testAuctionId]);

      const response = await request(app)
        .post('/api/v1/bids/buy-it-now')
        .send({ auctionId: testAuctionId, buyerSub: mockBidder1.sub });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Auction already closed');
    });

    it('returns 400 when the auction does not exist', async () => {
      const response = await request(app)
        .post('/api/v1/bids/buy-it-now')
        .send({ auctionId: 99999, buyerSub: mockBidder1.sub });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Auction already closed');
    });
  });
});
