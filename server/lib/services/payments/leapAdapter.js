// Leap Payments adapter (stub)
//
// Intentionally unimplemented until the merchant account + API details are approved.
// Keep this file small and focused: translate our internal interface to Leap’s API.

class LeapAdapter {
  async createPaymentIntent() {
    const err = new Error('LeapAdapter not implemented');
    err.status = 503;
    throw err;
  }

  async capturePayment() {
    const err = new Error('LeapAdapter not implemented');
    err.status = 503;
    throw err;
  }

  async refundPayment() {
    const err = new Error('LeapAdapter not implemented');
    err.status = 503;
    throw err;
  }
}

module.exports = LeapAdapter;
