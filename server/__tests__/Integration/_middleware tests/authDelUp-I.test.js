const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');
const Post = require('../../../lib/models/Post.js');
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
  getStripeByAWSSub: jest.fn(),
  updateByCustomerId: jest.fn(),
}));

// Mocking the `Subscriptions` module
jest.mock('../../../lib/models/Subscriptions', () => ({
  getSubscriptionByCustomerId: jest.fn(),
}));

// Mocking the `Invoices` module
jest.mock('../../../lib/models/Invoices', () => ({
  getBillingPeriodByCustomerId: jest.fn(),
}));

jest.mock('../../../lib/models/Post.js', () => ({
  getById: jest.fn(),
  deleteById: jest.fn(),
  updateById: jest.fn(),
}));

// Abstract function to setup mock tokens, JWT, and database responses for subscribed users
const setupSuccessSubscribedUserMocks = () => {
  // Mock a valid token for a subscribed user
  const subscribedUserAccessToken = 'valid.subscriber.access.token';
  const subscribedUserIdToken = 'valid.subscriber.id.token';
  const subscribedUserRefreshToken = 'valid.subscriber.refresh.token';

  // Mock the `jwt.decode` function to decode the idToken and return a token with `sub`
  jwt.decode.mockImplementation((token) => {
    if (token === 'valid.subscriber.id.token') {
      return { sub: process.env.TEST_SUB_FULL_CUSTOMER }; // Simulated structure of a valid decoded JWT
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
      callback(null, { sub: process.env.TEST_SUB_FULL_CUSTOMER });
    } else {
      callback(new Error('Invalid token'));
    }
  });

  // Mock the database call to return a valid customer ID for a subscribed user
  StripeCustomer.getStripeByAWSSub.mockResolvedValue({
    customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    awsSub: process.env.TEST_SUB_FULL_CUSTOMER,
    confirmed: true,
  });

  StripeCustomer.updateByCustomerId.mockResolvedValue([
    process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    'John Smith',
    process.env.TEST_EMAIL_FULL_CUSTOMER,
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

describe('DELETE /api/v1/dashboard/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    return setup(pool);
  });
  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });
  it('DELETE /dashboard/:id should allow deletion when user owns the post', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Mock the post to be owned by the authenticated user
    Post.getById.mockResolvedValue({
      id: '123',
      customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      title: 'Test Post',
    });

    Post.deleteById.mockResolvedValue({
      Post: {
        id: '351',
        created_at: '2024-11-16T06:45:41.708Z',
        title: 'sdf',
        description: 'sdf',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731739541/at-the-fire/IMG_5038.jpg',
        category: 'Blunt Tips',
        price: '34',
        customer_id: 'cus_PFVjJAq9obQOR8',
        public_id: 'at-the-fire/IMG_5038',
        num_imgs: '1',
        resource_type: undefined,
        sold: false,
      },
    });

    const response = await request(app)
      .delete('/api/v1/dashboard/123')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(204);
  });

  it('DELETE /dashboard/:id should return 403 when user does not own the post', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Mock the post to be owned by a different user
    Post.getById.mockResolvedValue({
      id: '123',
      customer_id: 'different-customer-id',
      title: 'Test Post',
    });

    const response = await request(app)
      .delete('/api/v1/dashboard/123')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: 'You do not have permission to do this: access denied',
      code: 403,
    });
  });

  it('DELETE /dashboard/:id should return 404 when post does not exist', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Mock post not found
    Post.getById.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/v1/dashboard/999')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 404,
      message: 'Post not found',
    });
  });

  it('DELETE /dashboard/:id should return 500 when database query fails', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    // Mock database error
    Post.getById.mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .delete('/api/v1/dashboard/123')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: 'Internal Server Error',
      code: 500,
    });
  });

  it('PUT /dashboard/:id should allow updates when user owns the post', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSuccessSubscribedUserMocks();

    Post.getById.mockResolvedValue({
      id: '123',
      customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      title: 'Test Post',
    });

    Post.updateById.mockResolvedValue({
      additionalImages: [],
      category: 'Blunt Tips',
      customerId: 'cus_PFVjJAq9obQOR8',
      customer_id: 'cus_PFVjJAq9obQOR8',
      description: 'sdf',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/f_auto,q_auto/v1731739453/at-the-fire/IMG_1770.jpg',
      newImages: [],
      num_imgs: 1,
      price: '234',
      public_id: 'at-the-fire/IMG_1770',
      sold: false,
      title: 'updated title',
    });

    const response = await request(app)
      .put('/api/v1/dashboard/3')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({
        post: {
          additionalImages: [],
          category: 'Blunt Tips',
          customerId: 'cus_PFVjJAq9obQOR8',
          customer_id: 'cus_PFVjJAq9obQOR8',
          description: 'sdf',
          image_url:
            'https://res.cloudinary.com/dzodr2cdk/image/upload/f_auto,q_auto/v1731739453/at-the-fire/IMG_1770.jpg',
          newImages: [],
          num_imgs: '1',
          price: '234',
          public_id: 'at-the-fire/IMG_1770',
          sold: false,
          title: 'updated title',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      additionalImages: [],
      category: 'Blunt Tips',
      customerId: 'cus_PFVjJAq9obQOR8',
      customer_id: 'cus_PFVjJAq9obQOR8',
      description: 'sdf',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/f_auto,q_auto/v1731739453/at-the-fire/IMG_1770.jpg',
      newImages: [],
      num_imgs: 1,
      price: '234',
      public_id: 'at-the-fire/IMG_1770',
      sold: false,
      title: 'updated title',
    });
  });

  // Additional PUT tests would mirror the DELETE tests...
});
