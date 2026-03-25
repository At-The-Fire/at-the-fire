const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

const mockUser = {
  email: 'fullCustomer@example.com',
  sub: process.env.TEST_SUB_FULL_CUSTOMER,
  customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
};

const authState = { user: null };

jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.userAWSSub = authState.user?.sub;
  next();
});

describe('Cart routes', () => {
  let availablePostId;
  let soldPostId;
  let lowQtyPostId;

  beforeEach(async () => {
    authState.user = mockUser;

    await setup(pool);

    // Available post — qty 5, not sold
    const { rows: r1 } = await pool.query(
      `
      INSERT INTO gallery_posts (title, description, image_url, category, price, seller_sub, public_id, num_imgs, quantity, sold)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        'Available Post',
        'Desc',
        'https://test.com/img1.jpg',
        'Art',
        '20.00',
        process.env.TEST_SUB_FULL_CUSTOMER,
        'pub_id_1',
        1,
        5,
        false,
      ],
    );
    availablePostId = r1[0].id;

    // Sold post
    const { rows: r2 } = await pool.query(
      `
      INSERT INTO gallery_posts (title, description, image_url, category, price, seller_sub, public_id, num_imgs, quantity, sold)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        'Sold Post',
        'Desc',
        'https://test.com/img2.jpg',
        'Art',
        '30.00',
        process.env.TEST_SUB_FULL_CUSTOMER,
        'pub_id_2',
        1,
        0,
        true,
      ],
    );
    soldPostId = r2[0].id;

    // Low quantity post — only 2 in stock
    const { rows: r3 } = await pool.query(
      `
      INSERT INTO gallery_posts (title, description, image_url, category, price, seller_sub, public_id, num_imgs, quantity, sold)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        'Low Qty Post',
        'Desc',
        'https://test.com/img3.jpg',
        'Art',
        '15.00',
        process.env.TEST_SUB_FULL_CUSTOMER,
        'pub_id_3',
        1,
        2,
        false,
      ],
    );
    lowQtyPostId = r3[0].id;
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  describe('POST /api/v1/cart/validate', () => {
    it('returns available: true for an item with sufficient stock', async () => {
      const response = await request(app)
        .post('/api/v1/cart/validate')
        .send({ items: [{ postId: availablePostId, quantity: 3 }] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          postId: availablePostId,
          available: true,
          currentPrice: '20.00',
          availableQty: 5,
          shippingCost: '0',
        },
      ]);
    });

    it('returns available: false with reason "Item already sold" for a sold post', async () => {
      const response = await request(app)
        .post('/api/v1/cart/validate')
        .send({ items: [{ postId: soldPostId, quantity: 1 }] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          postId: soldPostId,
          available: false,
          reason: 'Item already sold',
          currentPrice: '30.00',
          availableQty: 0,
        },
      ]);
    });

    it('returns available: false with reason "Insufficient quantity" when requested qty exceeds stock', async () => {
      const response = await request(app)
        .post('/api/v1/cart/validate')
        .send({ items: [{ postId: lowQtyPostId, quantity: 5 }] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          postId: lowQtyPostId,
          available: false,
          reason: 'Insufficient quantity',
          currentPrice: '15.00',
          availableQty: 2,
        },
      ]);
    });

    it('returns available: false with reason "Post not found" for a non-existent postId', async () => {
      const response = await request(app)
        .post('/api/v1/cart/validate')
        .send({ items: [{ postId: 99999, quantity: 1 }] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          postId: 99999,
          available: false,
          reason: 'Post not found',
          currentPrice: null,
          availableQty: 0,
        },
      ]);
    });

    it('handles multiple items in one request and returns a result per item', async () => {
      const response = await request(app)
        .post('/api/v1/cart/validate')
        .send({
          items: [
            { postId: availablePostId, quantity: 1 },
            { postId: soldPostId, quantity: 1 },
            { postId: lowQtyPostId, quantity: 10 },
            { postId: 99999, quantity: 1 },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(4);
      expect(response.body[0].available).toBe(true);
      expect(response.body[1]).toMatchObject({ available: false, reason: 'Item already sold' });
      expect(response.body[2]).toMatchObject({ available: false, reason: 'Insufficient quantity' });
      expect(response.body[3]).toMatchObject({ available: false, reason: 'Post not found' });
    });

    it('returns available: true when requested quantity exactly matches stock', async () => {
      const response = await request(app)
        .post('/api/v1/cart/validate')
        .send({ items: [{ postId: lowQtyPostId, quantity: 2 }] });

      expect(response.status).toBe(200);
      expect(response.body[0].available).toBe(true);
      expect(response.body[0].availableQty).toBe(2);
    });

    it('returns 400 when items is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/cart/validate')
        .send({ items: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Items array is required');
    });

    it('returns 400 when items is an empty array', async () => {
      const response = await request(app).post('/api/v1/cart/validate').send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Items array is required');
    });

    it('returns 400 when items is missing from the body', async () => {
      const response = await request(app).post('/api/v1/cart/validate').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Items array is required');
    });
  });
});
