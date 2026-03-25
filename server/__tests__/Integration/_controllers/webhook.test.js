const request = require('supertest');
const app = require('../../../lib/app');
const pool = require('../../../lib/utils/pool');

// --- Stripe mock -----------------------------------------------------------
// Functions are defined inside the factory and attached to the constructor so
// tests can reach them via require('stripe')._mockConstructEvent etc.
jest.mock('stripe', () => {
  const mockConstructEvent = jest.fn();
  const mockRetrieve = jest.fn();

  const MockStripe = jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockRetrieve },
    customers: { del: jest.fn() },
  }));

  MockStripe._mockConstructEvent = mockConstructEvent;
  MockStripe._mockRetrieve = mockRetrieve;

  return MockStripe;
});

// --- Model mocks -----------------------------------------------------------
jest.mock('../../../lib/models/WebhookEvent.js', () => ({
  insert: jest.fn(),
}));

jest.mock('../../../lib/models/StripeCustomer.js', () => ({
  getStripeByAWSSub: jest.fn(),
  insertNewStripeCustomerAndAwsUser: jest.fn(),
  getStripeByCustomerId: jest.fn(),
  updateByCustomerId: jest.fn(),
  insertNewStripeCustomer: jest.fn(),
  updateCustomerConfirmedStatus: jest.fn(),
}));

jest.mock('../../../lib/models/Subscriptions.js', () => ({
  upsertSubscription: jest.fn(),
  getSubscriptionByCustomerId: jest.fn(),
  cancelSubscriptionData: jest.fn(),
  setStatusInactive: jest.fn(),
}));

jest.mock('../../../lib/models/Invoices.js', () => ({
  insertNewInvoice: jest.fn(),
  updateInvoice: jest.fn(),
}));

jest.mock('../../../lib/models/FailedTransactions.js', () => ({
  insertFailedTransactions: jest.fn(),
}));

// --- Helpers ---------------------------------------------------------------
const StripeMock = require('stripe');
const mockConstructEvent = StripeMock._mockConstructEvent;
const mockRetrieve = StripeMock._mockRetrieve;

const WebhookEvent = require('../../../lib/models/WebhookEvent.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');
const FailedTransactions = require('../../../lib/models/FailedTransactions.js');

// Send a POST to the webhook endpoint with a fake signature header.
const postWebhook = (body = '{}') =>
  request(app)
    .post('/api/v1/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', 'test-sig')
    .send(body);

// Shorthand: make WebhookEvent.insert indicate a fresh (non-duplicate) event.
const notDuplicate = () =>
  WebhookEvent.insert.mockResolvedValue({ id: 1, event_id: 'evt_1', event_type: 'test' });

// Build a minimal Stripe event object.
const makeEvent = (type, dataObject, id = 'evt_1') => ({
  id,
  type,
  data: { object: dataObject },
});

