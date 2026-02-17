const { Router } = require('express');
const StripeCustomer = require('../models/StripeCustomer.js');
const AWSUser = require('../models/AWSUser.js');
const authorizeSubscription = require('../middleware/authorizeSubscription.js');
const Subscriptions = require('../models/Subscriptions.js');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

module.exports = Router()
  .get('/billing-period', authorizeSubscription, async (req, res, next) => {
    try {
      const customerId = req.customerId;

      const response = await Subscriptions.getSubscriptionByCustomerId({
        customerId,
      });

      const startDate = response.subscriptionStartDate;
      const endDate = response.subscriptionEndDate;
      const billingPeriod = { startDate, endDate, trialStatus: req.trialStatus };
      res.json(billingPeriod);
    } catch (e) {
      res.json({ message: 'no billing period found', error: e.message });
      next(e);
    }
  })

  //# if user cancels subscription purchase 1/2 way through data in our db needs deletion
  .delete('/cancel-deletion', async (req, res, next) => {
    try {
      const sub = req.userAWSSub;
      const { customerId } = await StripeCustomer.getStripeByAWSSub(sub);

      const subscription = await Subscriptions.getSubscriptionByCustomerId({
        customerId,
      });

      if (subscription) {
        return res.status(200).json({
          message: 'Customer data preserved',
        });
      }

      await StripeCustomer.deleteCustomerData(sub);
      await AWSUser.deleteCustomerId(sub);

      const stripeResponse = await stripe.customers.del(customerId);

      if (!stripeResponse.deleted) {
        throw new Error('Stripe deletion failed');
      }

      res.json({
        message: 'Customer data deleted',
      });
    } catch (e) {
      console.error('Caught error:', e.message);
      res.status(500).json({ message: e.message });
      next(e);
    }
  })

  // auth verify cookies exist
  .get('/verify', async (req, res) => {
    res.status(200).json({ valid: true });
  });
