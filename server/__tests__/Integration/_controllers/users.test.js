// * ==================================================
// *
// *    This has both middlewares mocked successfully and will work for all
// *    of the Subscriber related/ CRUD end points (does not facilitate image upload)
// *
// * ==================================================

const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');

// Importing jsonwebtoken to mock its verify function
const jwt = require('jsonwebtoken');
const AWSUser = require('../../../lib/models/AWSUser.js');

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
  getStripeByAWSSub: jest.fn(), // Mock the `getStripeByAWSSub` function
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
const setupSubscribedUserMocks = () => {
  // Mock a valid token for a subscribed user
  const subscribedUserAccessToken = 'valid.subscriber.access.token';
  const subscribedUserIdToken = 'valid.subscriber.id.token';
  const subscribedUserRefreshToken = 'valid.subscriber.refresh.token';

  // Mock the `jwt.decode` function to decode the idToken and return a token with `sub`
  jwt.decode.mockImplementation((token) => {
    if (token === 'valid.subscriber.id.token') {
      return { sub: 'sub_fullCustomer' }; // Simulated structure of a valid decoded JWT
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
      callback(null, { sub: 'sub_fullCustomer' });
    } else {
      callback(new Error('Invalid token'));
    }
  });

  //   Mock the database call to return a valid customer ID for a subscribed user
  StripeCustomer.getStripeByAWSSub.mockResolvedValue({
    customerId: 'stripe-customer-id_full',
    awsSub: 'sub_fullCustomer',
    confirmed: true,
  });

  // Mock the database call to return the subscription status for a subscribed user
  Subscriptions.getSubscriptionByCustomerId.mockResolvedValue({
    customerId: 'stripe-customer-id_full',
    isActive: true,
  });

  //   Mock the database call to return the billing period for a subscribed user
  Invoices.getBillingPeriodByCustomerId.mockResolvedValue({
    endDate: '2722668400000',
  });

  return {
    subscribedUserAccessToken,
    subscribedUserIdToken,
    subscribedUserRefreshToken,
  };
};

// Mock the AWSUser model
// jest.mock('../../../lib/models/AWSUser.js', () => ({
//   searchUsers: jest.fn(),
//   getCognitoUserBySub: jest.fn(),
// }));

describe('Search Route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ALL_TEST_USERS = 'test-sub-1,test-sub-2';
    return setup(pool);
  });

  it('should successfully search users with URL query parameter "search"', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .get('/api/v1/users/?search=testquery')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should return 400 when search term is missing', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .get('/api/v1/users/?search=')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid search term' });
  });

  it('should return 400 when search term is not a string', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .get('/api/v1/users/?search')
      .query({ search: 123 }) // non-string search term
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid search term' });
  });

  it('should handle database errors gracefully', async () => {
    // Setup the mock just for this test
    jest.spyOn(AWSUser, 'searchUsers').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .get('/api/v1/users/?search=user_super_duper')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(500);
  });

  it('should filter out requesting user and test users from results', async () => {
    // Temporarily mock searchUsers just for this test

    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .get('/api/v1/users/?search=sub_noprofile')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(200);
  });
});
