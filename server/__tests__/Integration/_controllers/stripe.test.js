const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

// Mock user data
let mockUser = {
  email: process.env.TEST_EMAIL_PARTIAL_PROFILE,
  sub: process.env.TEST_SUB_INCOMPLETE_PROFILE,
  customer_id: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
};

// Mock customer data
let mockCustomer = {
  customerId: process.env.TEST_STRIPE_CUSTOMER_ID_PARTIAL_PROFILE,
};

// Mock authenticate middleware
jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.userAWSSub = mockUser.sub;
  next();
});

// Mock authorizeSubscription middleware
jest.mock('../../../lib/middleware/authorizeSubscription.js', () => (req, res, next) => {
  if (mockUser.customer_id) {
    req.customerId = mockCustomer.customerId;
  }
  next();
});

// Mock StripeCustomer model
jest.mock('../../../lib/models/StripeCustomer.js', () => ({
  deleteCustomerData: jest.fn().mockResolvedValue({
    customerId: process.env.TEST_STRIPE_CUSTOMER_ID_PARTIAL_PROFILE,
  }),

  getStripeByAWSSub: jest.fn().mockImplementation(() => {
    return mockCustomer;
  }),
}));

// Mock AWSUser model
jest.mock('../../../lib/models/AWSUser.js', () => ({
  deleteCustomerId: jest.fn().mockResolvedValue(),
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => ({
    customers: {
      del: jest.fn().mockResolvedValue({ deleted: true }),
    },
  }));
});

describe('stripe routes', () => {
  beforeEach(() => {
    return setup(pool);
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  it('GET /billing-period should retrieve all inventory snapshots', async () => {
    const resp = await request(app).get('/api/v1/stripe/billing-period');
    expect(resp.status).toBe(200);
    expect(resp.body).toMatchInlineSnapshot(`
      {
        "endDate": "1762925540",
        "startDate": "1731389540",
      }
    `);
  });

  it('DELETE /cancel-deletion should not delete existing customer', async () => {
    const resp = await request(app).delete('/api/v1/stripe/cancel-deletion');
    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      message: 'Customer data preserved',
    });
  });

  it('DELETE /cancel-deletion should delete new/ incomplete customer data on cancel', async () => {
    mockUser = {
      email: process.env.TEST_EMAIL_NO_PROFILE,
      sub: process.env.TEST_SUB_NO_PROFILE,
      customer_id: null,
    };
    mockCustomer = {
      customerId: 'new-customer-id',
    };
    const resp = await request(app).delete('/api/v1/stripe/cancel-deletion');
    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      message: 'Customer data deleted',
    });
  });

  it('DELETE should handle failed stripe deletion', async () => {
    jest.resetAllMocks();

    // Override just this call
    jest.mock('stripe', () => {
      return jest.fn(() => ({
        customers: {
          del: jest.fn().mockResolvedValue({ deleted: false }),
        },
      }));
    });

    const resp = await request(app).delete('/api/v1/stripe/cancel-deletion');

    expect(resp.status).toBe(500);
  });
});
