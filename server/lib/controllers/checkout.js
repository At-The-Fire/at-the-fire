const { Router } = require('express');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const { getSubscriptionByCustomerId } = require('../models/Subscriptions.js');

const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'production';
const validPriceIds =
  appEnv === 'development' || appEnv === 'test'
    ? [process.env.TEST_STRIPE_MONTHLY_PRICE_ID, process.env.TEST_STRIPE_YEARLY_PRICE_ID]
    : [process.env.STRIPE_MONTHLY_PRICE_ID, process.env.STRIPE_YEARLY_PRICE_ID];

function validatePriceId(submittedPriceId) {
  if (!validPriceIds.includes(submittedPriceId)) {
    throw new Error('Invalid price ID provided');
  }
  return submittedPriceId;
}

module.exports = Router().post('/', async (req, res) => {
  try {
    const { billingEmail, firstName, lastName, priceId, customerId } = req.body;

    if (!billingEmail || !firstName || !lastName || !priceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let validatedPriceId;
    try {
      validatedPriceId = validatePriceId(priceId);
    } catch (validationError) {
      return res.status(400).json({ code: 400, message: validationError.message });
    }

    let existingCustomer = customerId;
    let session;
    let createdNewCustomer = false;

    try {
      if (!existingCustomer) {
        const customers = await stripe.customers.list({ email: billingEmail });

        if (customers?.data?.length > 0) {
          existingCustomer = customers.data[0].id;
        }
      }

      let subscription;
      if (existingCustomer) {
        subscription = await getSubscriptionByCustomerId({
          customerId: existingCustomer,
        });
      }

      if (subscription && subscription.id) {
        await stripe.subscriptions.update(subscription.id, {
          items: [{ price: validatedPriceId }],
          proration_behavior: 'create_prorations',
        });

        session = await stripe.checkout.sessions.create({
          customer: existingCustomer,
          payment_method_types: ['card'],
          line_items: [{ price: validatedPriceId, quantity: 1 }],
          mode: 'subscription',
          success_url: `${process.env.CLIENT_URL}/subscription/success`,
          cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
        });
      } else {
        if (!existingCustomer) {
          const newCustomer = await stripe.customers.create({
            metadata: { aws_id: req.userAWSSub },
            email: billingEmail,
            name: `${firstName} ${lastName}`,
          });

          if (!newCustomer || !newCustomer.id) {
            throw new Error('Failed to create Stripe customer');
          }
          existingCustomer = newCustomer?.id;
          createdNewCustomer = true;
        }

        const sessionParams = {
          customer: existingCustomer,
          payment_method_types: ['card'],
          line_items: [{ price: validatedPriceId, quantity: 1 }],
          mode: 'subscription',
          success_url: `${process.env.CLIENT_URL}/subscription/success`,
          cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
        };

        if (createdNewCustomer) {
          sessionParams.subscription_data = {
            trial_period_days: 60,
          };
        }

        session = await stripe.checkout.sessions.create(sessionParams);
      }

      if (!session || !session.url) {
        throw new Error('Failed to create Stripe checkout session');
      }

      return res.json({ url: session.url });
    } catch (stripeError) {
      console.error('Stripe operation failed:', stripeError);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (e) {
    console.error('Non-Stripe Error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
