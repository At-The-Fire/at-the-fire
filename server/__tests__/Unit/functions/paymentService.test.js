// paymentService exports createAdapter() immediately at require-time, so each test
// group must use jest.resetModules() + re-require to control which adapter is returned.

describe('paymentService', () => {
  let adapter;

  afterEach(() => {
    jest.resetModules();
    delete process.env.PAYMENTS_ADAPTER;
  });

  describe('MockAdapter', () => {
    beforeEach(() => {
      process.env.PAYMENTS_ADAPTER = 'mock';
      adapter = require('../../../lib/services/paymentService');
    });

    describe('createPaymentIntent()', () => {
      it('returns intentId and clientSecret for valid input', async () => {
        const result = await adapter.createPaymentIntent(2500, 'usd', { orderId: '123' });
        expect(typeof result.intentId).toBe('string');
        expect(typeof result.clientSecret).toBe('string');
        expect(result.intentId).toMatch(/^mock_pi_/);
        expect(result.clientSecret).toContain(result.intentId);
      });

      it('throws 400 for amount of zero', async () => {
        const err = await adapter.createPaymentIntent(0, 'usd').catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Invalid amount');
      });

      it('throws 400 for negative amount', async () => {
        const err = await adapter.createPaymentIntent(-100, 'usd').catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Invalid amount');
      });

      it('throws 400 for non-finite amount (Infinity)', async () => {
        const err = await adapter.createPaymentIntent(Infinity, 'usd').catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Invalid amount');
      });

      it('throws 400 for missing currency', async () => {
        const err = await adapter.createPaymentIntent(1000, null).catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Invalid currency');
      });

      it('throws 400 for non-string currency', async () => {
        const err = await adapter.createPaymentIntent(1000, 123).catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Invalid currency');
      });
    });

    describe('capturePayment()', () => {
      it('returns success and transactionId for a valid intentId', async () => {
        const { intentId } = await adapter.createPaymentIntent(1000, 'usd');
        const result = await adapter.capturePayment(intentId);
        expect(result.success).toBe(true);
        expect(typeof result.transactionId).toBe('string');
        expect(result.transactionId).toMatch(/^mock_tx_/);
      });

      it('is idempotent — returns the same transactionId on second capture', async () => {
        const { intentId } = await adapter.createPaymentIntent(1000, 'usd');
        const first = await adapter.capturePayment(intentId);
        const second = await adapter.capturePayment(intentId);
        expect(second.transactionId).toBe(first.transactionId);
      });

      it('throws 400 for an unknown intentId', async () => {
        const err = await adapter.capturePayment('mock_pi_unknown').catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Unknown payment intent');
      });
    });

    describe('refundPayment()', () => {
      it('returns { success: true } for a valid transactionId', async () => {
        const result = await adapter.refundPayment('mock_tx_abc123');
        expect(result).toEqual({ success: true });
      });

      it('throws 400 for null transactionId', async () => {
        const err = await adapter.refundPayment(null).catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Invalid transactionId');
      });

      it('throws 400 for undefined transactionId', async () => {
        const err = await adapter.refundPayment(undefined).catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Invalid transactionId');
      });
    });

    describe('handleWebhookEvent()', () => {
      it('throws 400 — not supported in mock adapter', async () => {
        const err = await adapter.handleWebhookEvent().catch((e) => e);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Mock adapter does not support webhooks');
      });
    });
  });

  describe('NullAdapter', () => {
    beforeEach(() => {
      process.env.PAYMENTS_ADAPTER = 'none';
      adapter = require('../../../lib/services/paymentService');
    });

    it('createPaymentIntent throws 503', async () => {
      const err = await adapter.createPaymentIntent(1000, 'usd').catch((e) => e);
      expect(err.status).toBe(503);
      expect(err.message).toBe('Payment processor not yet configured');
    });

    it('capturePayment throws 503', async () => {
      const err = await adapter.capturePayment('any_id').catch((e) => e);
      expect(err.status).toBe(503);
    });

    it('refundPayment throws 503', async () => {
      const err = await adapter.refundPayment('any_id').catch((e) => e);
      expect(err.status).toBe(503);
    });

    it('handleWebhookEvent throws 503', async () => {
      const err = await adapter.handleWebhookEvent().catch((e) => e);
      expect(err.status).toBe(503);
    });
  });

  describe('createAdapter() factory', () => {
    it('returns MockAdapter when PAYMENTS_ADAPTER=mock', async () => {
      process.env.PAYMENTS_ADAPTER = 'mock';
      const a = require('../../../lib/services/paymentService');
      const result = await a.createPaymentIntent(500, 'usd');
      expect(result.intentId).toMatch(/^mock_pi_/);
    });

    it('returns NullAdapter when PAYMENTS_ADAPTER=none', async () => {
      process.env.PAYMENTS_ADAPTER = 'none';
      const a = require('../../../lib/services/paymentService');
      const err = await a.createPaymentIntent(500, 'usd').catch((e) => e);
      expect(err.status).toBe(503);
    });

    it('defaults to MockAdapter in test environment when PAYMENTS_ADAPTER is unset', async () => {
      // NODE_ENV=test is set by Jest automatically
      const a = require('../../../lib/services/paymentService');
      const result = await a.createPaymentIntent(500, 'usd');
      expect(result.intentId).toMatch(/^mock_pi_/);
    });
  });
});
