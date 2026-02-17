// * ==================================================
// *
// *    This has both middlewares mocked successfully and will work for all
// *    of the Subscriber related/ CRUD end points (does not facilitate image upload)
// *
// * ==================================================

const pool = require('../../lib/utils/pool.js');
const setup = require('../../data/setup.js');
const request = require('supertest');
const app = require('../../lib/app.js');
const StripeCustomer = require('../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../lib/models/Subscriptions.js');
const Invoices = require('../../lib/models/Invoices.js');

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
jest.mock('../../lib/models/StripeCustomer', () => ({
  getStripeByAWSSub: jest.fn(),
  updateByCustomerId: jest.fn(),
}));

// Mocking the `Subscriptions` module
jest.mock('../../lib/models/Subscriptions', () => ({
  getSubscriptionByCustomerId: jest.fn(),
}));

// Mocking the `Invoices` module
jest.mock('../../lib/models/Invoices', () => ({
  getBillingPeriodByCustomerId: jest.fn(),
}));

// Abstract function to setup mock tokens, JWT, and database responses for subscribed users
const setupSubscribedUserMocks = () => {
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

describe('authenticateAWS Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    return setup(pool);
  });
  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  //! WORKS: SELECT ALL COPY/ PASTE & USE FOR TEMPLATES
  it.skip('should allow access to subscription-only routes for subscribed users', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    // Sending the request with all three required tokens as cookies
    const response = await request(app)
      .get('/api/v1/dashboard') // Subscription-only route
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    // We expect the authentication and authorization middleware to pass
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ posts: [], restricted: false });
  });
});
