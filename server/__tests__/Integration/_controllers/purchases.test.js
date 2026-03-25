process.env.PAYMENTS_ADAPTER = 'mock';

const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

// Buyer is a seeded authenticated user.
const mockBuyer = {
  email: 'fullCustomer@example.com',
  sub: process.env.TEST_SUB_FULL_CUSTOMER,
};

// Mutable auth state — swap per-test; reset to mockBuyer in beforeEach
const authState = { user: null };

jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.userAWSSub = authState.user?.sub;
  next();
});

const validAddress = {
  fullName: 'Test Buyer',
  line1: '123 Test St',
  city: 'Portland',
  state: 'OR',
  zip: '97201',
  country: 'US',
};

describe('Purchases routes', () => {
  let testPostId;
  let testAuctionId;

  const createIntent = async ({ totalAmount, items }) => {
    const intentResponse = await request(app)
      .post('/api/v1/purchases/intent')
      .send({ totalAmount, items });

    expect(intentResponse.status).toBe(200);
    expect(intentResponse.body.intentId).toMatch(/^mock_pi_/);
    return intentResponse.body.intentId;
  };

  beforeEach(async () => {
    authState.user = mockBuyer;
    process.env.PLATFORM_FEE_PCT = '0.1';
    await setup(pool);

    // Insert a gallery post with a numeric price and known seller sub for FK constraints.
    const { rows } = await pool.query(
      `
      INSERT INTO gallery_posts (title, description, image_url, category, price, seller_sub, public_id, num_imgs, quantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
      `,
      [
        'Test Post',
        'Test Description',
        'https://test.com/img.jpg',
        'Art',
        '25.00',
        process.env.TEST_SUB_FULL_CUSTOMER,
        'public_id_test',
        1,
        5,
      ],
    );
    testPostId = rows[0].id;

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
        'Auction Purchase Test',
        'Auction Description',
        ['https://test.com/auction.jpg'],
        100,
        500,
        250,
        new Date(Date.now() - 60 * 60 * 1000),
        new Date(Date.now() - 30 * 60 * 1000),
        false,
        process.env.TEST_SUB_FULL_CUSTOMER,
        10,
      ],
    );
    testAuctionId = auctionRows[0].id;

    await pool.query(
      `
      INSERT INTO auction_results (auction_id, winner_sub, final_bid, closed_reason, is_paid)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [testAuctionId, mockBuyer.sub, 250, 'expired', false],
    );
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  describe('POST /api/v1/purchases/intent', () => {
    it('returns intentId and clientSecret on success', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/intent')
        .send({ totalAmount: 2500, items: [{ postId: testPostId, quantity: 1 }] });

      expect(response.status).toBe(200);
      expect(response.body.intentId).toMatch(/^mock_pi_/);
      expect(response.body.clientSecret).toEqual(expect.stringContaining(response.body.intentId));
    });

    it('returns 400 when totalAmount is missing', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/intent')
        .send({ items: [{ postId: testPostId, quantity: 1 }] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('totalAmount and items are required');
    });

    it('returns 400 when items is missing', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/intent')
        .send({ totalAmount: 2500 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('totalAmount and items are required');
    });

    it('returns 400 when items is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/intent')
        .send({ totalAmount: 2500, items: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('totalAmount and items are required');
    });

    // NOTE: 503 behavior is covered by NullAdapter; this suite runs with PAYMENTS_ADAPTER=mock
  });

  describe('POST /api/v1/purchases/confirm', () => {
    it('creates a purchase record and returns purchaseIds and summary', async () => {
      const intentId = await createIntent({
        totalAmount: 5000,
        items: [{ postId: testPostId, quantity: 2 }],
      });

      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId, items: [{ postId: testPostId, quantity: 2 }], shippingAddress: validAddress });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('purchaseIds');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.purchaseIds)).toBe(true);
      expect(response.body.purchaseIds).toHaveLength(1);
      expect(response.body.summary[0]).toMatchObject({
        postId: testPostId,
        quantityPurchased: 2,
        amountPaid: 50,
        newQuantity: 3,
        isSold: false,
      });

      const { rows } = await pool.query('SELECT status, processor_transaction_id FROM purchases');
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('completed');
      expect(rows[0].processor_transaction_id).toMatch(/^mock_tx_/);
    });

    it('decrements gallery_posts.quantity after confirm', async () => {
      const intentId = await createIntent({
        totalAmount: 7500,
        items: [{ postId: testPostId, quantity: 3 }],
      });

      await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId, items: [{ postId: testPostId, quantity: 3 }], shippingAddress: validAddress });

      const { rows } = await pool.query('SELECT quantity FROM gallery_posts WHERE id = $1', [
        testPostId,
      ]);
      expect(rows[0].quantity).toBe(2);
    });

    it('sets sold=true when quantity reaches zero', async () => {
      const intentId = await createIntent({
        totalAmount: 12500,
        items: [{ postId: testPostId, quantity: 5 }],
      });

      await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId, items: [{ postId: testPostId, quantity: 5 }], shippingAddress: validAddress });

      const { rows } = await pool.query('SELECT quantity, sold FROM gallery_posts WHERE id = $1', [
        testPostId,
      ]);
      expect(rows[0].quantity).toBe(0);
      expect(rows[0].sold).toBe(true);
    });

    it('handles multiple items in a single confirm', async () => {
      // Insert a second post
      const { rows } = await pool.query(
        `
        INSERT INTO gallery_posts (title, description, image_url, category, price, seller_sub, public_id, num_imgs, quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
        `,
        [
          'Second Post',
          'Desc',
          'https://test.com/img2.jpg',
          'Art',
          '10.00',
          process.env.TEST_SUB_FULL_CUSTOMER,
          'public_id_test2',
          1,
          3,
        ],
      );
      const secondPostId = rows[0].id;

      const intentId = await createIntent({
        totalAmount: 4500,
        items: [
          { postId: testPostId, quantity: 1 },
          { postId: secondPostId, quantity: 2 },
        ],
      });

      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({
          intentId,
          items: [
            { postId: testPostId, quantity: 1 },
            { postId: secondPostId, quantity: 2 },
          ],
          shippingAddress: validAddress,
        });

      expect(response.status).toBe(200);
      expect(response.body.purchaseIds).toHaveLength(2);
      expect(response.body.summary).toHaveLength(2);
    });

    it('returns 400 when intentId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ items: [{ postId: testPostId, quantity: 1 }] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('intentId and items are required');
    });

    it('returns 400 when items is missing', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId: 'pi_test123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('intentId and items are required');
    });

    it('returns 400 when items is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId: 'pi_test123', items: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('intentId and items are required');
    });

    it('returns 400 when shippingAddress is missing', async () => {
      const intentId = await createIntent({ totalAmount: 2500, items: [{ postId: testPostId, quantity: 1 }] });

      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId, items: [{ postId: testPostId, quantity: 1 }] });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Shipping address is required/);
    });

    it('returns 400 when shippingAddress is missing required fields', async () => {
      const intentId = await createIntent({ totalAmount: 2500, items: [{ postId: testPostId, quantity: 1 }] });

      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId, items: [{ postId: testPostId, quantity: 1 }], shippingAddress: { fullName: 'Test' } });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Shipping address is required/);
    });

    it('stores an encrypted shipping_address on the purchases row', async () => {
      const intentId = await createIntent({ totalAmount: 2500, items: [{ postId: testPostId, quantity: 1 }] });

      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId, items: [{ postId: testPostId, quantity: 1 }], shippingAddress: validAddress });

      expect(response.status).toBe(200);
      const { rows } = await pool.query('SELECT shipping_address FROM purchases WHERE id = $1', [response.body.purchaseIds[0]]);
      expect(rows[0].shipping_address).not.toBeNull();
      expect(typeof rows[0].shipping_address).toBe('string');
      // Should be encrypted (not plain JSON)
      expect(rows[0].shipping_address).not.toContain('Portland');
    });

    it('returns 404 when post does not exist', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId: 'pi_test123', items: [{ postId: 99999, quantity: 1 }], shippingAddress: validAddress });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post 99999 not found');
    });
  });

  describe('GET /api/v1/purchases', () => {
    it('returns purchase history for the authenticated buyer', async () => {
      // Seed a purchase record directly
      await pool.query(
        `
        INSERT INTO purchases (buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [mockBuyer.sub, process.env.TEST_SUB_FULL_CUSTOMER, 'gallery_post', testPostId, 1, '25.00'],
      );

      const response = await request(app).get('/api/v1/purchases');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        buyerSub: mockBuyer.sub,
        itemType: 'gallery_post',
        itemId: testPostId,
        quantity: 1,
        status: 'pending',
      });
    });

    it('returns empty array when buyer has no purchases', async () => {
      const response = await request(app).get('/api/v1/purchases');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('excludes auction purchases — only gallery_post items are returned', async () => {
      // Seed both item types for the same buyer.
      await pool.query(
        `
        INSERT INTO purchases (buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid)
        VALUES ($1, $2, 'gallery_post', $3, 1, '25.00'),
               ($1, $2, 'auction',     $4, 1, '100.00')
        `,
        [mockBuyer.sub, process.env.TEST_SUB_FULL_CUSTOMER, testPostId, testAuctionId],
      );

      const response = await request(app).get('/api/v1/purchases');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].itemType).toBe('gallery_post');
    });

    it('returns purchases ordered by created_at DESC (newest first)', async () => {
      await pool.query(
        `
        INSERT INTO purchases (buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7), ($1, $2, $3, $4, $5, $6, $8)
        `,
        [
          mockBuyer.sub,
          process.env.TEST_SUB_FULL_CUSTOMER,
          'gallery_post',
          testPostId,
          1,
          '25.00',
          new Date('2020-01-01T00:00:00Z'),
          new Date('2020-01-02T00:00:00Z'),
        ],
      );

      const response = await request(app).get('/api/v1/purchases');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      // Newest first
      expect(new Date(response.body[0].createdAt).getTime()).toBeGreaterThan(
        new Date(response.body[1].createdAt).getTime(),
      );
    });
  });

  describe('GET /api/v1/purchases/seller', () => {
    it('returns gallery_post purchase records for the authenticated seller', async () => {
      await pool.query(
        `
        INSERT INTO purchases (buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid, status)
        VALUES ($1, $2, 'gallery_post', $3, 1, '25.00', 'completed')
        `,
        [process.env.TEST_SUB_NO_PROFILE, mockBuyer.sub, testPostId],
      );

      const response = await request(app).get('/api/v1/purchases/seller');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        sellerSub: mockBuyer.sub,
        itemType: 'gallery_post',
        itemId: testPostId,
        quantity: 1,
        status: 'completed',
      });
    });

    it('excludes auction purchases — only gallery_post items are returned to seller', async () => {
      // Seed both item types for the same seller.
      await pool.query(
        `
        INSERT INTO purchases (buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid, status)
        VALUES ($1, $2, 'gallery_post', $3, 1,  '85.00', 'completed'),
               ($1, $2, 'auction',     $4, 1, '250.00', 'completed')
        `,
        [process.env.TEST_SUB_NO_PROFILE, mockBuyer.sub, testPostId, testAuctionId],
      );

      const response = await request(app).get('/api/v1/purchases/seller');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].itemType).toBe('gallery_post');
    });

    it('returns empty array when seller has no gallery purchases', async () => {
      const response = await request(app).get('/api/v1/purchases/seller');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/v1/purchases/auction-intent', () => {
    it('creates payment intent for winning bidder and returns totalAmount', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/auction-intent')
        .send({ auctionId: testAuctionId });

      expect(response.status).toBe(200);
      expect(response.body.intentId).toMatch(/^mock_pi_/);
      expect(response.body.clientSecret).toEqual(expect.stringContaining(response.body.intentId));
      expect(response.body.totalAmount).toBe(260);
    });

    it('returns 400 when auctionId is missing', async () => {
      const response = await request(app).post('/api/v1/purchases/auction-intent').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('auctionId is required');
    });

    it('returns 403 for non-winning bidder', async () => {
      authState.user = { sub: process.env.TEST_SUB_NO_PROFILE };

      const response = await request(app)
        .post('/api/v1/purchases/auction-intent')
        .send({ auctionId: testAuctionId });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('returns 409 when auction result is already paid', async () => {
      await pool.query('UPDATE auction_results SET is_paid = true WHERE auction_id = $1', [
        testAuctionId,
      ]);

      const response = await request(app)
        .post('/api/v1/purchases/auction-intent')
        .send({ auctionId: testAuctionId });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Already paid');
    });
  });

  describe('POST /api/v1/purchases/auction-confirm', () => {
    it('captures payment, marks auction as paid, and creates auction purchase', async () => {
      const intentResponse = await request(app)
        .post('/api/v1/purchases/auction-intent')
        .send({ auctionId: testAuctionId });
      const intentId = intentResponse.body.intentId;

      const response = await request(app)
        .post('/api/v1/purchases/auction-confirm')
        .send({ intentId, auctionId: testAuctionId, shippingAddress: validAddress });

      expect(response.status).toBe(200);

      expect(response.body.purchaseId).toEqual('1');

      const { rows: resultsRows } = await pool.query(
        `SELECT is_paid, platform_fee, seller_net
         FROM auction_results
         WHERE auction_id = $1`,
        [testAuctionId],
      );
      expect(resultsRows[0].is_paid).toBe(true);
      expect(Number(resultsRows[0].platform_fee)).toBe(25);
      expect(Number(resultsRows[0].seller_net)).toBe(235);

      const { rows: purchaseRows } = await pool.query(
        `SELECT item_type, item_id, amount_paid, platform_fee, seller_net, status, processor_transaction_id
         FROM purchases
         WHERE id = $1`,
        [response.body.purchaseId],
      );

      expect(purchaseRows).toHaveLength(1);
      expect(purchaseRows[0].item_type).toBe('auction');

      expect(Number(purchaseRows[0].item_id)).toBe(Number(testAuctionId));
      expect(Number(purchaseRows[0].amount_paid)).toBe(260);
      expect(Number(purchaseRows[0].platform_fee)).toBe(25);
      expect(Number(purchaseRows[0].seller_net)).toBe(235);
      expect(purchaseRows[0].status).toBe('completed');
      expect(purchaseRows[0].processor_transaction_id).toMatch(/^mock_tx_/);
    });

    it('returns 400 when intentId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/auction-confirm')
        .send({ auctionId: testAuctionId });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('intentId and auctionId are required');
    });

    it('returns 403 for non-winning bidder', async () => {
      const intentResponse = await request(app)
        .post('/api/v1/purchases/auction-intent')
        .send({ auctionId: testAuctionId });
      const intentId = intentResponse.body.intentId;

      authState.user = { sub: process.env.TEST_SUB_NO_PROFILE };

      const response = await request(app)
        .post('/api/v1/purchases/auction-confirm')
        .send({ intentId, auctionId: testAuctionId, shippingAddress: validAddress });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('returns 409 when auction is already paid', async () => {
      await pool.query('UPDATE auction_results SET is_paid = true WHERE auction_id = $1', [
        testAuctionId,
      ]);

      const response = await request(app)
        .post('/api/v1/purchases/auction-confirm')
        .send({ intentId: 'mock_pi_any', auctionId: testAuctionId, shippingAddress: validAddress });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Already paid');
    });

    it('returns 400 when shippingAddress is missing', async () => {
      const intentResponse = await request(app)
        .post('/api/v1/purchases/auction-intent')
        .send({ auctionId: testAuctionId });
      const intentId = intentResponse.body.intentId;

      const response = await request(app)
        .post('/api/v1/purchases/auction-confirm')
        .send({ intentId, auctionId: testAuctionId });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Shipping address is required/);
    });

    it('stores an encrypted shipping_address on the auction purchases row', async () => {
      const intentResponse = await request(app)
        .post('/api/v1/purchases/auction-intent')
        .send({ auctionId: testAuctionId });
      const intentId = intentResponse.body.intentId;

      const response = await request(app)
        .post('/api/v1/purchases/auction-confirm')
        .send({ intentId, auctionId: testAuctionId, shippingAddress: validAddress });

      expect(response.status).toBe(200);
      const { rows } = await pool.query('SELECT shipping_address FROM purchases WHERE id = $1', [response.body.purchaseId]);
      expect(rows[0].shipping_address).not.toBeNull();
      expect(typeof rows[0].shipping_address).toBe('string');
      expect(rows[0].shipping_address).not.toContain('Portland');
    });
  });
});
