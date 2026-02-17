const { getStripeByAWSSub } = require('../models/StripeCustomer.js');
const { getSubscriptionByCustomerId } = require('../models/Subscriptions.js');
const { getBillingPeriodByCustomerId } = require('../models/Invoices.js');

module.exports = async (req, res, next) => {
  try {
    const sub = req.userAWSSub;
    const stripeCustomer = await getStripeByAWSSub(sub);

    if (!stripeCustomer || sub !== stripeCustomer.awsSub) {
      return res.status(403).json({
        code: 403,
        message: 'You do not have access to view this page',
      });
    }

    req.customerId = stripeCustomer.customerId;
    // Check if customer is confirmed
    if (!stripeCustomer.confirmed) {
      return res.status(403).json({
        code: 403,
        message: 'Your information is incomplete and you are not allowed access to view this page',
      });
    }

    // Retrieve and validate subscription details
    const subscription = await getSubscriptionByCustomerId({
      customerId: stripeCustomer.customerId,
    });

    if (
      !subscription ||
      !subscription.customerId ||
      subscription.customerId !== stripeCustomer.customerId
    ) {
      return res.status(403).json({
        code: 403,
        message: 'You are not a current customer or your subscription is not active',
      });
    }

    // Check if subscription is in trial period
    const currentDate = Math.floor(Date.now() / 1000);
    const isInTrial = subscription.status === 'trialing' && subscription.trialEndDate > currentDate;

    // Set restricted flag based on trial and subscription status
    const unrestricted =
      isInTrial ||
      subscription.isActive || // This will be false during trial
      subscription.status === 'active' ||
      subscription.status === 'trialing'; // But this will be true during trial

    req.restricted = !unrestricted;

    // After your existing restricted flag logic
    if (isInTrial) {
      const now = Math.floor(Date.now() / 1000); // current time in Unix seconds
      const daysRemaining = Math.ceil((subscription.trialEndDate - now) / (60 * 60 * 24)); // convert seconds to days and round up

      req.trialStatus = {
        isTrialing: true,
        endsAt: subscription.trialEndDate,
        daysRemaining,
      };
    } else {
      req.trialStatus = {
        isTrialing: false,
      };
    }

    // Check subscription end date
    const billingPeriod = await getBillingPeriodByCustomerId(stripeCustomer.customerId);

    if (!billingPeriod || (!isInTrial && currentDate > subscription.subscriptionEndDate)) {
      // Set the restricted flag if the subscription has expired (and not in trial)
      req.restricted = true;
    }

    next();
  } catch (err) {
    next(err);
  }
};
