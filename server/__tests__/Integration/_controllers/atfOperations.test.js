const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');
const jwt = require('jsonwebtoken');
const AWSUser = require('../../../lib/models/AWSUser.js');

// Mock AWS and Stripe
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('stripe');

// Keep original JWT mock setup
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn(),
  decode: jest.fn(),
}));

// Original model mocks
jest.mock('../../../lib/models/StripeCustomer', () => ({
  getStripeByAWSSub: jest.fn(),
  getAllCustomers: jest.fn(),
  deleteSubscriber: jest.fn(),
}));

jest.mock('../../../lib/models/Subscriptions', () => ({
  getSubscriptionByCustomerId: jest.fn(),
  getAllSubscriptions: jest.fn(),
}));

jest.mock('../../../lib/models/Invoices', () => ({
  getBillingPeriodByCustomerId: jest.fn(),
  getInvoices: jest.fn(),
}));

jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  return {
    CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}), // Default success case
    })),
    AdminDeleteUserCommand: jest.fn().mockImplementation((input) => ({ input })),
  };
});

// Original middleware mock setup
const setupSubscribedUserMocks = () => {
  const subscribedUserAccessToken = 'valid.subscriber.access.token';
  const subscribedUserIdToken = 'valid.subscriber.id.token';
  const subscribedUserRefreshToken = 'valid.subscriber.refresh.token';

  jwt.decode.mockImplementation((token) => {
    if (token === 'valid.subscriber.id.token') {
      return { sub: process.env.TEST_SUB_FULL_CUSTOMER };
    }
    return null;
  });

  jwt.verify.mockImplementation((token, getKey, options, callback) => {
    if (
      token === 'valid.subscriber.access.token' ||
      token === 'valid.subscriber.id.token' ||
      token === 'valid.subscriber.refresh.token'
    ) {
      callback(null, { sub: process.env.TEST_SUB_FULL_CUSTOMER });
    } else {
      callback(new Error('Invalid token'));
    }
  });

  StripeCustomer.getStripeByAWSSub.mockResolvedValue({
    customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    awsSub: process.env.TEST_SUB_FULL_CUSTOMER,
    confirmed: true,
  });

  Subscriptions.getSubscriptionByCustomerId.mockResolvedValue({
    customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    isActive: true,
  });

  Invoices.getBillingPeriodByCustomerId.mockResolvedValue({
    endDate: '2722668400000',
  });

  AWSUser.deleteUser = jest.fn().mockImplementation((sub) => {
    if (sub === process.env.TEST_SUB_FULL_CUSTOMER) {
      return Promise.resolve({}); // Success case
    } else {
      return Promise.resolve(null); // Non-existent user case
    }
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

    // Set up AWS mock implementation
    const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
    CognitoIdentityProviderClient.prototype.send = jest.fn().mockResolvedValue({});

    // Set up Stripe mock implementation
    const Stripe = require('stripe');
    Stripe.mockImplementation(() => ({
      customers: {
        del: jest.fn().mockResolvedValue({}),
      },
    }));

    // Set up StripeCustomer mock implementation
    StripeCustomer.deleteSubscriber.mockImplementation((sub) => {
      if (sub === process.env.TEST_SUB_FULL_CUSTOMER) {
        return Promise.resolve({});
      }
      return Promise.resolve(null);
    });

    return setup(pool);
  });

  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  it('GET / should return all data when authenticated', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSubscribedUserMocks();

    const response = await request(app)
      .get('/api/v1/atf-operations/')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      users: expect.any(Array),
      posts: expect.any(Array),
    });
  });

  it('DELETE /delete-user/:sub should delete user when authenticated', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSubscribedUserMocks();

    const response = await request(app)
      .delete(`/api/v1/atf-operations/delete-user/${process.env.TEST_SUB_FULL_CUSTOMER}`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'User successfully deleted from both DB and Cognito',
    });
  });

  it('DELETE /delete-user/:sub should return 404 for non-existent user', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSubscribedUserMocks();

    // Override AWS mock for this test
    const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
    CognitoIdentityProviderClient.prototype.send = jest
      .fn()
      .mockRejectedValueOnce(new Error('User does not exist'));

    const response = await request(app)
      .delete('/api/v1/atf-operations/delete-user/non-existent-sub')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: 'User not found in DB',
    });
  });

  it('DELETE /delete-subscriber/:sub should delete subscriber when authenticated', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSubscribedUserMocks();

    const response = await request(app)
      .delete(`/api/v1/atf-operations/delete-subscriber/${process.env.TEST_SUB_FULL_CUSTOMER}`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Subscriber successfully deleted from both DB and Stripe',
    });
  });

  it('DELETE /delete-subscriber/:sub should return 404 for non-existent subscriber', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSubscribedUserMocks();

    // Override getStripeByAWSSub to return null for non-existent user
    StripeCustomer.getStripeByAWSSub.mockImplementationOnce((sub) => {
      if (sub === 'non-existent-sub') {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
        awsSub: process.env.TEST_SUB_FULL_CUSTOMER,
        confirmed: true,
      });
    });

    const response = await request(app)
      .delete('/api/v1/atf-operations/delete-subscriber/non-existent-sub')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: 'Subscriber not found in DB',
    });
  });

  it('GET /invoices should return invoices when found', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSubscribedUserMocks();

    // Mock Invoices.getInvoices to return a list
    const mockInvoices = [
      { invoiceId: 'inv_1', amountDue: 100, amountPaid: 100 },
      { invoiceId: 'inv_2', amountDue: 200, amountPaid: 150 },
    ];
    Invoices.getInvoices = jest.fn().mockResolvedValue(mockInvoices);

    const response = await request(app)
      .get('/api/v1/atf-operations/invoices')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockInvoices);
  });

  it('GET /invoices should return 404 if no invoices found', async () => {
    const { subscribedUserAccessToken, subscribedUserIdToken, subscribedUserRefreshToken } =
      setupSubscribedUserMocks();

    // Mock Invoices.getInvoices to return null
    Invoices.getInvoices = jest.fn().mockResolvedValue(null);

    const response = await request(app)
      .get('/api/v1/atf-operations/invoices')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'No invoices found.' });
  });
});
