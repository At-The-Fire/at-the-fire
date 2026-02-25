const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

// Mock paymentService — currently a NullAdapter (503); mock for happy-path /intent tests
jest.mock('../../../lib/services/paymentService', () => ({
  createPaymentIntent: jest.fn(),
}));

const paymentService = require('../../../lib/services/paymentService');

// Buyer is a seeded user with a stripe_customers row (customer_id present)
const mockBuyer = {
  email: 'fullCustomer@example.com',
  sub: 'sub_fullCustomer',
  customer_id: 'stripe-customer-id_full',
};

// Mutable auth state — swap per-test; reset to mockBuyer in beforeEach
const authState = { user: null };

jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.userAWSSub = authState.user?.sub;
  next();
});

describe('Purchases routes', () => {
  let testPostId;

  beforeEach(async () => {
    authState.user = mockBuyer;
    paymentService.createPaymentIntent.mockReset();

    await setup(pool);

    // Insert a gallery post with a numeric price and known seller for FK constraints.
    // seller is sub_fullCustomer whose stripe customer_id is 'stripe-customer-id_full'.
    const { rows } = await pool.query(
      `
      INSERT INTO gallery_posts (title, description, image_url, category, price, customer_id, public_id, num_imgs, quantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
      `,
      [
        'Test Post',
        'Test Description',
        'https://test.com/img.jpg',
        'Art',
        '25.00',
        'stripe-customer-id_full',
        'public_id_test',
        1,
        5,
      ],
    );
    testPostId = rows[0].id;
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  describe('POST /api/v1/purchases/intent', () => {
    it('returns intentId and clientSecret on success', async () => {
      paymentService.createPaymentIntent.mockResolvedValueOnce({
        intentId: 'pi_test123',
        clientSecret: 'pi_test123_secret',
      });

      const response = await request(app)
        .post('/api/v1/purchases/intent')
        .send({ totalAmount: 2500, items: [{ postId: testPostId, quantity: 1 }] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        intentId: 'pi_test123',
        clientSecret: 'pi_test123_secret',
      });
      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(
        2500,
        'usd',
        expect.objectContaining({ buyerSub: mockBuyer.sub }),
      );
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

    it('returns 503 when payment processor is not configured', async () => {
      paymentService.createPaymentIntent.mockRejectedValueOnce(
        Object.assign(new Error('Payment processor not yet configured'), { status: 503 }),
      );

      const response = await request(app)
        .post('/api/v1/purchases/intent')
        .send({ totalAmount: 2500, items: [{ postId: testPostId, quantity: 1 }] });

      expect(response.status).toBe(503);
    });
  });

  describe('POST /api/v1/purchases/confirm', () => {
    it('creates a purchase record and returns purchaseIds and summary', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId: 'pi_test123', items: [{ postId: testPostId, quantity: 2 }] });

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
    });

    it('decrements gallery_posts.quantity after confirm', async () => {
      await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId: 'pi_test123', items: [{ postId: testPostId, quantity: 3 }] });

      const { rows } = await pool.query('SELECT quantity FROM gallery_posts WHERE id = $1', [
        testPostId,
      ]);
      expect(rows[0].quantity).toBe(2);
    });

    it('sets sold=true when quantity reaches zero', async () => {
      await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId: 'pi_test123', items: [{ postId: testPostId, quantity: 5 }] });

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
        INSERT INTO gallery_posts (title, description, image_url, category, price, customer_id, public_id, num_imgs, quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
        `,
        [
          'Second Post',
          'Desc',
          'https://test.com/img2.jpg',
          'Art',
          '10.00',
          'stripe-customer-id_full',
          'public_id_test2',
          1,
          3,
        ],
      );
      const secondPostId = rows[0].id;

      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({
          intentId: 'pi_test123',
          items: [
            { postId: testPostId, quantity: 1 },
            { postId: secondPostId, quantity: 2 },
          ],
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

    it('returns 404 when post does not exist', async () => {
      const response = await request(app)
        .post('/api/v1/purchases/confirm')
        .send({ intentId: 'pi_test123', items: [{ postId: 99999, quantity: 1 }] });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post 99999 not found');
    });
  });

  describe('GET /api/v1/purchases', () => {
    it('returns purchase history for the authenticated buyer', async () => {
      // Seed a purchase record directly
      await pool.query(
        `
        INSERT INTO purchases (buyer_sub, seller_customer_id, item_type, item_id, quantity, amount_paid)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [mockBuyer.sub, 'stripe-customer-id_full', 'gallery_post', testPostId, 1, '25.00'],
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

    it('returns purchases ordered by created_at DESC (newest first)', async () => {
      await pool.query(
        `
        INSERT INTO purchases (buyer_sub, seller_customer_id, item_type, item_id, quantity, amount_paid, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7), ($1, $2, $3, $4, $5, $6, $8)
        `,
        [
          mockBuyer.sub,
          'stripe-customer-id_full',
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
});
