/**
 * Payment Service Abstraction
 *
 * This is the only file that changes when the merchant account arrives.
 * All processor adapters must implement:
 *   - createPaymentIntent(amount, currency, metadata) → { intentId, clientSecret }
 *   - capturePayment(intentId) → { success, transactionId }
 *   - refundPayment(transactionId, amount) → { success }
 *   - handleWebhookEvent(rawBody, signature) → normalized event object
 */

const crypto = require('crypto');

class NullAdapter {
  async createPaymentIntent() {
    const err = new Error('Payment processor not yet configured');
    err.status = 503;
    throw err;
  }

  async capturePayment() {
    const err = new Error('Payment processor not yet configured');
    err.status = 503;
    throw err;
  }

  async refundPayment() {
    const err = new Error('Payment processor not yet configured');
    err.status = 503;
    throw err;
  }

  async handleWebhookEvent() {
    const err = new Error('Payment processor not yet configured');
    err.status = 503;
    throw err;
  }
}

class MockAdapter {
  #intents = new Map();

  #id(prefix) {
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    return `${prefix}_${id}`;
  }

  async createPaymentIntent(amount, currency, metadata = {}) {
    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error('Invalid amount');
      err.status = 400;
      throw err;
    }

    if (!currency || typeof currency !== 'string') {
      const err = new Error('Invalid currency');
      err.status = 400;
      throw err;
    }

    const intentId = this.#id('mock_pi');
    const clientSecret = `${intentId}_secret_${this.#id('mock_cs')}`;

    this.#intents.set(intentId, {
      amount,
      currency,
      metadata,
      status: 'requires_capture',
      createdAt: Date.now(),
    });

    return { intentId, clientSecret };
  }

  // eslint-disable-next-line
  async capturePayment(intentId, _payment = null) {
    const intent = this.#intents.get(intentId);
    if (!intent) {
      const err = new Error('Unknown payment intent');
      err.status = 400;
      throw err;
    }

    if (intent.status === 'captured') {
      return { success: true, transactionId: intent.transactionId };
    }

    const transactionId = this.#id('mock_tx');
    intent.status = 'captured';
    intent.transactionId = transactionId;
    this.#intents.set(intentId, intent);

    return { success: true, transactionId };
  }

  async refundPayment(transactionId) {
    if (!transactionId) {
      const err = new Error('Invalid transactionId');
      err.status = 400;
      throw err;
    }

    return { success: true };
  }

  async handleWebhookEvent() {
    const err = new Error('Mock adapter does not support webhooks');
    err.status = 400;
    throw err;
  }
}

function createAdapter() {
  // NOTE: Shopping cart does NOT use Stripe.
  // This abstraction is for future non-Stripe merchant processors.
  //
  // Defaults:
  // - production: NullAdapter (503) unless explicitly configured
  // - non-production: MockAdapter by default (so the UI/UX can be developed end-to-end)
  //
  // To force the 503 behavior in non-production, set: PAYMENTS_ADAPTER=none
  const adapter = (process.env.PAYMENTS_ADAPTER || '').toLowerCase();

  if (adapter === 'none') return new NullAdapter();
  if (adapter === 'mock') return new MockAdapter();
  if (adapter === 'leap') {
    const LeapAdapter = require('./payments/leapAdapter');
    return new LeapAdapter();
  }
  if (adapter === 'soarpay') {
    const SoarPayAdapter = require('./payments/soarPayAdapter');
    return new SoarPayAdapter();
  }

  if (process.env.NODE_ENV !== 'production') return new MockAdapter();

  return new NullAdapter();
}

module.exports = createAdapter();
// Phase 3: swap for real merchant adapter
