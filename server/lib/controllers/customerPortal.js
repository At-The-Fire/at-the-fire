const { Router } = require('express');
const { getSubscriptionByCustomerId } = require('../models/Subscriptions.js');
const { getBillingPeriodByCustomerId } = require('../models/Invoices.js');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

module.exports = Router().post('/', async (req, res, next) => {
  try {
    const customerId = req.customerId;

    if (!customerId) {
      return res.status(403).json({ code: 403, message: 'No customer ID found for this account.' });
    }

    const [stripeCustomer, subscription, invoice] = await Promise.all([
      stripe.customers.retrieve(customerId),
      getSubscriptionByCustomerId({ customerId }),
      getBillingPeriodByCustomerId(customerId),
    ]);

    if (!stripeCustomer || stripeCustomer.deleted) {
      return res.status(403).json({
        code: 403,
        message:
          'Customer ID not found in Stripe. The customer ID in this environment may be stale or mismatched.',
      });
    }

    if (!subscription) {
      return res.status(403).json({
        code: 403,
        message: 'No local subscription record found. Local DB may be out of sync with Stripe.',
      });
    }

    if (!invoice) {
      return res.status(403).json({
        code: 403,
        message: 'No local invoice record found. Local DB may be out of sync with Stripe.',
      });
    }

    const origin = req.headers.origin || process.env.CLIENT_URL;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/stripe-return?return_from_stripe=true`,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
    next(e);
  }
});
