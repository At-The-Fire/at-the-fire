const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

// Mock user data
const mockUser = {
  email: process.env.TEST_EMAIL,
  sub: process.env.TEST_SUB,
  customer_id: process.env.TEST_CUSTOMER_ID,
};

// Mock customer data
const mockCustomer = {
  customerId: 'stripe-customer-id_full',
  isActive: true,
  subscriptionEndDate: 1630435200,
};

// Mock authenticate middleware to attach mock user to req.user object before each test case runs (req.user is used in the route handler)
// this is assuming that the user is logged in and authenticated (tested elsewhere)
jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.user = mockUser;
  next();
});

// Mock authorizeSubscription middleware to attach mock subscription to req.subscription object before each test case runs (req.subscription is used in the route handler)
// this is assuming that the user is logged in and authenticated (tested elsewhere)
jest.mock('../../../lib/middleware/authorizeSubscription.js', () => (req, res, next) => {
  if (mockUser.sub !== null) {
    req.customerId = mockCustomer.customerId;
  }

  next();
});

describe('posts/ post details/ cloudinary routes', () => {
  beforeEach(() => {
    // jest.resetAllMocks();
    return setup(pool);
  });

  afterAll(() => {
    jest.clearAllMocks();
    pool.end();
  });

  it('GET /inventory-snapshot should retrieve all inventory snapshots ', async () => {
    const resp = await request(app).get('/api/v1/inventory-snapshot');

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual([
      {
        id: '1',
        created_at: expect.any(String),
        category_count: {
          Beads: 2,
          Marbles: 3,
          Bubblers: 1,
          Recyclers: 1,
          'Dry Pieces': 2,
        },
        price_count: {
          Beads: 916,
          Marbles: 950,
          Bubblers: 500,
          Recyclers: 2000,
          'Dry Pieces': 1400,
        },
      },
    ]);
  });

  it('POST /inventory-snapshot should create a new- or update existing- snapshot ', async () => {
    // # GET current snapshot for comparison to update (there are no posts behind this data so it disappears upon snapshot update)
    const resp = await request(app).get('/api/v1/inventory-snapshot');
    expect(resp.status).toBe(200);
    expect(resp.body).toEqual([
      {
        id: '1',
        created_at: expect.any(String),
        category_count: {
          Beads: 2,
          Marbles: 3,
          Bubblers: 1,
          Recyclers: 1,
          'Dry Pieces': 2,
        },
        price_count: {
          Beads: 916,
          Marbles: 950,
          Bubblers: 500,
          Recyclers: 2000,
          'Dry Pieces': 1400,
        },
      },
    ]);
    // # make a post for new data in the snapshot
    const resp2 = await request(app).post('/api/v1/dashboard').send({
      title: 'test title',
      description: 'test description',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731739453/at-the-fire/IMG_1770.jpg',
      category: 'testCategory',
      price: 500,
      customer_id: 'stripe-customer-id_full',
      num_imgs: 1,
      public_id: 'test public id',
      sold: true,
      date_sold: '1720594800000',
    });

    expect(resp2.status).toBe(200);
    expect(resp2.body).toEqual({
      id: expect.any(String),
      created_at: expect.any(String),
      title: 'test title',
      description: 'test description',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731739453/at-the-fire/IMG_1770.jpg',
      category: 'testCategory',
      price: '500',
      customer_id: 'stripe-customer-id_full',
      num_imgs: expect.any(String),
      public_id: expect.any(String),
      sold: true,
      date_sold: '1720594800000',
    });

    // # update database with the new snapshot
    const resp3 = await request(app)
      .post('/api/v1/inventory-snapshot')
      .send({
        category_count: {
          Beads: 2,
          Marbles: 3,
          Bubblers: 3,
          Recyclers: 3,
          'Dry Pieces': 2,
          testCategory: 1,
        },
        price_count: {
          Beads: 916,
          Marbles: 950,
          Bubblers: 1500,
          Recyclers: 6000,
          'Dry Pieces': 1400,
          testCategory: 500,
        },
      });
    expect(resp3.status).toBe(200);
    expect(resp3.body).toEqual({
      id: expect.any(String),
      created_at: expect.any(String),
      category_count: {
        SampleCategory3: 1,
        SampleCategory4: 1,
        testCategory: 1,
      },
      price_count: {
        SampleCategory3: 0,
        SampleCategory4: 0,
        testCategory: 500,
      },
    });
  });
});
