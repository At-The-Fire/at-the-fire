// SoarPay adapter (stub)
//
// Intentionally unimplemented until the merchant account + API details are approved.
// Keep this file small and focused: translate our internal interface to SoarPay’s API.

class SoarPayAdapter {
  async createPaymentIntent() {
    const err = new Error('SoarPayAdapter not implemented');
    err.status = 503;
    throw err;
  }

  async capturePayment() {
    const err = new Error('SoarPayAdapter not implemented');
    err.status = 503;
    throw err;
  }

  async refundPayment() {
    const err = new Error('SoarPayAdapter not implemented');
    err.status = 503;
    throw err;
  }
}

module.exports = SoarPayAdapter;
