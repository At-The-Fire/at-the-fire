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

module.exports = new NullAdapter();
// Phase 3: swap for LeapAdapter or SoarPayAdapter
