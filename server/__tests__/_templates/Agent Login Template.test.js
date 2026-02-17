//! NOT WORKING YET =======================================================================================
//! NOT WORKING YET =======================================================================================
//! NOT WORKING YET =======================================================================================

const pool = require('../../lib/utils/pool.js');
const setup = require('../../data/setup.js');
const request = require('supertest');
const app = require('../../lib/app.js');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'), // Preserve other actual implementations
  verify: jest.fn((token, getKey, options, callback) => {
    // Always simulate successful verification for any test token
    if (token.includes('valid')) {
      callback(null, { sub: process.env.TEST_SUB_FULL_CUSTOMER });
    } else {
      callback(new Error('Invalid token'));
    }
  }),
  decode: jest.fn((token) => {
    // Return a mock decoded token if it matches expected format
    if (token.includes('valid')) {
      return { sub: process.env.TEST_SUB_FULL_CUSTOMER };
    } else {
      return null; // Invalid token case
    }
  }),
}));

// Abstracted function to simulate a login flow for a user that exists in the database
const simulateLogin = async (userProps = {}) => {
  // Use a user from your existing database setup
  const defaultUser = {
    awsSub: process.env.TEST_SUB_FULL_CUSTOMER, // Make sure each test user has a known `sub` in your test setup
    email: process.env.TEST_EMAIL_FULL_CUSTOMER,
    password: 'password123',
    customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER, // Corresponds to existing Stripe customer for testing
  };

  const user = { ...defaultUser, ...userProps };

  // Create an agent to manage cookies between requests
  const agent = request.agent(app);

  // Instead of logging in through Cognito, we simulate authentication by issuing a JWT
  const mockedAccessToken = jwt.sign(
    { sub: user.awsSub, email: user.email },
    process.env.JWT_SECRET || 'your-jwt-secret-key',
    { expiresIn: '1h', header: { kid: 'mock-key-id' } }
  );

  const mockedIdToken = jwt.sign(
    { sub: user.awsSub, email: user.email },
    process.env.JWT_SECRET || 'your-jwt-secret-key',
    { expiresIn: '1h' }
  );

  const mockedRefreshToken = jwt.sign(
    { sub: user.awsSub },
    process.env.JWT_SECRET || 'your-jwt-secret-key',
    { expiresIn: '7d' }
  );

  // Add these tokens as cookies to the agent to simulate a logged-in user
  agent.jar.setCookie(`accessToken=${mockedAccessToken}`);
  agent.jar.setCookie(`idToken=${mockedIdToken}`);
  agent.jar.setCookie(`refreshToken=${mockedRefreshToken}`);

  return { agent, user };
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

  it.skip('should allow access to subscription-only routes for subscribed users', async () => {
    // Log in using an existing user
    const { agent } = await simulateLogin();

    // Send a request with the agent that has the session cookies
    const response = await agent.get('/api/v1/dashboard'); // Subscription-only route

    // Expect the authentication and authorization middleware to pass
    expect(response).toBe(200);
    expect(response.body).toEqual({ posts: [], restricted: false });
  });
});