// --- Tests -----------------------------------------------------------------
describe('POST /api/v1/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    pool.end();
  });

  // -------------------------------------------------------------------------
  // Signature / idempotency
  // -------------------------------------------------------------------------

  it('returns 400 when stripe signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const resp = await postWebhook();

    expect(resp.status).toBe(400);
    expect(resp.text).toMatch(/Webhook error/);
  });

  it('returns 200 and skips processing for a duplicate event', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.created', { id: 'cus_1', metadata: { aws_id: 'sub_1' } }),
    );
    WebhookEvent.insert.mockResolvedValue(null); // null = duplicate

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({ message: 'Duplicate webhook, skipping' });
    expect(StripeCustomer.getStripeByAWSSub).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // customer.created
  // -------------------------------------------------------------------------

  it('customer.created: inserts new customer when none exists', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.created', { id: 'cus_new', metadata: { aws_id: 'aws-sub-new' } }),
    );
    notDuplicate();
    StripeCustomer.getStripeByAWSSub.mockResolvedValue(null);
    StripeCustomer.insertNewStripeCustomerAndAwsUser.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(StripeCustomer.getStripeByAWSSub).toHaveBeenCalledWith('aws-sub-new');
    expect(StripeCustomer.insertNewStripeCustomerAndAwsUser).toHaveBeenCalledWith(
      'cus_new',
      'aws-sub-new',
    );
  });

  it('customer.created: skips insert when customer already exists', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.created', { id: 'cus_existing', metadata: { aws_id: 'aws-sub-exist' } }),
    );
    notDuplicate();
    StripeCustomer.getStripeByAWSSub.mockResolvedValue({ customerId: 'cus_existing' });

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(StripeCustomer.insertNewStripeCustomerAndAwsUser).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // charge.succeeded
  // -------------------------------------------------------------------------

  it('charge.succeeded: updates existing customer and marks confirmed', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('charge.succeeded', {
        customer: 'cus_123',
        metadata: { aws_id: 'aws-sub-123' },
        billing_details: { email: 'test@example.com', name: 'Test User' },
      }),
    );
    notDuplicate();
    StripeCustomer.getStripeByCustomerId.mockResolvedValue({ customerId: 'cus_123' });
    StripeCustomer.updateByCustomerId.mockResolvedValue({});
    StripeCustomer.updateCustomerConfirmedStatus.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(StripeCustomer.updateByCustomerId).toHaveBeenCalledWith('cus_123', {
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(StripeCustomer.updateCustomerConfirmedStatus).toHaveBeenCalledWith('cus_123', true);
    expect(StripeCustomer.insertNewStripeCustomer).not.toHaveBeenCalled();
  });

  it('charge.succeeded: inserts new customer when none exists', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('charge.succeeded', {
        customer: 'cus_brand_new',
        metadata: { aws_id: 'aws-sub-new' },
        billing_details: { email: 'new@example.com', name: 'New User' },
      }),
    );
    notDuplicate();
    StripeCustomer.getStripeByCustomerId.mockResolvedValue(null);
    StripeCustomer.insertNewStripeCustomer.mockResolvedValue({});
    StripeCustomer.updateCustomerConfirmedStatus.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(StripeCustomer.insertNewStripeCustomer).toHaveBeenCalledWith(
      'cus_brand_new',
      'aws-sub-new',
      'New User',
      'new@example.com',
    );
    expect(StripeCustomer.updateCustomerConfirmedStatus).toHaveBeenCalledWith(
      'cus_brand_new',
      true,
    );
  });

  // -------------------------------------------------------------------------
  // invoice.created
  // -------------------------------------------------------------------------

  it('invoice.created: inserts invoice and updates customer', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('invoice.created', {
        id: 'inv_123',
        subscription: 'sub_123',
        customer: 'cus_123',
        customer_phone: '555-0100',
        customer_name: 'Test User',
        customer_email: 'test@example.com',
        lines: { data: [{ period: { start: 1000000, end: 1100000 } }] },
      }),
    );
    notDuplicate();
    Invoices.insertNewInvoice.mockResolvedValue({});
    StripeCustomer.updateByCustomerId.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Invoices.insertNewInvoice).toHaveBeenCalledWith(
      'inv_123',
      'sub_123',
      'cus_123',
      1000000,
      1100000,
    );
    expect(StripeCustomer.updateByCustomerId).toHaveBeenCalledWith('cus_123', {
      name: 'Test User',
      phone: '555-0100',
      email: 'test@example.com',
    });
  });

  // -------------------------------------------------------------------------
  // invoice.payment_succeeded
  // -------------------------------------------------------------------------

  it('invoice.payment_succeeded: updates invoice and upserts active subscription', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('invoice.payment_succeeded', {
        id: 'inv_123',
        status: 'paid',
        subscription: 'sub_123',
        customer: 'cus_123',
        amount_due: 5000,
        amount_paid: 5000,
        lines: { data: [{ description: 'Monthly subscription' }] },
      }),
    );
    notDuplicate();
    Invoices.updateInvoice.mockResolvedValue({});
    mockRetrieve.mockResolvedValue({
      customer: 'cus_123',
      status: 'active',
      current_period_start: 1000000,
      current_period_end: 1100000,
      plan: { interval: 'month' },
    });
    Subscriptions.upsertSubscription.mockResolvedValue({});
    StripeCustomer.updateCustomerConfirmedStatus.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Invoices.updateInvoice).toHaveBeenCalledWith('inv_123', 'paid', 'sub_123', 5000, 5000);
    expect(Subscriptions.upsertSubscription).toHaveBeenCalledWith(
      'cus_123',
      'sub_123',
      true,
      'month',
      1000000,
      1100000,
      1000000,
      1100000,
      'active', // not a trial
    );
    expect(StripeCustomer.updateCustomerConfirmedStatus).toHaveBeenCalledWith('cus_123', true);
  });

  it('invoice.payment_succeeded: marks trialing status for trial period invoices', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('invoice.payment_succeeded', {
        id: 'inv_trial',
        status: 'paid',
        subscription: 'sub_trial',
        customer: 'cus_123',
        amount_due: 0,
        amount_paid: 0,
        lines: { data: [{ description: 'Trial period for Monthly subscription' }] },
      }),
    );
    notDuplicate();
    Invoices.updateInvoice.mockResolvedValue({});
    mockRetrieve.mockResolvedValue({
      customer: 'cus_123',
      status: 'active',
      current_period_start: 1000000,
      current_period_end: 1100000,
      plan: { interval: 'month' },
    });
    Subscriptions.upsertSubscription.mockResolvedValue({});
    StripeCustomer.updateCustomerConfirmedStatus.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Subscriptions.upsertSubscription).toHaveBeenCalledWith(
      expect.any(String),
      'sub_trial',
      expect.any(Boolean),
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      'trialing',
    );
  });

  // -------------------------------------------------------------------------
  // customer.subscription.created
  // -------------------------------------------------------------------------

  it('customer.subscription.created: upserts trialing subscription', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.subscription.created', {
        id: 'sub_trial',
        status: 'trialing',
        customer: 'cus_123',
        current_period_start: 1000000,
        current_period_end: 1100000,
        trial_start: 1000000,
        trial_end: 1100000,
        items: { data: [{ plan: { interval: 'month' } }] },
      }),
    );
    notDuplicate();
    Subscriptions.upsertSubscription.mockResolvedValue({});
    StripeCustomer.updateCustomerConfirmedStatus.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Subscriptions.upsertSubscription).toHaveBeenCalledWith(
      'cus_123',
      'sub_trial',
      false, // isActive false during trial
      'month',
      1000000,
      1100000,
      1000000,
      1100000,
      'trialing',
    );
    expect(StripeCustomer.updateCustomerConfirmedStatus).toHaveBeenCalledWith('cus_123', true);
  });

  it('customer.subscription.created: does nothing when status is not trialing', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.subscription.created', {
        id: 'sub_active',
        status: 'active',
        customer: 'cus_123',
        current_period_start: 1000000,
        current_period_end: 1100000,
        items: { data: [{ plan: { interval: 'month' } }] },
      }),
    );
    notDuplicate();

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Subscriptions.upsertSubscription).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // customer.subscription.updated
  // -------------------------------------------------------------------------

  it('customer.subscription.updated: records cancellation data when canceled', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.subscription.updated', {
        id: 'sub_123',
        status: 'canceled',
        canceled_at: 1700000000,
        cancellation_details: {
          comment: 'Too expensive',
          feedback: 'too_expensive',
          reason: 'cancellation_requested',
        },
      }),
    );
    notDuplicate();
    Subscriptions.cancelSubscriptionData.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Subscriptions.cancelSubscriptionData).toHaveBeenCalledWith(
      'sub_123',
      1700000000,
      'Too expensive',
      'too_expensive',
      'cancellation_requested',
    );
  });

  it('customer.subscription.updated: upserts active subscription for existing customer', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.subscription.updated', {
        id: 'sub_123',
        status: 'active',
      }),
    );
    notDuplicate();
    mockRetrieve.mockResolvedValue({
      customer: 'cus_123',
      status: 'active',
      current_period_start: 1000000,
      current_period_end: 1100000,
      plan: { interval: 'month' },
    });
    Subscriptions.getSubscriptionByCustomerId.mockResolvedValue({ customerId: 'cus_123' });
    Subscriptions.upsertSubscription.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Subscriptions.upsertSubscription).toHaveBeenCalledWith(
      'cus_123',
      'sub_123',
      true,
      'month',
      1000000,
      1100000,
      null,
      null,
      'active',
    );
  });

  it('customer.subscription.updated: upserts active subscription for new customer', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.subscription.updated', {
        id: 'sub_new',
        status: 'active',
      }),
    );
    notDuplicate();
    mockRetrieve.mockResolvedValue({
      customer: 'cus_new',
      status: 'active',
      current_period_start: 2000000,
      current_period_end: 2100000,
      plan: { interval: 'year' },
    });
    Subscriptions.getSubscriptionByCustomerId.mockResolvedValue(null); // no existing sub
    Subscriptions.upsertSubscription.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Subscriptions.upsertSubscription).toHaveBeenCalledWith(
      'cus_new',
      'sub_new',
      true,
      'year',
      2000000,
      2100000,
      null,
      null,
      'active',
    );
  });

  // -------------------------------------------------------------------------
  // customer.subscription.deleted
  // -------------------------------------------------------------------------

  it('customer.subscription.deleted: sets subscription inactive', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.subscription.deleted', { id: 'sub_gone' }),
    );
    notDuplicate();
    Subscriptions.setStatusInactive.mockResolvedValue();

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(Subscriptions.setStatusInactive).toHaveBeenCalledWith('sub_gone');
  });

  // -------------------------------------------------------------------------
  // payment_intent.payment_failed
  // -------------------------------------------------------------------------

  it('payment_intent.payment_failed: records failed transaction', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('payment_intent.payment_failed', {
        customer: 'cus_123',
        invoice: 'inv_fail',
        created: 1700000000,
        amount: 5000,
        last_payment_error: { code: 'card_declined' },
      }),
    );
    notDuplicate();
    FailedTransactions.insertFailedTransactions.mockResolvedValue({});

    const resp = await postWebhook();

    expect(resp.status).toBe(200);
    expect(FailedTransactions.insertFailedTransactions).toHaveBeenCalledWith(
      'cus_123',
      'card_declined',
      5000,
      1700000000,
      'inv_fail',
    );
  });
});
