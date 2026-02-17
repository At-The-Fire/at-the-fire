const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');

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
      callback(null, { sub: 'sub_fullCustomer' });
    } else {
      // Simulate verification failure
      callback(new Error('Invalid token'));
    }
  }),
  decode: jest.fn((token) => {
    if (token === 'valid.free.user.id.token') {
      // Return a mock decoded token with `sub`
      return { sub: 'sub_fullCustomer' };
    } else {
      return null; // Invalid token case
    }
  }),
}));

// Mocking the `StripeCustomer` module
jest.mock('../../../lib/models/StripeCustomer', () => ({
  getStripeByAWSSub: jest.fn(),
  updateByCustomerId: jest.fn(),
}));

// Mocking the `Subscriptions` module
jest.mock('../../../lib/models/Subscriptions', () => ({
  getSubscriptionByCustomerId: jest.fn(),
}));

// Mocking the `Invoices` module
jest.mock('../../../lib/models/Invoices', () => ({
  getBillingPeriodByCustomerId: jest.fn(),
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

  StripeCustomer.updateByCustomerId.mockResolvedValue([
    process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    'John Smith',
    process.env.TEST_EMAIL_FULL_CUSTOMER,
    null,
    'Example Business Name',
    'www.example.com',
    'image.com',
    'image_id',
  ]);

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

describe('authenticateAWS Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    return setup(pool);
  });
  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  it('GET /goals should get goals for subscribed users', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Sending the request with all three required tokens as cookies
    const response = await request(app)
      .get('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    // We expect the authentication and authorization middleware to pass
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: '1',
        created_at: expect.any(String),
        monthly_quota: '5000',
        work_days: '25',
        customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      },
    ]);
  });

  it('GET /goals should return 401 when missing authentication tokens', async () => {
    const response = await request(app).get('/api/v1/goals');
    expect(response.status).toBe(401);
  });

  it('PUT /goals should update goals for subscribed users', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    const updatedGoals = { quotaData: { monthly_quota: 6000, work_days: 22 } };

    const response = await request(app)
      .put('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send(updatedGoals);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: expect.any(String),
        created_at: expect.any(String),
        monthly_quota: '6000',
        work_days: '22',
        customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      },
    ]);
  });

  it('PUT /goals should return 403 for inactive subscriptions', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Override the subscription mock to return inactive
    Subscriptions.getSubscriptionByCustomerId.mockResolvedValue({
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      isActive: false,
    });

    const updatedGoals = {
      quotaData: {
        monthly_quota: 6000,
        work_days: 22,
      },
    };

    const response = await request(app)
      .put('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send(updatedGoals);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: 'Your subscription is inactive. You cannot edit goals.',
    });
  });

  it('PUT /goals should return 401 when missing authentication tokens', async () => {
    const updatedGoals = {
      monthly_quota: 6000,
      work_days: 22,
    };

    const response = await request(app).put('/api/v1/goals').send(updatedGoals);

    expect(response.status).toBe(401);
  });

  it('PUT /goals should return 400 when quotaData is an empty object', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    const response = await request(app)
      .put('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quotaData: {} });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Monthly quota and work days are required fields'
    );
  });

  it('PUT /goals should return 400 when request body is empty', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    const response = await request(app)
      .put('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Request must include quotaData object');
  });

  it('PUT /goals should return 400 when request is missing quotaData wrapper', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    const response = await request(app)
      .put('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ work_days: 22 }); // Malformed - should be inside quotaData object

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Request must include quotaData object');
  });

  it('PUT /goals should return 400 when work_days is invalid', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    const response = await request(app)
      .put('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quotaData: { monthly_quota: 5000, work_days: 32 } });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'work_days must be a number between 1 and 31'
    );
  });

  it('PUT /goals should return 400 when monthly_quota is not a positive number', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    const response = await request(app)
      .put('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quotaData: { monthly_quota: -5000, work_days: 22 } });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Monthly quota must be a positive number'
    );
  });
  it('PUT /goals should return 400 when monthly_quota is not a number', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    const response = await request(app)
      .put('/api/v1/goals')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ quotaData: { monthly_quota: 'not-a-number', work_days: 22 } });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Monthly quota must be a positive number'
    );
  });
});
