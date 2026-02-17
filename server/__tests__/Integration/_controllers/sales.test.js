const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');
const QuotaProduct = require('../../../lib/models/QuotaProduct.js');

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

describe('sales routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    return setup(pool);
  });

  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  const insertTestProduct = async ({ qty = 3, sold = false } = {}) => {
    return QuotaProduct.insertNewProduct({
      type: 'inventory',
      date: 1731744000000,
      title: 'Sales Test Product',
      description: 'desc',
      category: 'cat',
      price: '100',
      image_url: 'http://img',
      public_id: 'publicid',
      customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      num_days: 1,
      post_id: null,
      sold,
      date_sold: null,
      qty,
    });
  };

  it('GET /quota-tracking/:productId/sales should return empty list', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const product = await insertTestProduct({ qty: 3 });

    const resp = await request(app)
      .get(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual([]);
  });

  it('POST /quota-tracking/:productId/sales should create a sale', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const product = await insertTestProduct({ qty: 3 });

    const resp = await request(app)
      .post(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        quantitySold: 1,
        dateSold: '1731744000000',
      });

    expect(resp.status).toBe(201);
    expect(resp.body).toEqual({
      id: expect.any(Number),
      productId: String(product.id),
      quantitySold: 1,
      dateSold: '1731744000000',
    });

    const updatedProduct = await QuotaProduct.getQuotaProductById(product.id);
    expect(updatedProduct.sold).toBe(false);

    const getResp = await request(app)
      .get(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(getResp.status).toBe(200);
    expect(getResp.body).toEqual([
      {
        id: resp.body.id,
        productId: String(product.id),
        quantitySold: 1,
        dateSold: '1731744000000',
      },
    ]);
  });

  it('POST /quota-tracking/:productId/sales should mark product as sold when total meets qty', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const product = await insertTestProduct({ qty: 2 });

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
      .send({ quantitySold: 1, dateSold: '1731744000001' });

    expect(sale2.status).toBe(201);

    const updatedProduct = await QuotaProduct.getQuotaProductById(product.id);
    expect(updatedProduct.sold).toBe(true);
    expect(updatedProduct.date_sold).toBe('1731744000001');

    const getResp = await request(app)
      .get(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(getResp.status).toBe(200);
    expect(getResp.body).toEqual([
      {
        id: sale2.body.id,
        productId: String(product.id),
        quantitySold: 1,
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

  it('POST /quota-tracking/:productId/sales should prevent overselling', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const product = await insertTestProduct({ qty: 2 });

    const firstSale = await request(app)
      .post(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quantitySold: 2, dateSold: '1731744000000' });

    expect(firstSale.status).toBe(201);

    const oversell = await request(app)
      .post(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quantitySold: 1, dateSold: '1731744000001' });

    expect(oversell.status).toBe(400);
    expect(oversell.body.error).toMatch(/Sale exceeds available stock/i);
  });

  it('POST /quota-tracking/:productId/sales should return 404 for missing product', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const resp = await request(app)
      .post('/api/v1/quota-tracking/99999999/sales')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quantitySold: 1, dateSold: '1731744000000' });

    expect(resp.status).toBe(404);
    expect(resp.body).toEqual({ error: 'Product not found' });
  });

  it('PUT /quota-tracking/:productId/sales/:saleId should update a sale', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const product = await insertTestProduct({ qty: 5 });

    const created = await request(app)
      .post(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quantitySold: 1, dateSold: '1731744000000' });

    expect(created.status).toBe(201);

    const updated = await request(app)
      .put(`/api/v1/quota-tracking/${product.id}/sales/${created.body.id}`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quantitySold: 2, dateSold: '1731744000001' });

    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({
      id: created.body.id,
      productId: String(product.id),
      quantitySold: 2,
      dateSold: '1731744000001',
    });

    const getResp = await request(app)
      .get(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(getResp.status).toBe(200);
    expect(getResp.body).toEqual([
      {
        id: created.body.id,
        productId: String(product.id),
        quantitySold: 2,
        dateSold: '1731744000001',
      },
    ]);
  });

  it('DELETE /quota-tracking/:productId/sales/:saleId should delete a sale', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const product = await insertTestProduct({ qty: 5 });

    const created = await request(app)
      .post(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quantitySold: 1, dateSold: '1731744000000' });

    expect(created.status).toBe(201);

    const deleted = await request(app)
      .delete(`/api/v1/quota-tracking/${product.id}/sales/${created.body.id}`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(deleted.status).toBe(204);

    const getResp = await request(app)
      .get(`/api/v1/quota-tracking/${product.id}/sales`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(getResp.status).toBe(200);
    expect(getResp.body).toEqual([]);
  });

  it('DELETE /quota-tracking/:productId/sales/:saleId should return 404 when sale is missing', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSuccessSubscribedUserMocks();

    const product = await insertTestProduct({ qty: 5 });

    const resp = await request(app)
      .delete(`/api/v1/quota-tracking/${product.id}/sales/99999999`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(404);
    expect(resp.body).toEqual({ error: 'Sale not found' });
  });
});
