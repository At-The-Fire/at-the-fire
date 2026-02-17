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
    console.log('req.body >>>>>>>>>>>>>>>>>>>>>>>>>>>', req.body);

    const { billingEmail, firstName, lastName, priceId, customerId } = req.body;

    console.log('customerId fresh from the request body:', customerId);

    if (!billingEmail || !firstName || !lastName || !priceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let validatedPriceId;
    try {
      validatedPriceId = validatePriceId(priceId);
    } catch (validationError) {
      return res.status(400).json({ code: 400, message: validationError.message });
    }
    console.log('customerId that is getting set to existingCustomer', customerId);

    let existingCustomer = customerId;
    console.log('existingCustomer is now: ', existingCustomer);

    let session;

    try {
      // Check if the customer exists in Stripe
      console.log('Checking if the customer exists in Stripe with this customerId: ', customerId);
      console.log('Which is set in existingCustomer:: ', existingCustomer);

      if (!existingCustomer) {
        console.log('No existing customer (!existingCustomer)');

        const customers = await stripe.customers.list({ email: billingEmail });
        console.log('customers from stripe api call ', customers);

        if (customers?.data?.length > 0) {
          existingCustomer = customers.data[0].id;
          console.log('setting existing customer to: ', existingCustomer);
        }
      }

      let subscription;
      if (existingCustomer) {
        // Fetch the subscription from database
        subscription = await getSubscriptionByCustomerId({
          customerId: existingCustomer,
        });
        console.log('there is an existingCustomer now fetching this subscription: ', subscription);
      }

      // if (subscription && subscription.id && subscription.isActive) {
      if (subscription && subscription.id) {
        // Update the existing active subscription
        console.log('subscription exists, it has an id, and isActive is true');

        await stripe.subscriptions.update(subscription.id, {
          items: [{ price: validatedPriceId }],
          proration_behavior: 'create_prorations',
        });

        // Create a checkout session for the updated subscription
        session = await stripe.checkout.sessions.create({
          customer: existingCustomer,
          payment_method_types: ['card'],
          line_items: [{ price: validatedPriceId, quantity: 1 }],
          mode: 'subscription',
          success_url: `${process.env.CLIENT_URL}/subscription/success`,
          cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
        });
      } else {
        // Create a new customer if none exists
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

        // Create a new subscription and checkout session
        const sessionParams = {
          customer: existingCustomer,
          payment_method_types: ['card'],
          line_items: [{ price: validatedPriceId, quantity: 1 }],
          mode: 'subscription',
          success_url: `${process.env.CLIENT_URL}/subscription/success`,
          cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
        };

        // Only brand-new Stripe customers get the 60-day trial.
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

      // Only return if we got here successfully
      return res.json({ url: session.url });
    } catch (stripeError) {
      console.error('Stripe operation failed:', stripeError);
      return res.status(500).json({ error: stripeError.message });
    }
  } catch (e) {
    // This catch is now just for non-Stripe errors (like parsing body)
    console.error('Non-Stripe Error:', e);
    return res.status(500).json({ error: e.message });
  }
});
