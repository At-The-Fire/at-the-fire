const request = require('supertest');
const app = require('../../../lib/app');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const { getSubscriptionByCustomerId } = require('../../../lib/models/Subscriptions.js');

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_mockedId' }),
      list: jest.fn().mockResolvedValue({ data: [] }), // Default success behavior
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ url: 'http://mock-session-url.com' }),
      },
    },
    subscriptions: {
      update: jest.fn().mockResolvedValue({ id: 'sub_mockedId' }),
    },
  }));
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

beforeEach(() => {
  stripe.customers.create.mockClear();
  stripe.customers.list.mockClear();
  stripe.subscriptions.update.mockClear();
  stripe.checkout.sessions.create.mockClear();
  getSubscriptionByCustomerId.mockClear();
});

describe('Stripe checkout session controller', () => {
  it.skip('should NOT apply a trial when an existing customerId is provided (renew/repurchase)', async () => {
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
    expect(stripe.customers.create).not.toHaveBeenCalled();

    const sessionCreateArgs = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(sessionCreateArgs.subscription_data).toBeUndefined();
  });

  it.skip('should NOT apply a trial when customer exists in Stripe (found by email)', async () => {
    getSubscriptionByCustomerId.mockResolvedValue(null);
    stripe.customers.list.mockResolvedValue({ data: [{ id: 'cus_foundByEmail' }] });

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      billingEmail: 'found@example.com',
      firstName: 'Found',
      lastName: 'ByEmail',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
    });

    expect(response.statusCode).toBe(200);
    expect(stripe.customers.create).not.toHaveBeenCalled();

    const sessionCreateArgs = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(sessionCreateArgs.customer).toBe('cus_foundByEmail');
    expect(sessionCreateArgs.subscription_data).toBeUndefined();
  });

  it.skip('should apply a trial only when a brand-new Stripe customer is created', async () => {
    getSubscriptionByCustomerId.mockResolvedValue(null);
    stripe.customers.list.mockResolvedValue({ data: [] });

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      billingEmail: 'new@example.com',
      firstName: 'New',
      lastName: 'Customer',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
    });

    expect(response.statusCode).toBe(200);
    expect(stripe.customers.create).toHaveBeenCalledTimes(1);

    const sessionCreateArgs = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(sessionCreateArgs.subscription_data).toEqual({ trial_period_days: 60 });
  });

  it.skip('should create a session for a new customer', async () => {
    const mockSession = { url: 'http://mock-session-url.com' };
    stripe.checkout.sessions.create.mockResolvedValue(mockSession);

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      customerId: 'cus_dog',
      billingEmail: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
    });

    // Fixed expectations
    expect(response.statusCode).toBe(200); // Check status code instead of response.body
    expect(response.body).toEqual({ url: mockSession.url }); // Check the entire response body
  });

  it.skip('should create a session for an existing customer', async () => {
    const mockSession = { url: 'http://mock-session-url.com' };

    stripe.checkout.sessions.create.mockResolvedValue(mockSession);

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      awsSub: 'existingSub',
      billingEmail: 'existing@example.com',
      firstName: 'Existing',
      lastName: 'Customer',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
      customerId: 'cus_existingCustomerId',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.url).toBe(mockSession.url);
  });

  it('should handle missing required fields', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session').send({});

    expect(response.statusCode).toBe(400);
    // Expect some error message or validation response
  });

  it.skip('should handle Stripe service failure', async () => {
    jest.resetAllMocks();
    jest.mock('stripe', () => {
      const stripeError = new Error( // this error does not bubble up to try/ catch so expect below is for actual 500 error triggered
        'Some error accessing Stripe- network or service failure, etc. that returns undefined data'
      );

      return jest.fn().mockImplementation(() => ({
        customers: {
          create: jest.fn().mockResolvedValue({ id: 'cus_mockedId' }),
          list: jest.fn().mockRejectedValue(stripeError),
        },
        checkout: {
          sessions: {
            create: jest.fn().mockResolvedValue({ url: 'http://mock-session-url.com' }),
          },
        },
        subscriptions: {
          update: jest.fn().mockResolvedValue({ id: 'sub_mockedId' }),
        },
      }));
    });

    const response = await request(app).post('/api/v1/create-checkout-session').send({
      billingEmail: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      priceId: process.env.TEST_STRIPE_MONTHLY_PRICE_ID,
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Failed to create Stripe customer',
    });
  });

  it('should handle missing fields', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session').send({
      awsSub: 'sub_noProfile',
      billingEmail: '   ',
      firstName: 'Test',
      priceId: 'price_12345',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should throw error if cookies are not present', async () => {
    // Clear any existing mocks
    jest.resetModules();

    // Mock the AWS authentication middleware
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

    // Re-import the app to apply the new mock
    const app = require('../../../lib/app.js');

    const response = await request(app)
      .post('/api/v1/create-checkout-session')
      // Don't set any cookies - this will make req.cookies an empty object
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
      priceId: 'invalid_price_id', // This value should trigger the validation error
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid price ID provided');
  });
});
