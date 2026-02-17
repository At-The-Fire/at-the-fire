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
      callback(null, { sub: 'free-user-sub' });
    } else {
      // Simulate verification failure
      callback(new Error('Invalid token'));
    }
  }),
  decode: jest.fn((token) => {
    if (token === 'valid.free.user.id.token') {
      // Return a mock decoded token with `sub`
      return { sub: 'free-user-sub' };
    } else {
      return null; // Invalid token case
    }
  }),
}));

// Mocking the `StripeCustomer` module
jest.mock('../../lib/models/StripeCustomer', () => ({
  getStripeByAWSSub: jest.fn(), // Mock the `getStripeByAWSSub` function
}));

// Mocking the `Subscriptions` module
jest.mock('../../lib/models/Subscriptions', () => ({
  getSubscriptionByCustomerId: jest.fn(), // Mock the `getSubscriptionByCustomerId` function
}));

// Mocking the `Invoices` module
jest.mock('../../lib/models/Invoices', () => ({
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

  // Mock the database call to return a valid customer ID for a subscribed user
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
    jest.resetAllMocks();
    return setup(pool);
  });
  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  //! WORKS: USE FOR TEMPLATES
  // Using the abstracted function in the test
  it('==TEMPLATE TEST SUITE== 403 PASSING should allow access to subscription-only routes for subscribed users', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSubscribedUserMocks();

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
    expect(response.body).toEqual({
      posts: [
        {
          category: 'SampleCategory3',
          created_at: expect.any(String),
          customer_id: 'stripe-customer-id_full',
          description: 'SampleDescription3',
          id: '3',
          image_url: 'sample_image_url_path_3',
          num_imgs: '1',
          price: 'SamplePrice3',
          public_id: 'publicID_post_3',
          sold: false,
          date_sold: null,
          title: 'SampleTitle3',
        },
        {
          category: 'SampleCategory4',
          created_at: expect.any(String),
          customer_id: 'stripe-customer-id_full',
          description: 'SampleDescription4',
          id: '4',
          image_url: 'sample_image_url_path_4',
          num_imgs: '2',
          price: 'SamplePrice4',
          public_id: 'publicID_post_4',
          sold: false,
          date_sold: null,
          title: 'SampleTitle4',
        },
      ],
      restricted: false,
    });
  });
});
