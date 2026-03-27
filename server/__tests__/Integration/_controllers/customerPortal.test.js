const pool = require('../../../lib/utils/pool');
const request = require('supertest');
const app = require('../../../lib/app');

let mockCustomerId = 'cus_testCustomer';

jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.userAWSSub = process.env.TEST_SUB_FULL_CUSTOMER;
  next();
});

jest.mock('../../../lib/middleware/authorizeSubscription.js', () => (req, res, next) => {
  req.customerId = mockCustomerId;
  next();
});

jest.mock('stripe', () => {
  const mockRetrieve = jest.fn();
  const mockCreatePortalSession = jest.fn();

  const MockStripe = jest.fn(() => ({
    customers: { retrieve: mockRetrieve },
    billingPortal: { sessions: { create: mockCreatePortalSession } },
  }));

  MockStripe._mockRetrieve = mockRetrieve;
  MockStripe._mockCreatePortalSession = mockCreatePortalSession;

  return MockStripe;
});

jest.mock('../../../lib/models/Subscriptions.js', () => ({
  getSubscriptionByCustomerId: jest.fn(),
}));

jest.mock('../../../lib/models/Invoices.js', () => ({
  getBillingPeriodByCustomerId: jest.fn(),
  insertNewInvoice: jest.fn(),
  updateInvoice: jest.fn(),
}));

const StripeMock = require('stripe');
const { getSubscriptionByCustomerId } = require('../../../lib/models/Subscriptions.js');
const { getBillingPeriodByCustomerId } = require('../../../lib/models/Invoices.js');

describe('POST /api/v1/create-customer-portal-session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomerId = 'cus_testCustomer';
    StripeMock._mockRetrieve.mockResolvedValue({ id: 'cus_testCustomer', deleted: false });
    StripeMock._mockCreatePortalSession.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test',
    });
    getSubscriptionByCustomerId.mockResolvedValue({ id: 'sub_123', customerId: 'cus_testCustomer' });
    getBillingPeriodByCustomerId.mockResolvedValue({
      startDate: '1731389540',
      endDate: '1762925540',
    });
  });

  afterAll(() => pool.end());

  it('returns 403 when no customerId is present on request', async () => {
    mockCustomerId = null;
    const resp = await request(app).post('/api/v1/create-customer-portal-session').send({});
    expect(resp.status).toBe(403);
    expect(resp.body.message).toContain('No customer ID found');
  });

  it('returns 403 when the Stripe customer is deleted', async () => {
    StripeMock._mockRetrieve.mockResolvedValue({ id: 'cus_testCustomer', deleted: true });
    const resp = await request(app).post('/api/v1/create-customer-portal-session').send({});
    expect(resp.status).toBe(403);
    expect(resp.body.message).toContain('Customer ID not found in Stripe');
  });

  it('returns 403 when Stripe customer retrieve returns null', async () => {
    StripeMock._mockRetrieve.mockResolvedValue(null);
    const resp = await request(app).post('/api/v1/create-customer-portal-session').send({});
    expect(resp.status).toBe(403);
  });

  it('returns 403 when no local subscription record exists', async () => {
    getSubscriptionByCustomerId.mockResolvedValue(null);
    const resp = await request(app).post('/api/v1/create-customer-portal-session').send({});
    expect(resp.status).toBe(403);
    expect(resp.body.message).toContain('No local subscription record found');
  });

  it('returns 403 when no local invoice record exists', async () => {
    getBillingPeriodByCustomerId.mockResolvedValue(null);
    const resp = await request(app).post('/api/v1/create-customer-portal-session').send({});
    expect(resp.status).toBe(403);
    expect(resp.body.message).toContain('No local invoice record found');
  });

  it('returns 200 with the billing portal URL on success', async () => {
    const resp = await request(app).post('/api/v1/create-customer-portal-session').send({});
    expect(resp.status).toBe(200);
    expect(resp.body.url).toBe('https://billing.stripe.com/session/test');
  });

  it('returns 500 when Stripe billingPortal.sessions.create throws', async () => {
    StripeMock._mockCreatePortalSession.mockRejectedValue(new Error('Stripe API error'));
    const resp = await request(app).post('/api/v1/create-customer-portal-session').send({});
    expect(resp.status).toBe(500);
  });
});
