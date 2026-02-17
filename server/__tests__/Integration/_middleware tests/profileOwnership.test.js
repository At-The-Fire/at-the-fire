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
      callback(null, { sub: 'sub_noProfile' });
    } else {
      // Simulate verification failure
      callback(new Error('Invalid token'));
    }
  }),
  decode: jest.fn((token) => {
    if (token === 'valid.free.user.id.token') {
      // Return a mock decoded token with `sub`
      return { sub: 'sub_noProfile' };
    } else {
      return null; // Invalid token case
    }
  }),
}));

// Mocking the `StripeCustomer` module
jest.mock('../../../lib/models/StripeCustomer', () => ({
  getStripeByAWSSub: jest.fn(), // Existing mock
  updateByCustomerId: jest.fn(), // Add the missing method mock
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
const setupFailedSubscribedUserMocks = () => {
  // Mock a valid token for a subscribed user
  const subscribedUserAccessToken = 'valid.subscriber.access.token';
  const subscribedUserIdToken = 'valid.subscriber.id.token';
  const subscribedUserRefreshToken = 'valid.subscriber.refresh.token';

  // Mock the `jwt.decode` function to decode the idToken and return a token with `sub`
  jwt.decode.mockImplementation((token) => {
    if (token === 'valid.subscriber.id.token') {
      return { sub: 'sub_noProfile' }; // Simulated structure of a valid decoded JWT
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
      callback(null, { sub: 'sub_noProfile' });
    } else {
      callback(new Error('Invalid token'));
    }
  });

  // Mock the database call to return a valid customer ID for a subscribed user
  StripeCustomer.getStripeByAWSSub.mockResolvedValue(undefined);

  StripeCustomer.updateByCustomerId.mockRejectedValue(
    new Error('You are not authorized to update this profile')
  );

  // Mock the database call to return the subscription status for a subscribed user
  Subscriptions.getSubscriptionByCustomerId.mockResolvedValue({
    customerId: undefined,
    isActive: undefined,
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
const setupSuccessSubscribedUserMocks = () => {
  // Mock a valid token for a subscribed user
  const subscribedUserAccessToken = 'valid.subscriber.access.token';
  const subscribedUserIdToken = 'valid.subscriber.id.token';
  const subscribedUserRefreshToken = 'valid.subscriber.refresh.token';

  // Mock the `jwt.decode` function to decode the idToken and return a token with `sub`
  jwt.decode.mockImplementation((token) => {
    if (token === 'valid.subscriber.id.token') {
      return { sub: 'sub_noProfile' }; // Simulated structure of a valid decoded JWT
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
      callback(null, { sub: 'sub_noProfile' });
    } else {
      callback(new Error('Invalid token'));
    }
  });

  // Mock the database call to return a valid customer ID for a subscribed user
  StripeCustomer.getStripeByAWSSub.mockResolvedValue({
    customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
  });

  StripeCustomer.updateByCustomerId.mockResolvedValue([
    process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    'John Smith',
    'fullCustomer@email.com',
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

  it('PUT /profile/customer-update, should return a 403 if user is not authorized to update profile', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupFailedSubscribedUserMocks();

    const resp = await request(app)
      .put('/api/v1/profile/customer-update')
      .send({
        firstName: 'First',
        lastName: 'Last',
        bio: 'Bio for profile user',
        imageUrl: 'image_url_path',
        publicId: 'publicID_profile',
      })
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    const profile = resp.body;

    expect(resp.status).toBe(403);
    expect(profile.message).toBe('You do not have access to view this page');
  });

  it('PUT /profile/customer-update should allow access when customer ID matches and sub is valid', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Mock matching customer ID scenario
    StripeCustomer.getStripeByAWSSub.mockResolvedValue({
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      awsSub: 'sub_noProfile',
      confirmed: true,
    });

    const resp = await request(app)
      .put('/api/v1/profile/customer-update')
      .send({
        firstName: 'First',
        lastName: 'Last',
        customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      })
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual([
      'stripe-customer-id_full',
      'John Smith',
      'fullCustomer@email.com',
      null,
      'Example Business Name',
      'www.example.com',
      'image.com',
      'image_id',
    ]);
  });

  it('PUT /profile/customer-update should return 403 when customer lookup fails', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Mock failed customer lookup
    StripeCustomer.getStripeByAWSSub.mockResolvedValue(null);

    const resp = await request(app)
      .put('/api/v1/profile/customer-update')
      .send({
        firstName: 'First',
        lastName: 'Last',
        customerId: 'any-customer-id',
      })
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(403);
    expect(resp.body).toEqual({
      code: 403,
      message: 'You do not have access to view this page',
    });
  });

  it('PUT /profile/customer-update should return 403 when customer IDs do not match', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Mock mismatched customer ID scenario
    StripeCustomer.getStripeByAWSSub.mockResolvedValue({
      customerId: 'actual-customer-id',
      awsSub: 'sub_noProfile',
      confirmed: true,
    });

    const resp = await request(app)
      .put('/api/v1/profile/customer-update')
      .send({
        firstName: 'First',
        lastName: 'Last',
        customerId: 'different-customer-id', // Doesn't match mocked return
      })
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(403);
    expect(resp.body).toEqual({
      code: 403,
      message:
        'You are not a current customer or your subscription is not active',
    });
  });

  it('PUT /profile/customer-update should return 500 when getStripeByAWSSub throws an error', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Mock database error
    StripeCustomer.getStripeByAWSSub.mockRejectedValue(
      new Error('Database error')
    );

    const resp = await request(app)
      .put('/api/v1/profile/customer-update')
      .send({
        firstName: 'First',
        lastName: 'Last',
        customerId: 'any-customer-id',
      })
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(resp.status).toBe(500);
    expect(resp.body).toEqual({
      message: 'Database error',
      status: 500,
    });
  });
});
