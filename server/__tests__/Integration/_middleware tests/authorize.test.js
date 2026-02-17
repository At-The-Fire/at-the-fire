const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn((token, getKey, options, callback) => {
    if (
      [
        'valid.free.user.access.token',
        'valid.free.user.id.token',
        'valid.free.user.refresh.token',
      ].includes(token)
    ) {
      callback(null, { sub: process.env.TEST_SUB_FULL_CUSTOMER });
    } else {
      callback(new Error('Invalid token'));
    }
  }),
  decode: jest.fn((token) =>
    token === 'valid.free.user.id.token' ? { sub: process.env.TEST_SUB_FULL_CUSTOMER } : null
  ),
}));

jest.mock('../../../lib/models/StripeCustomer', () => ({
  updateByCustomerId: jest.fn(),
  getStripeByAWSSub: jest.fn(),
}));

jest.mock('../../../lib/models/Subscriptions', () => ({
  getSubscriptionByCustomerId: jest.fn(),
}));

jest.mock('../../../lib/models/Invoices', () => ({
  getBillingPeriodByCustomerId: jest.fn(),
}));

describe('authorize Middleware', () => {
  const setupTokensAndMocks = (accessToken, idToken, refreshToken, isActive) => {
    jwt.decode.mockImplementation((token) =>
      token === idToken ? { sub: 'sub_fullCustomer' } : null
    );
    jwt.verify.mockImplementation((token, getKey, options, callback) => {
      if ([accessToken, idToken, refreshToken].includes(token)) {
        callback(null, { sub: 'sub_fullCustomer' });
      } else {
        callback(new Error('Invalid token'));
      }
    });
    StripeCustomer.getStripeByAWSSub.mockResolvedValue({
      customerId: 'stripe-customer-id_full',
      awsSub: 'sub_fullCustomer',
      confirmed: true,
    });

    Subscriptions.getSubscriptionByCustomerId.mockResolvedValue({
      customerId: 'stripe-customer-id_full',
      isActive,
      restricted: true,
    });
    Invoices.getBillingPeriodByCustomerId.mockResolvedValue({
      endDate: '2722668400000',
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    return setup(pool);
  });

  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  it('GET /dashboard should allow access to subscription-only routes for subscribed users', async () => {
    setupTokensAndMocks(
      'valid.subscriber.access.token',
      'valid.subscriber.id.token',
      'valid.subscriber.refresh.token',
      true
    );
    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Cookie', [
        'accessToken=valid.subscriber.access.token;',
        'idToken=valid.subscriber.id.token;',
        'refreshToken=valid.subscriber.refresh.token;',
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

  it('GET /dashboard should still allow access to /dashboard route for subscribed users with inactive subscription', async () => {
    setupTokensAndMocks(
      'valid.subscriber.access.token',
      'valid.subscriber.id.token',
      'valid.subscriber.refresh.token',
      false
    );
    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Cookie', [
        'accessToken=valid.subscriber.access.token;',
        'idToken=valid.subscriber.id.token;',
        'refreshToken=valid.subscriber.refresh.token;',
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

      restricted: true,
    });
  });

  //
  it('PUT /profile/customer-update should return a 403 if user is not authorized to update profile due to incorrect customerId ', async () => {
    // Setup the mocks with one customerId
    setupTokensAndMocks(
      'sub_fullCustomer.access.token',
      'sub_fullCustomer.id.token',
      'sub_fullCustomer.refresh.token',
      false
    );

    // Mock StripeCustomer to return a different customerId than what setupTokensAndMocks uses
    StripeCustomer.getStripeByAWSSub.mockResolvedValue({
      customerId: 'different-customer-id', // This is the key change
      awsSub: 'sub_fullCustomer',
      confirmed: true,
    });

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
        'accessToken=sub_fullCustomer.access.token;',
        'idToken=sub_fullCustomer.id.token;',
        'refreshToken=sub_fullCustomer.refresh.token;',
      ]);

    expect(resp.status).toBe(403);
    expect(resp.body.message).toBe(
      'You are not a current customer or your subscription is not active'
    );
  });
});
