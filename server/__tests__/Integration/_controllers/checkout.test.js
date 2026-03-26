const request = require('supertest');
const app = require('../../../lib/app');
const { getSubscriptionByCustomerId } = require('../../../lib/models/Subscriptions.js');

// Define mock fns ONCE in the factory and attach to the constructor so all
// instances (test file + controller module) share the same underlying mocks.
jest.mock('stripe', () => {
  const mockCustomersCreate = jest.fn().mockResolvedValue({ id: 'cus_mockedId' });
  const mockCustomersList = jest.fn().mockResolvedValue({ data: [] });
  const mockSessionsCreate = jest.fn().mockResolvedValue({ url: 'http://mock-session-url.com' });
  const mockSubscriptionsUpdate = jest.fn().mockResolvedValue({ id: 'sub_mockedId' });

  const MockStripe = jest.fn().mockImplementation(() => ({
    customers: { create: mockCustomersCreate, list: mockCustomersList },
    checkout: { sessions: { create: mockSessionsCreate } },
    subscriptions: { update: mockSubscriptionsUpdate },
  }));

  MockStripe._mockCustomersCreate = mockCustomersCreate;
  MockStripe._mockCustomersList = mockCustomersList;
  MockStripe._mockSessionsCreate = mockSessionsCreate;
  MockStripe._mockSubscriptionsUpdate = mockSubscriptionsUpdate;

  return MockStripe;
});

jest.mock('../../../lib/middleware/authenticateAWS', () => {
  return (req, res, next) => {
    req.userAWSSub = 'mockedSub';
    next();
  };
});

jest.mock('../../../lib/models/Subscriptions.js', () => ({
  getSubscriptionByCustomerId: jest.fn().mockResolvedValue(null),
}));

const StripeMock = require('stripe');
const mockCustomersCreate = StripeMock._mockCustomersCreate;
const mockCustomersList = StripeMock._mockCustomersList;
const mockSessionsCreate = StripeMock._mockSessionsCreate;
const mockSubscriptionsUpdate = StripeMock._mockSubscriptionsUpdate;

beforeEach(() => {
  mockCustomersCreate.mockClear();
  mockCustomersList.mockClear();
  mockSessionsCreate.mockClear();
  mockSubscriptionsUpdate.mockClear();
  getSubscriptionByCustomerId.mockClear();
  // Restore defaults after any per-test overrides
  mockCustomersCreate.mockResolvedValue({ id: 'cus_mockedId' });
  mockCustomersList.mockResolvedValue({ data: [] });
  mockSessionsCreate.mockResolvedValue({ url: 'http://mock-session-url.com' });
  mockSubscriptionsUpdate.mockResolvedValue({ id: 'sub_mockedId' });
  getSubscriptionByCustomerId.mockResolvedValue(null);
});

describe('Stripe checkout session controller', () => {
  it('should NOT apply a trial when an existing customerId is provided (renew/repurchase)', async () => {
    getSubscriptionByCustomerId.mockResolvedValue({
      subscriptionId: 'sub_existing',
      isActive: false,
    });

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      billingEmail: 'existing@example.com',
      firstName: 'Existing',
      lastName: 'Customer',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
      customerId: 'cus_existingCustomerId',
    });

    expect(response.statusCode).toBe(200);
    expect(mockCustomersCreate).not.toHaveBeenCalled();

    const sessionCreateArgs = mockSessionsCreate.mock.calls[0][0];
    expect(sessionCreateArgs.subscription_data).toBeUndefined();
  });

  it('should NOT apply a trial when customer exists in Stripe (found by email)', async () => {
    getSubscriptionByCustomerId.mockResolvedValue(null);
    mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_foundByEmail' }] });

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      billingEmail: 'found@example.com',
      firstName: 'Found',
      lastName: 'ByEmail',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
    });

    expect(response.statusCode).toBe(200);
    expect(mockCustomersCreate).not.toHaveBeenCalled();

    const sessionCreateArgs = mockSessionsCreate.mock.calls[0][0];
    expect(sessionCreateArgs.customer).toBe('cus_foundByEmail');
    expect(sessionCreateArgs.subscription_data).toBeUndefined();
  });

  it('should apply a trial only when a brand-new Stripe customer is created', async () => {
    getSubscriptionByCustomerId.mockResolvedValue(null);
    mockCustomersList.mockResolvedValue({ data: [] });

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      billingEmail: 'new@example.com',
      firstName: 'New',
      lastName: 'Customer',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
    });

    expect(response.statusCode).toBe(200);
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);

    const sessionCreateArgs = mockSessionsCreate.mock.calls[0][0];
    expect(sessionCreateArgs.subscription_data).toEqual({ trial_period_days: 60 });
  });

  it('should create a session for a new customer', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session').send({
      customerId: 'cus_dog',
      billingEmail: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ url: 'http://mock-session-url.com' });
  });

  it('should create a session for an existing customer', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session').send({
      awsSub: 'existingSub',
      billingEmail: 'existing@example.com',
      firstName: 'Existing',
      lastName: 'Customer',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
      customerId: 'cus_existingCustomerId',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.url).toBe('http://mock-session-url.com');
  });

  it('should handle missing required fields', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session').send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should handle Stripe service failure', async () => {
    mockCustomersList.mockRejectedValueOnce(new Error('Stripe network error'));

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      billingEmail: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');
  });

  it('should handle missing fields', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session').send({
      awsSub: process.env.TEST_SUB_NO_PROFILE,
      billingEmail: '   ',
      firstName: 'Test',
      priceId: 'price_12345',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should throw error if cookies are not present', async () => {
    jest.resetModules();

    jest.mock('../../../lib/middleware/authenticateAWS.js', () => {
      return (req, res, next) => {
        const { accessToken, idToken, refreshToken } = req.cookies;

        if (!accessToken || !idToken || !refreshToken) {
          return res.status(401).json({
            message: 'You must be signed in to continue: missing or invalid token',
            code: 401,
            type: 'MissingOrInvalidToken',
          });
        }

        req.userAWSSub = 'mockedSub';
        next();
      };
    });

    const app = require('../../../lib/app.js');

    const response = await request(app)
      .post('/api/v1/create-checkout-session')
      .send({
        customerId: 'cus_dog',
        billingEmail: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        priceId: 'price_12345',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'You must be signed in to continue: missing or invalid token',
      code: 401,
      type: 'MissingOrInvalidToken',
    });
  });

  it('should return a 400 error when an invalid price ID is provided', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session').send({
      customerId: 'cus_dog',
      billingEmail: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      priceId: 'invalid_price_id',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid price ID provided');
  });
});
