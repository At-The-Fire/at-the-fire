const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

// Mock user who will receive notifications
const mockUser = {
  email: 'withProfile@example.com',
  sub: 'sub_withProfile',
  customer_id: null,
};

// A different user who has no notifications
const mockOtherUser = {
  email: 'other@example.com',
  sub: 'sub_otherUser',
  customer_id: null,
};

// Mutable auth state — swap per-test; reset to mockUser in beforeEach
const authState = { user: null };

jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.user = authState.user;
  next();
});

jest.mock('../../../lib/jobs/auctionTimers.js', () => ({
  scheduleAuctionEnd: jest.fn(),
  cancelAuctionEnd: jest.fn(),
  initAuctionTimers: jest.fn(),
  EXTENSION_MS: 5 * 60 * 1000,
  EXTENSION_WINDOW_MS: 60 * 1000,
}));

describe('AuctionNotification routes', () => {
  let testAuctionId;

  beforeEach(async () => {
    authState.user = mockUser;

    await setup(pool);

    // Ensure any additional mock users exist for FK constraints.
    await pool.query(
      `
      INSERT INTO cognito_users (sub, email, email_hash)
      VALUES ($1, $2, $3)
      `,
      [mockOtherUser.sub, mockOtherUser.email, 'dummy_hash_otherUser'],
    );

    // Create a test auction owned by sub_fullCustomer
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
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        true,
        'sub_fullCustomer',
      ],
    );
    testAuctionId = rows[0].id;
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  describe('GET /api/v1/auction-notifications', () => {
    it('returns unread notifications for the authenticated user', async () => {
      // Seed an unread notification
      await pool.query(
        `
        INSERT INTO auction_notifications (user_sub, auction_id, type)
        VALUES ($1, $2, $3)
        `,
        [mockUser.sub, testAuctionId, 'outbid'],
      );

      const response = await request(app).get('/api/v1/auction-notifications');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        userSub: mockUser.sub,
        auctionId: testAuctionId,
        type: 'outbid',
        isRead: false,
      });
    });

    it('returns empty array when user has no unread notifications', async () => {
      const response = await request(app).get('/api/v1/auction-notifications');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('does not return already-read notifications', async () => {
      // Seed a read notification
      await pool.query(
        `
        INSERT INTO auction_notifications (user_sub, auction_id, type, is_read)
        VALUES ($1, $2, $3, $4)
        `,
        [mockUser.sub, testAuctionId, 'outbid', true],
      );

      const response = await request(app).get('/api/v1/auction-notifications');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('only returns notifications for the authenticated user', async () => {
      // Seed a notification for a different user
      await pool.query(
        `
        INSERT INTO auction_notifications (user_sub, auction_id, type)
        VALUES ($1, $2, $3)
        `,
        [mockOtherUser.sub, testAuctionId, 'outbid'],
      );

      const response = await request(app).get('/api/v1/auction-notifications');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns notifications ordered by created_at DESC (newest first)', async () => {
      // Create a second auction to seed a second notification

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
          'Second Auction',
          'Second Description',
          ['https://test.com/image2.jpg'],
          50,
          250,
          null,
          new Date(),
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          true,
          'sub_fullCustomer',
        ],
      );

      const secondAuctionId = rows[0].id;

      // Explicit created_at values avoid flakiness from identical timestamps
      await pool.query(
        `
        INSERT INTO auction_notifications (user_sub, auction_id, type, created_at)
        VALUES ($1, $2, $3, $4)
        `,
        [mockUser.sub, testAuctionId, 'outbid', new Date('2020-01-01T00:00:00.000Z')],
      );

      await pool.query(
        `
        INSERT INTO auction_notifications (user_sub, auction_id, type, created_at)
        VALUES ($1, $2, $3, $4)
        `,
        [mockUser.sub, secondAuctionId, 'outbid', new Date('2020-01-02T00:00:00.000Z')],
      );

      const response = await request(app).get('/api/v1/auction-notifications');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      // Newest (secondAuction) should come first due to ORDER BY created_at DESC
      expect(response.body[0].auctionId).toBe(secondAuctionId);
      expect(response.body[1].auctionId).toBe(testAuctionId);
    });
  });

  describe('PATCH /api/v1/auction-notifications/mark-read', () => {
    it('marks all unread notifications as read for the authenticated user', async () => {
      // Seed two unread notifications
      await pool.query(
        `
        INSERT INTO auction_notifications (user_sub, auction_id, type)
        VALUES ($1, $2, $3), ($1, $2, $3)
        `,
        [mockUser.sub, testAuctionId, 'outbid'],
      );

      const response = await request(app).patch('/api/v1/auction-notifications/mark-read');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'All auction notifications marked as read' });

      // Verify they are now read in the DB
      const { rows } = await pool.query(
        `SELECT * FROM auction_notifications WHERE user_sub = $1 AND is_read = false`,
        [mockUser.sub],
      );
      expect(rows).toHaveLength(0);
    });

    it('returns success even when user has no notifications to mark', async () => {
      const response = await request(app).patch('/api/v1/auction-notifications/mark-read');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'All auction notifications marked as read' });
    });

    it("only marks the authenticated user's notifications as read", async () => {
      // Seed notifications for both users
      await pool.query(
        `
        INSERT INTO auction_notifications (user_sub, auction_id, type)
        VALUES ($1, $2, $3), ($4, $2, $3)
        `,
        [mockUser.sub, testAuctionId, 'outbid', mockOtherUser.sub],
      );

      await request(app).patch('/api/v1/auction-notifications/mark-read');

      // Other user's notification should still be unread
      const { rows } = await pool.query(
        `SELECT * FROM auction_notifications WHERE user_sub = $1 AND is_read = false`,
        [mockOtherUser.sub],
      );
      expect(rows).toHaveLength(1);
    });
  });
});
