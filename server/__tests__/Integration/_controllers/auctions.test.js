const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

// Mock S3 with provided pattern
jest.mock('@aws-sdk/client-s3', () => {
  const mockS3Send = jest.fn().mockImplementation((command) => {
    if (command.constructor.name === 'PutObjectCommand') {
      return Promise.resolve({
        $metadata: { httpStatusCode: 200 },
      });
    }
    if (command.constructor.name === 'DeleteObjectCommand') {
      return Promise.resolve({
        $metadata: { httpStatusCode: 204 },
      });
    }
  });

  return {
    S3Client: jest.fn(() => ({
      send: mockS3Send,
    })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    __mockS3Send: mockS3Send,
  };
});

// Mock user data
const mockUser = {
  email: 'seller@example.com',
  sub: 'sub_fullCustomer',
  customer_id: 'stripe-customer-id_full',
};

// A different authenticated user who does not own the test auction
const mockOtherUser = {
  email: 'other@example.com',
  sub: 'other_sub_456',
  customer_id: 'other_customer_id',
};

// Mutable state so individual tests can swap in a different user
// Initialized to null here; set to mockUser in beforeEach (after jest.mock hoisting resolves)
const authState = { user: null };

// Mock authenticate middleware
jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.user = authState.user;
  next();
});

// Mock auction timers
jest.mock('../../../lib/jobs/auctionTimers.js', () => ({
  scheduleAuctionEnd: jest.fn(),
  cancelAuctionEnd: jest.fn(),
  initAuctionTimers: jest.fn(),
  EXTENSION_MS: 5 * 60 * 1000,
  EXTENSION_WINDOW_MS: 60 * 1000,
}));

