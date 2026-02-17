const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');
const QuotaProduct = require('../../../lib/models/QuotaProduct.js');
const Post = require('../../../lib/models/Post.js');

// Importing jsonwebtoken to mock its verify function
const jwt = require('jsonwebtoken');

// Mocking the jsonwebtoken module to mock `verify` and `decode`
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'), // Preserves actual implementations of other jwt functions
  verify: jest.fn((token, getKey, options, callback) => {
    if (
      token === 'valid.free.user.access.token' ||
      token === 'valid.free.user.id.token' ||
      token === 'valid.free.user.refresh.token'
    ) {
      // Simulate a successful token verification
      callback(null, { sub: process.env.TEST_SUB_FULL_CUSTOMER });
    } else {
      // Simulate verification failure
      callback(new Error('Invalid token'));
    }
  }),
  decode: jest.fn((token) => {
    if (token === 'valid.free.user.id.token') {
      // Return a mock decoded token with `sub`
      return { sub: process.env.TEST_SUB_FULL_CUSTOMER };
    } else {
      return null; // Invalid token case
    }
  }),
}));

// Mocking the `StripeCustomer` module
jest.mock('../../../lib/models/StripeCustomer', () => ({
  getStripeByAWSSub: jest.fn(),
}));

// Mocking the `Subscriptions` module
jest.mock('../../../lib/models/Subscriptions', () => ({
  getSubscriptionByCustomerId: jest.fn(), // Mock the `getSubscriptionByCustomerId` function
}));

// Mocking the `Invoices` module
jest.mock('../../../lib/models/Invoices', () => ({
  getBillingPeriodByCustomerId: jest.fn(), // Mock the `getSubscriptionByCustomerId` function
}));

// Abstract function to setup mock tokens, JWT, and database responses for subscribed users
const setupSuccessSubscribedUserMocks = () => {
  // Mock a valid token for a subscribed user
  const subscribedUserAccessToken = 'valid.subscriber.access.token';
  const subscribedUserIdToken = 'valid.subscriber.id.token';
  const subscribedUserRefreshToken = 'valid.subscriber.refresh.token';

  // Mock the `jwt.decode` function to decode the idToken and return a token with `sub`
  jwt.decode.mockImplementation((token) => {
    if (token === 'valid.subscriber.id.token') {
      return { sub: process.env.TEST_SUB_FULL_CUSTOMER }; // Simulated structure of a valid decoded JWT
    }
    return null; // Return null for anything else (token is invalid)
  });

  // Mock the `jwt.verify` function to simulate successful verification for all valid tokens
  jwt.verify.mockImplementation((token, getKey, options, callback) => {
    if (
      token === 'valid.subscriber.access.token' ||
      token === 'valid.subscriber.id.token' ||
      token === 'valid.subscriber.refresh.token'
    ) {
      // Simulate a valid token verification with a `sub` field
      callback(null, { sub: process.env.TEST_SUB_FULL_CUSTOMER });
    } else {
      callback(new Error('Invalid token'));
    }
  });

  // Mock the database call to return a valid customer ID for a subscribed user
  StripeCustomer.getStripeByAWSSub.mockResolvedValue({
    customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    awsSub: process.env.TEST_SUB_FULL_CUSTOMER,
    confirmed: true,
  });

  // Mock the database call to return the subscription status for a subscribed user
  Subscriptions.getSubscriptionByCustomerId.mockResolvedValue({
    customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    isActive: true,
  });

  // Mock the database call to return the billing period for a subscribed user
  Invoices.getBillingPeriodByCustomerId.mockResolvedValue({
    endDate: '2722668400000',
  });

  return {
    subscribedUserAccessToken,
    subscribedUserIdToken,
    subscribedUserRefreshToken,
  };
};

