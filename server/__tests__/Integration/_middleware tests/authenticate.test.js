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

describe('authenticateAWS Middleware', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    return setup(pool);
  });
  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  it('should return 401 when tokens are missing', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session');
    expect(response.body.code).toBe(401);
    expect(response.body.type).toBe('MissingOrInvalidToken');
    expect(response.body.message).toBe(
      'You must be signed in to continue: missing or invalid token'
    );
  });

  it('should allow access with valid tokens', async () => {
    const validAccessToken = 'valid.access.token';
    const mockDecodedIdToken = { sub: 'user-subject-123' };
    const validIdToken = jwt.sign(mockDecodedIdToken, 'test-secret');
    const validRefreshToken = 'valid.refresh.token';

    const sessionData = {
      accessToken: { jwtToken: validAccessToken },
      idToken: { jwtToken: validIdToken },
      refreshToken: { token: validRefreshToken },
    };

    const response = await request(app)
      .post('/api/v1/auth/create-cookies')
      .send(sessionData)
      .set('Cookie', [
        `accessToken=${validAccessToken};`,
        `idToken=${validIdToken};`,
        `refreshToken=${validRefreshToken};`,
      ]);

    expect(response.status).toBe(200); // Corrected from `response.body`
    expect(response.body.message).toBe('Cookies created successfully!'); // Ensure you access the `message` property of the body
  });

  it('should reject access with invalid tokens', async () => {
    // Simulate sending an invalid but decodable token
    const mockInvalidDecodedToken = {
      sub: 'invalid-user-subject', // Include sub to avoid the "sub is missing" error
    };

    // Generate a mock invalid ID token
    const invalidIdToken = jwt.sign(mockInvalidDecodedToken, 'wrong-secret');

    // Mock `jwt.decode` for this test specifically to return the mocked decoded token
    jwt.decode.mockImplementationOnce(() => {
      return mockInvalidDecodedToken; // Ensure the sub is present here
    });

    // Mock `jwt.verify` to simulate a verification error for this invalid token
    jwt.verify.mockImplementationOnce((token, getKey, options, callback) => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      callback(error, null); // Simulate verification error
    });

    const response = await request(app)
      .put('/api/v1/profile/user-update')
      .set('Cookie', [
        'accessToken=invalid.access.token;', // Arbitrary value since jwt.verify is mocked
        `idToken=${invalidIdToken};`,
        'refreshToken=invalid.refresh.token;', // Arbitrary value since jwt.verify is mocked
      ]);

    // Expecting the middleware to reject access due to verification failure
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('User does not exist');
  });

  it('should reject access with expired tokens', async () => {
    // Simulate sending an expired but otherwise valid token
    const mockExpiredDecodedToken = {
      sub: 'user-subject',
      exp: Math.floor(Date.now() / 1000) - 30,
    }; // expired 30 seconds ago
    const expiredIdToken = jwt.sign(mockExpiredDecodedToken, 'test-secret'); // Sign with any secret as it's mocked

    // Mock `jwt.decode` for this test specifically to return the mocked decoded token
    jwt.decode.mockImplementationOnce(() => {
      return mockExpiredDecodedToken; // Ensure the sub is present here
    });

    // Mock jwt.verify specifically for this test to simulate an expired token
    jwt.verify.mockImplementationOnce((token, getKey, options, callback) => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      callback(error, null); // Simulate expiration error
    });

    const response = await request(app)
      .put('/api/v1/profile/user-update')
      .set('Cookie', [
        'accessToken=any.valid.token;',
        `idToken=${expiredIdToken};`,
        'refreshToken=any.valid.token;',
      ]);

    // Expecting the middleware to reject access and the route to return a 401 status
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('User does not exist');
  });

  it('should handle verification errors gracefully', async () => {
    // Simulate sending a token that causes a verification error
    const problematicToken = 'problematic.token';

    // Mock jwt.verify specifically for this test to simulate a verification error
    jwt.verify.mockImplementationOnce((token, getKey, options, callback) => {
      const error = new Error('invalid signature');
      error.name = 'JsonWebTokenError';
      callback(error, null); // Simulate verification error
    });

    const response = await request(app)
      .put('/api/v1/profile/user-update')
      .set('Cookie', [
        `accessToken=${problematicToken};`,
        `idToken=${problematicToken};`,
        `refreshToken=${problematicToken};`,
      ]);

    // Expecting the middleware to handle the error and respond appropriately
    expect(response.status).toBe(401); // Expecting a 401 status for token verification errors
    expect(response.body.message).toContain('Invalid token structure: sub is missing');
  });

  it('should reject access when the sub field is missing from the token', async () => {
    // Simulate sending a token that is missing the 'sub' field
    const tokenWithoutSub = jwt.sign(
      {
        /* other fields but no 'sub' */
      },
      'test-secret'
    );

    // Make the request with the token that lacks 'sub'
    const response = await request(app)
      .put('/api/v1/profile/user-update')
      .set('Cookie', `accessToken=${tokenWithoutSub}; idToken=${tokenWithoutSub};`);

    // Expecting the middleware to reject access due to missing 'sub' in the token
    expect(response.status).toBe(401); // Assuming your middleware responds with 401 for missing 'sub'
    expect(response.body.message).toContain(
      'You must be signed in to continue: missing or invalid token'
    ); // Adjust the error message based on your actual middleware response
  });

  it('should deny access to subscription-only routes for free users', async () => {
    // Mock valid tokens for a free user
    const freeUserAccessToken = 'valid.free.user.access.token';
    const freeUserIdToken = 'valid.free.user.id.token';
    const freeUserRefreshToken = 'valid.free.user.refresh.token';

    // Mock the `jwt.decode` function to decode the idToken and return a token with `sub`
    jwt.decode.mockImplementation((token) => {
      if (token === 'valid.free.user.id.token') {
        return { sub: 'sub_noProfile' };
      }
      return null;
    });

    jwt.verify.mockImplementation((token, getKey, options, callback) => {
      if (
        token === 'valid.free.user.access.token' ||
        token === 'valid.free.user.id.token' ||
        token === 'valid.free.user.refresh.token'
      ) {
        // Simulate a valid token verification
        callback(null, { sub: 'free-user-sub' }); // Return an object with `sub` after successful verification
      } else {
        callback(new Error('Invalid token')); // Simulate failed verification
      }
    });

    // Sending the request with all three required tokens as cookies
    const response = await request(app)
      .get('/api/v1/dashboard') // This is your subscription-only route
      .set('Cookie', [
        `accessToken=${freeUserAccessToken};`,
        `idToken=${freeUserIdToken};`,
        `refreshToken=${freeUserRefreshToken};`,
      ]);

    // We expect to get past authentication middleware, but the route should restrict access due to role
    expect(response.status).toBe(403); // Expecting 403 forbidden status code
    expect(response.body.message).toContain('You do not have access to view this page');
  });

  //! ALERT:
  // todo both tests below need to move into Authorize related test file (not created at this time 10.27.24)
  it('should allow access to subscription-only routes for subscribed users', async () => {
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

    // Sending the request with all three required tokens as cookies
    const response = await request(app)
      .get('/api/v1/dashboard') // Subscription-only route
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

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
  it('should still allow access to /dashboard route for subscribed users with inactive subscription', async () => {
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
      isActive: false,
    });
    // Mock the database call to return the billing period for a subscribed user
    Invoices.getBillingPeriodByCustomerId.mockResolvedValue({
      endDate: '2722668400000',
    });

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
      restricted: true,
    });
  });
});