describe('Auction routes', () => {
  let testAuctionId;

  beforeEach(async () => {
    process.env.AWS_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-west-2';
    process.env.CLOUDFRONT_DOMAIN = 'd5fmwpj8iaraa.cloudfront.net';

    authState.user = mockUser; // reset to seller before each test

    await setup(pool);

    // Create a test auction
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
        'sub_fullCustomer',
      ],
    );
    testAuctionId = rows[0].id;
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  describe('GET /api/v1/auctions', () => {
    it('should return all active auctions (public)', async () => {
      const response = await request(app).get('/api/v1/auctions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('sellerSub');
    });
  });

  describe('GET /api/v1/auctions/:id', () => {
    it('should return a specific auction (authenticated)', async () => {
      const response = await request(app).get(`/api/v1/auctions/${testAuctionId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testAuctionId);
      expect(response.body.title).toBe('Test Auction');
      expect(response.body.sellerSub).toBe('sub_fullCustomer');
    });

    it('should return null for non-existent auction', async () => {
      const response = await request(app).get('/api/v1/auctions/99999');

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });

  describe('GET /api/v1/auctions/results/:auctionId', () => {
    it('should return auction results with winner profile (public)', async () => {
      // First close the auction with a winner
      await pool.query(
        `
        UPDATE auctions SET is_active = false WHERE id = $1
        `,
        [testAuctionId],
      );

      await pool.query(
        `
        INSERT INTO auction_results (auction_id, winner_sub, final_bid, closed_reason)
        VALUES ($1, $2, $3, $4)
        `,
        [testAuctionId, 'sub_fullCustomer', 250, 'buy_now'],
      );

      const response = await request(app).get(`/api/v1/auctions/results/${testAuctionId}`);

      expect(response.status).toBe(200);
      expect(response.body.reason).toBe('buy_now');
      expect(response.body.profile).toHaveProperty('firstName');
    });

    it('should return null for auction with no results', async () => {
      const response = await request(app).get('/api/v1/auctions/results/99999');

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });

  describe('GET /api/v1/auctions/user-auctions/:sub', () => {
    it('should return user auction bids and wins', async () => {
      const response = await request(app).get('/api/v1/auctions/user-auctions/sub_fullCustomer');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activeAuctionBids');
      expect(response.body).toHaveProperty('wonAuctions');
      expect(Array.isArray(response.body.activeAuctionBids)).toBe(true);
      expect(Array.isArray(response.body.wonAuctions)).toBe(true);
    });
  });

  describe('POST /api/v1/auctions/upload', () => {
    it('should upload images to S3', async () => {
      const response = await request(app)
        .post('/api/v1/auctions/upload')
        .attach('imageFiles', Buffer.from('test image content'), 'test.jpg')
        .attach('imageFiles', Buffer.from('test image 2'), 'test2.jpg');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('secure_url');
      expect(response.body[0]).toHaveProperty('public_id');
      expect(response.body[0].secure_url).toContain('cloudfront.net');
      expect(response.body[0].secure_url).toContain('auction-images');
    });
  });

  describe('POST /api/v1/auctions', () => {
    it('should create a new auction (authenticated seller)', async () => {
      const auctionDetails = {
        title: 'New Auction',
        description: 'New auction description',
        imageUrls: ['https://test.com/new.jpg'],
        startPrice: 50,
        buyNowPrice: 300,
        currentBid: null,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app).post('/api/v1/auctions').send({ auctionDetails });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('New Auction');
      expect(response.body.sellerSub).toBe('sub_fullCustomer'); // Auto-set from req.user
    });

    it('should return 400 if auctionDetails missing', async () => {
      const response = await request(app).post('/api/v1/auctions').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Auction details are required');
    });
  });

  describe('PUT /api/v1/auctions/:id', () => {
    it('should update an auction (seller)', async () => {
      const updatedAuction = {
        title: 'Updated Title',
        description: 'Updated Description',
        imageUrls: ['https://test.com/updated.jpg'],
        startPrice: 100,
        buyNowPrice: 500,
        currentBid: null,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      };

      const response = await request(app)
        .put(`/api/v1/auctions/${testAuctionId}`)
        .send({ id: testAuctionId, auction: updatedAuction });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
    });

    it('should return 404 for non-existent auction', async () => {
      const updatedAuction = {
        title: 'Updated',
        imageUrls: [],
      };

      const response = await request(app)
        .put('/api/v1/auctions/99999')
        .send({ id: 99999, auction: updatedAuction });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Auction not found');
    });
  });

  describe('PUT /api/v1/auctions/:id/paid', () => {
    beforeEach(async () => {
      // Close auction and create result
      await pool.query('UPDATE auctions SET is_active = false WHERE id = $1', [testAuctionId]);
      await pool.query(
        `INSERT INTO auction_results (auction_id, winner_sub, final_bid, closed_reason)
         VALUES ($1, $2, $3, $4)`,
        [testAuctionId, 'sub_fullCustomer', 250, 'expired'],
      );
    });

    it('should mark auction as paid (seller only)', async () => {
      const response = await request(app)
        .put(`/api/v1/auctions/${testAuctionId}/paid`)
        .send({ isPaid: true });

      expect(response.status).toBe(200);
      expect(response.body.is_paid).toBe(true);
    });

    it('should return 403 for non-owner', async () => {
      authState.user = mockOtherUser;
      const response = await request(app)
        .put(`/api/v1/auctions/${testAuctionId}/paid`)
        .send({ isPaid: true });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 400 if isPaid is not boolean', async () => {
      const response = await request(app)
        .put(`/api/v1/auctions/${testAuctionId}/paid`)
        .send({ isPaid: 'yes' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('isPaid must be boolean');
    });
  });

  describe('PUT /api/v1/auctions/:id/tracking', () => {
    beforeEach(async () => {
      // Close auction and create result
      await pool.query('UPDATE auctions SET is_active = false WHERE id = $1', [testAuctionId]);
      await pool.query(
        `INSERT INTO auction_results (auction_id, winner_sub, final_bid, closed_reason)
         VALUES ($1, $2, $3, $4)`,
        [testAuctionId, 'sub_fullCustomer', 250, 'expired'],
      );
    });

    it('should update tracking number (seller only)', async () => {
      const response = await request(app)
        .put(`/api/v1/auctions/${testAuctionId}/tracking`)
        .send({ trackingNumber: 'TRACK123456' });

      expect(response.status).toBe(200);
      expect(response.body.tracking_number).toBe('TRACK123456');
    });

    it('should return 403 for non-owner', async () => {
      authState.user = mockOtherUser;
      const response = await request(app)
        .put(`/api/v1/auctions/${testAuctionId}/tracking`)
        .send({ trackingNumber: 'TRACK123456' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 400 if trackingNumber is invalid', async () => {
      const response = await request(app)
        .put(`/api/v1/auctions/${testAuctionId}/tracking`)
        .send({ trackingNumber: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('trackingNumber must be a string');
    });
  });
});