describe('quotaTracking routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    return setup(pool);
  });
  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  it('GET /quota-tracking should return list of products', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .get('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual([
      {
        category: 'test-category',
        created_at: expect.any(String),
        customer_id: 'stripe-customer-id_full',
        date: '1731744000000',
        description: 'test-description',
        id: '1',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/f_auto,q_auto/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '1',
        post_id: null,
        price: 'test-price',
        public_id: 'image-public-id',
        sold: false,
        date_sold: null,
        title: 'test-title',
        type: 'auction',
        qty: expect.anything(),
        sales: [],
      },
    ]);
  });

  it('POST /quota-tracking should post a new product', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .post('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: 'Bubblers',
        date: 1731744000000,
        description: 'This is a product description',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '1',
        price: '250',
        public_id: 'at-the-fire/IMG_0749',
        sold: false,
        date_sold: null,
        title: 'test title for a product',
        type: 'auction',
        qty: 1,
      });

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      category: 'Bubblers',
      created_at: expect.any(String),
      customer_id: 'stripe-customer-id_full',
      date: '1731744000000',
      description: 'This is a product description',
      id: '2',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
      num_days: '1',
      post_id: null,
      price: '250',
      public_id: 'at-the-fire/IMG_0749',
      sold: false,
      date_sold: null,
      title: 'test title for a product',
      type: 'auction',
      qty: 1,
    });
  });

  it('POST /quota-tracking should post a new product with sold status and date', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .post('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: 'Bubblers',
        date: 1731744000000,
        description: 'This is a sold product',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '1',
        price: '250',
        public_id: 'at-the-fire/IMG_0749',
        sold: true,
        date_sold: '1731744000000',
        title: 'Sold Product Test',
        type: 'auction',
        qty: 1,
      });

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      category: 'Bubblers',
      created_at: expect.any(String),
      customer_id: 'stripe-customer-id_full',
      date: '1731744000000',
      description: 'This is a sold product',
      id: '2',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
      num_days: '1',
      post_id: null,
      price: '250',
      public_id: 'at-the-fire/IMG_0749',
      sold: true,
      date_sold: '1731744000000',
      title: 'Sold Product Test',
      type: 'auction',
      qty: 1,
    });
  });

  it('PUT /quota-tracking/:id should update a product', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .put('/api/v1/quota-tracking/1')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: 'Bubblers',
        date: 1731744000000,
        description: 'Updated description',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '2',
        price: '500',
        public_id: 'at-the-fire/IMG_0749',
        sold: false,
        date_sold: null,
        title: 'updated title',
        type: 'inventory',
        qty: 1,
        sales: [],
      });

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      category: 'Bubblers',
      created_at: expect.any(String),
      customer_id: 'stripe-customer-id_full',
      date: '1731744000000',
      description: 'Updated description',
      id: '1',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
      num_days: '2',
      post_id: null,
      price: '500',
      public_id: 'at-the-fire/IMG_0749',
      sold: false,
      date_sold: null,
      title: 'updated title',
      type: 'inventory',
      qty: 1,
      sales: [],
    });
  });

  it('PUT /quota-tracking/:id should update a product to sold status with date', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .put('/api/v1/quota-tracking/1')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: 'Bubblers',
        date: 1731744000000,
        description: 'Updated to sold status',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '2',
        price: '500',
        public_id: 'at-the-fire/IMG_0749',
        sold: true,
        date_sold: '1731744000000',
        title: 'Updated to Sold',
        type: 'inventory',
        qty: 1,
        sales: [],
      });

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      category: 'Bubblers',
      created_at: expect.any(String),
      customer_id: 'stripe-customer-id_full',
      date: '1731744000000',
      description: 'Updated to sold status',
      id: '1',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
      num_days: '2',
      post_id: null,
      price: '500',
      public_id: 'at-the-fire/IMG_0749',
      sold: true,
      date_sold: '1731744000000',
      title: 'Updated to Sold',
      type: 'inventory',
      qty: 1,
      sales: [],
    });
  });

  it('DELETE /quota-tracking/:id should delete a product', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .delete('/api/v1/quota-tracking/1')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(204);
  });

  it('GET /quota-tracking should handle empty products list', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    // Mock the database to return empty array
    jest.spyOn(QuotaProduct, 'getQuotaProducts').mockResolvedValue([]);

    const resp = await request(app)
      .get('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual([]);
  });

  it('POST /quota-tracking should reject invalid data types', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .post('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: 123, // should be string
        date: 'not-a-timestamp',
        description: true, // should be string
        image_url: 42, // should be string
        num_days: 'not-a-number',
        price: 'not-a-number',
        public_id: {}, // should be string
        title: [], // should be string
        type: null, // should be string
      });

    expect(resp.status).toBe(400);
    expect(resp.body.error).toMatch(/Missing required product fields/i);
  });

  it('POST /quota-tracking should reject empty strings in required fields', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .post('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: '',
        date: 1731744000000,
        description: '',
        image_url: '',
        num_days: '1',
        price: '250',
        public_id: '',
        title: '',
        type: '',
      });

    expect(resp.status).toBe(400);
    expect(resp.body.error).toMatch(/missing required product fields/i);
  });

  it('POST /quota-tracking should reject string lengths exceeding limits', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const longString = 'a'.repeat(256);

    const resp = await request(app)
      .post('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: longString,
        date: 1731744000000,
        description: longString,
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '1',
        price: '250',
        public_id: 'at-the-fire/IMG_0749',
        title: longString,
        type: 'auction',
        qty: 1,
      });

    expect(resp.status).toBe(400);
    expect(resp.body.error).toMatch(/field length exceeds maximum/i);
  });

  it('PUT /quota-tracking/:id should handle non-existent product ID', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .put('/api/v1/quota-tracking/999')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: 'Bubblers',
        date: 1731744000000,
        description: 'Updated description',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '2',
        price: '500',
        public_id: 'at-the-fire/IMG_0749',
        title: 'updated title',
        type: 'inventory',
        qty: 1,
      });

    expect(resp.status).toBe(404);
    expect(resp.body.message).toMatch(/product not found/i);
  });

  it('DELETE /quota-tracking/:id should handle non-existent product ID', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .delete('/api/v1/quota-tracking/999')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(404);
    expect(resp.body.message).toMatch(/product not found/i);
  });

  it('PUT /quota-tracking/:id should reject invalid sold status', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .put('/api/v1/quota-tracking/1')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        category: 'Bubblers',
        date: 1731744000000,
        description: 'Updated description',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '2',
        price: '500',
        public_id: 'at-the-fire/IMG_0749',
        title: 'updated title',
        type: 'website',
        sold: 'invalid', // should be boolean
        qty: 1,
      });

    expect(resp.status).toBe(400);
    expect(resp.body.error).toMatch(/Sold status must be a boolean value/i);
  });

  describe('with mocked QuotaProduct and Post', () => {
    afterEach(() => {
      jest.restoreAllMocks(); // Ensures all spies/mocks are cleaned up after each test in this block
    });

    it('GET /quota-tracking should set post_id to null if the post does not exist', async () => {
      const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
        setupSuccessSubscribedUserMocks();

      // Mock QuotaProduct.getQuotaProducts to return a product with a non-existent post_id
      jest.spyOn(QuotaProduct, 'getQuotaProducts').mockResolvedValue([
        {
          id: '1',
          category: 'test-category',
          created_at: '2024-01-01T00:00:00.000Z',
          customer_id: 'stripe-customer-id_full',
          date: '1731744000000',
          description: 'test-description',
          image_url: 'https://example.com/image.jpg',
          num_days: '1',
          post_id: '999', // non-existent
          price: 'test-price',
          public_id: 'image-public-id',
          sold: false,
          date_sold: null,
          title: 'test-title',
          type: 'auction',
          qty: 1,
        },
      ]);
      jest.spyOn(Post, 'getById').mockResolvedValue(null);

      const resp = await request(app)
        .get('/api/v1/quota-tracking')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(resp.status).toBe(200);
      expect(resp.body[0].post_id).toBeNull();
    });

    it('GET /quota-tracking should keep post_id if the post exists', async () => {
      const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
        setupSuccessSubscribedUserMocks();

      jest.spyOn(QuotaProduct, 'getQuotaProducts').mockResolvedValue([
        {
          id: '2',
          category: 'test-category',
          created_at: '2024-01-01T00:00:00.000Z',
          customer_id: 'stripe-customer-id_full',
          date: '1731744000000',
          description: 'test-description',
          image_url: 'https://example.com/image.jpg',
          num_days: '1',
          post_id: '123', // exists
          price: 'test-price',
          public_id: 'image-public-id',
          sold: false,
          date_sold: null,
          title: 'test-title',
          type: 'auction',
          qty: 1,
        },
      ]);
      jest.spyOn(Post, 'getById').mockResolvedValue({ id: '123' });

      const resp = await request(app)
        .get('/api/v1/quota-tracking')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(resp.status).toBe(200);
      expect(resp.body[0].post_id).toBe('123');
    });
  });

  it('GET /quota-tracking sets post_id to null if the post does not exist (integration, real DB)', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    // Insert a real post
    const post = await Post.postNewPost(
      'Test Post',
      'desc',
      'http://img',
      'cat',
      '100',
      process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      'publicid',
      1,
      false,
      null
    );
    // Insert a product with a valid post_id
    await QuotaProduct.insertNewProduct({
      type: 'auction',
      date: 1731744000000,
      title: 'Product 1',
      description: 'desc',
      category: 'cat',
      price: '100',
      image_url: 'http://img',
      public_id: 'publicid',
      customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      num_days: 1,
      post_id: post.id,
      sold: false,
      date_sold: null,
      qty: 1,
    });

    // Insert a product with a non-existent post_id
    await QuotaProduct.insertNewProduct({
      type: 'auction',
      date: 1731744000000,
      title: 'Product 2',
      description: 'desc',
      category: 'cat',
      price: '100',
      image_url: 'http://img',
      public_id: 'publicid',
      customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      num_days: 1,
      post_id: 99999999, // unlikely to exist
      sold: false,
      date_sold: null,
      qty: 1,
    });

    const resp = await request(app)
      .get('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);
    expect(resp.status).toBe(200);
    // Find the products in the response
    const productWithValidPost = resp.body.find((p) => p.title === 'Product 1');
    const productWithInvalidPost = resp.body.find((p) => p.title === 'Product 2');

    expect(productWithValidPost.post_id).toBe(String(post.id));
    expect(productWithInvalidPost.post_id).toBeNull();
  });

  it('GET /quota-tracking should include sales array when sales exist (integration, real DB)', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const product = await QuotaProduct.insertNewProduct({
      type: 'inventory',
      date: 1731744000000,
      title: 'Sales embedded test product',
      description: 'desc',
      category: 'cat',
      price: '100',
      image_url: 'http://img',
      public_id: 'publicid',
      customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      num_days: 1,
      post_id: null,
      sold: false,
      date_sold: null,
      qty: 5,
    });

    const sale1 = await request(app)
      .post(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quantitySold: 1, dateSold: '1731744000000' });

    expect(sale1.status).toBe(201);

    const sale2 = await request(app)
      .post(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quantitySold: 2, dateSold: '1731744000001' });

    expect(sale2.status).toBe(201);

    const resp = await request(app)
      .get('/api/v1/quota-tracking')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(200);

    const embedded = resp.body.find((p) => p.id === String(product.id));
    expect(embedded).toBeTruthy();
    expect(embedded.sales).toEqual([
      {
        id: sale2.body.id,
        productId: String(product.id),
        quantitySold: 2,
        dateSold: '1731744000001',
      },
      {
        id: sale1.body.id,
        productId: String(product.id),
        quantitySold: 1,
        dateSold: '1731744000000',
      },
    ]);
  });
});
