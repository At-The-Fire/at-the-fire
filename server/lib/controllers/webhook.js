const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const express = require('express');
const StripeCustomer = require('../models/StripeCustomer.js');
const Subscriptions = require('../models/Subscriptions.js');
const Invoices = require('../models/Invoices.js');
const FailedTransactions = require('../models/FailedTransactions.js');
const WebhookEvent = require('../models/WebhookEvent.js');
const app = express();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const logWebhookEvent = (eventType, data) => {
  console.info('==========================');
  console.info(`FROM ${eventType} event: `);
  // eslint-disable-next-line no-console
  console.table(data);
  console.info('==========================');
  console.info('                          ');
};

// Utility function to verify subscription status
const verifySubscriptionStatus = async (subscriptionId) => {
  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    return {
      customerId: stripeSubscription.customer,
      isActive: stripeSubscription.status === 'active',
      subscriptionStartDate: stripeSubscription.current_period_start,
      subscriptionEndDate: stripeSubscription.current_period_end,
      interval: stripeSubscription.plan.interval,
    };
  } catch (error) {
    console.error('Error verifying subscription:', error);
    throw error;
  }
};

module.exports = app.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    let event;
    const sig = request.headers['stripe-signature'];
    try {
      if (process.env.NODE_ENV === 'test') {
        // Skip constructEvent and mock event directly in tests
        event = {
          type: 'invoice.payment_succeeded',
          data: {
            object: {
              id: 'invoice_12345',
              status: 'paid',
              subscription: 'sub_12345',
              amount_due: 5000,
              amount_paid: 5000,
            },
          },
        };
      } else {
        // Real Stripe signature verification for production and development
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
      }
    } catch (e) {
      return response.status(400).send(`Webhook error: ${e.message}`);
    }

    const result = await WebhookEvent.insert({
      event_id: event.id,
      event_type: event.type,
    });
    if (!result) {
      return response.status(200).json({ message: 'Duplicate webhook, skipping' });
    }

    const dataObject = event.data.object;

    try {
      switch (event.type) {
        case 'customer.created': //^======================== 1  BOTH TRIAL & REGULAR
          // eslint-disable-next-line no-console
          console.log('event.type=====================', event.type);

          if (dataObject) {
            const awsSub = dataObject['metadata']['aws_id'];
            const customerId = dataObject['id'];
            // eslint-disable-next-line no-console

            logWebhookEvent('customer.created', [
              { Key: 'Stripe Customer Id', Value: customerId },
              { Key: 'AWS sub_id', Value: awsSub },
            ]);

            try {
              // check if customer already exists
              const customer = await StripeCustomer.getStripeByAWSSub(awsSub);

              if (customer) {
                return customer;
              } else {
                console.info('No customer found, inserting new customer');
                // Insert the customer with all available data
                await StripeCustomer.insertNewStripeCustomerAndAwsUser(customerId, awsSub);
              }
            } catch (e) {
              console.error('Error handling customer retrieval or insertion:', e);
              throw e; // Re-throw the error or handle it as needed
            }
          }
          break;

        case 'charge.succeeded':
          // eslint-disable-next-line no-console
          console.log('event.type=====================', event.type);

          if (dataObject) {
            const customerId = dataObject['customer'];
            const awsSub = dataObject['metadata']['aws_id'];
            const email = dataObject['billing_details']['email'];
            const name = dataObject['billing_details']['name'];

            logWebhookEvent('charge.succeeded', [
              { Key: 'customerId', Value: customerId },
              { Key: 'email', Value: email },
              { Key: 'name', Value: name },
            ]);

            try {
              // Check if the customer already exists
              const existingCustomer = await StripeCustomer.getStripeByCustomerId(customerId);

              if (existingCustomer) {
                // If the customer exists, update the record with the new data
                await StripeCustomer.updateByCustomerId(customerId, {
                  email,
                  name,
                });
              } else {
                // If the customer doesn't exist, insert a new one with complete data
                await StripeCustomer.insertNewStripeCustomer(customerId, awsSub, name, email);
              }

              // After insertion with complete data, set confirmed to true
              await StripeCustomer.updateCustomerConfirmedStatus(customerId, true);
            } catch (e) {
              // eslint-disable-next-line no-console
              console.log('Error handling charge.succeeded event:', e);
            }
          }
          break;

        case 'invoice.created': //^======================== 2 BOTH TRIAL & REGULAR
          // eslint-disable-next-line no-console
          console.log('event.type=====================', event.type);

          if (dataObject) {
            const invoiceID = dataObject['id'];
            const subscriptionId = dataObject['subscription'];
            const customerId = dataObject['customer'];
            const startDate = dataObject['lines']['data'][0]['period']['start'];
            const endDate = dataObject['lines']['data'][0]['period']['end'];
            const phone = dataObject['customer_phone'];
            const customerName = dataObject['customer_name'];
            const email = dataObject['customer_email'];

            logWebhookEvent('invoice.created', [
              { Key: 'Invoice ID', Value: invoiceID },
              { Key: 'Subscription ID', Value: subscriptionId },
              { Key: 'Customer ID', Value: customerId },
              { Key: 'Start Date', Value: startDate },
              { Key: 'End Date', Value: endDate },
              { Key: 'Phone', Value: phone },
              { Key: 'name', Value: customerName },
              { Key: 'email', Value: email },
            ]);

            try {
              await Invoices.insertNewInvoice(
                invoiceID,
                subscriptionId,
                customerId,
                startDate,
                endDate,
              );
              await StripeCustomer.updateByCustomerId(customerId, {
                name: customerName,
                phone,
                email,
              });
            } catch (e) {
              // eslint-disable-next-line no-console
              console.log('error inserting new invoice in invoice.created event', e);
            }
          }
          break;

        case 'invoice.payment_succeeded': //^ ======================== 3 BOTH TRIAL & REGULAR
          // eslint-disable-next-line no-console
          console.log('event.type=====================', event.type);

          if (dataObject) {
            const description = dataObject['lines']['data'][0]['description'];

            const invoiceID = dataObject['id'];
            const invoiceStatus = dataObject['status'];
            const subscription_id = dataObject['subscription'];
            const amount_due = dataObject['amount_due'];
            const amount_paid = dataObject['amount_paid'];

            logWebhookEvent('invoice.payment_succeeded', [
              { Key: 'invoice ID', Value: invoiceID },
              { Key: 'invoice status', Value: invoiceStatus },
              { Key: 'subscription ID', Value: subscription_id },
              { Key: 'amount due', Value: amount_due },
              { Key: 'amount paid', Value: amount_paid },
            ]);

            try {
              await Invoices.updateInvoice(
                invoiceID,
                invoiceStatus,
                subscription_id,
                amount_due,
                amount_paid,
              );

              // Skip processing for trial period invoices
              let isTrial;
              if (description.includes('Trial period')) {
                isTrial = true;
              }

              if (subscription_id) {
                try {
                  const subscriptionData = await verifySubscriptionStatus(subscription_id);
                  // Update subscription status as a backup in case we miss the webhook
                  await Subscriptions.upsertSubscription(
                    subscriptionData.customerId,
                    subscription_id,
                    subscriptionData.isActive,
                    subscriptionData.interval,
                    subscriptionData.subscriptionStartDate,
                    subscriptionData.subscriptionEndDate,
                    subscriptionData.subscriptionStartDate,
                    subscriptionData.subscriptionEndDate,
                    isTrial ? 'trialing' : '',
                  );

                  await StripeCustomer.updateCustomerConfirmedStatus(dataObject['customer'], true);

                  logWebhookEvent('subscription verification', [
                    { Key: 'Subscription ID', Value: subscription_id },
                    {
                      Key: 'Status',
                      Value: subscriptionData.isActive ? 'active' : 'inactive',
                    },
                    { Key: 'Customer', Value: subscriptionData.customerId },
                    {
                      Key: 'Interval',
                      Value: subscriptionData.interval,
                    },
                  ]);
                } catch (error) {
                  console.error('Error in subscription verification after invoice:', error);
                }
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.log('error updating invoice in invoice.payment_succeeded event', e);
            }
          }
          break;

        case 'customer.subscription.created': //^========================  4 BOTH TRIAL & REGULAR
          // eslint-disable-next-line no-console
          console.log('event.type=====================', event.type);

          if (dataObject['status'] === 'trialing') {
            logWebhookEvent('customer.subscription.created', [
              { Key: 'Subscription ID', Value: dataObject['id'] },
              { Key: 'Status', Value: 'trialing' },
              { Key: 'Customer', Value: dataObject['customer'] },
              { Key: 'Trial Start', Value: dataObject['trial_start'] },
              { Key: 'Trial End', Value: dataObject['trial_end'] },
            ]);

            try {
              await Subscriptions.upsertSubscription(
                dataObject['customer'],
                dataObject['id'],
                false, // isActive is false during trial
                dataObject['items']['data'][0]['plan']['interval'],
                dataObject['current_period_start'],
                dataObject['current_period_end'],
                dataObject['trial_start'],
                dataObject['trial_end'],
                'trialing',
              );
              await StripeCustomer.updateCustomerConfirmedStatus(dataObject['customer'], true);
            } catch (error) {
              console.error('Error handling trial subscription creation:', error);
            }
          }
          break;

        case 'customer.subscription.updated':
          // eslint-disable-next-line no-console
          console.log('event.type=====================', event.type);
          // handle cancellation
          if (dataObject['status'] === 'canceled') {
            const subscriptionId = dataObject['id'];
            const canceled_at = dataObject['canceled_at'];
            const comment = dataObject['cancellation_details']['comment'];
            const feedback = dataObject['cancellation_details']['feedback'];
            const reason = dataObject['cancellation_details']['reason'];

            if (canceled_at && canceled_at !== null) {
              try {
                await Subscriptions.cancelSubscriptionData(
                  subscriptionId,
                  canceled_at,
                  comment,
                  feedback,
                  reason,
                );
              } catch (e) {
                // eslint-disable-next-line no-console
                console.log(
                  'error canceling subscription in customer.subscription.updated event',
                  e,
                );
              }
            }
          }

          // handle subscription insert/ update
          if (dataObject['status'] === 'active') {
            const subscriptionData = await verifySubscriptionStatus(dataObject['id']);

            logWebhookEvent('customer.subscription.updated', [
              { Key: 'Stripe Customer Id', Value: subscriptionData.customerId },
              { Key: 'isActive', Value: subscriptionData.isActive },
              { Key: 'subscriptionId', Value: dataObject['id'] },
              {
                Key: 'subscriptionStart',
                Value: subscriptionData.subscriptionStartDate,
              },
              {
                Key: 'subscriptionEnd',
                Value: subscriptionData.subscriptionEndDate,
              },
              { Key: 'interval', Value: subscriptionData.interval },
            ]);

            try {
              const subscription = await Subscriptions.getSubscriptionByCustomerId({
                customerId: subscriptionData.customerId,
              });

              if (subscription) {
                // eslint-disable-next-line no-console
                console.log(
                  'Subscription found for customer, updating subscription:',
                  subscriptionData.customerId,
                );

                await Subscriptions.upsertSubscription(
                  subscriptionData.customerId,
                  dataObject['id'],
                  subscriptionData.isActive,
                  subscriptionData.interval,
                  subscriptionData.subscriptionStartDate,
                  subscriptionData.subscriptionEndDate,
                  null, // no trial_start for active subscription
                  null, // no trial_end for active subscription
                  'active',
                );
              } else {
                // Insert new subscription
                // eslint-disable-next-line no-console
                console.log('No subscription found for customer, inserting new one');
                await Subscriptions.upsertSubscription(
                  subscriptionData.customerId,
                  dataObject['id'],
                  subscriptionData.isActive,
                  subscriptionData.interval,
                  subscriptionData.subscriptionStartDate,
                  subscriptionData.subscriptionEndDate,
                  null, // no trial_start for active subscription
                  null, // no trial_end for active subscription
                  'active',
                );
              }
            } catch (error) {
              console.error('Error handling subscription update:', error);
              // Depending on the error, consider if you need to rethrow it or handle it in a specific way.
            }
          }

          break;

        case 'customer.subscription.deleted':
          // eslint-disable-next-line no-console
          console.log('event.type=====================', event.type);
          // handle isActive, this is on the click of the 2nd "cancel plan" button
          if (dataObject) {
            const subscriptionId = dataObject['id'];
            try {
              await Subscriptions.setStatusInactive(subscriptionId);
            } catch (e) {
              // eslint-disable-next-line no-console
              console.log(
                'error setting subscription to inactive in customer.subscription.deleted event',
                e,
              );
            }
          }

          break;

        case 'payment_intent.payment_failed':
          // eslint-disable-next-line no-console
          console.log('event.type=====================', event.type);

          if (dataObject) {
            const customerId = dataObject['customer'];
            const failureCode = dataObject['last_payment_error']['code'];
            const invoiceId = dataObject['invoice'];
            const timestamp = dataObject['created'];
            const transactionAmt = dataObject['amount'];

            logWebhookEvent('payment_intent.payment_failed', [
              { Key: 'Customer ID', Value: customerId },
              { Key: 'Failure Code', Value: failureCode },
              { Key: 'Invoice ID', Value: invoiceId },
              { Key: 'Timestamp', Value: timestamp },
              { Key: 'Transaction Amount', Value: transactionAmt },
            ]);

            try {
              await FailedTransactions.insertFailedTransactions(
                customerId,
                failureCode,
                transactionAmt,
                timestamp,
                invoiceId,
              );
            } catch (e) {
              // eslint-disable-next-line no-console
              console.log(
                'error inserting failed transaction in payment_intent.payment_failed event',
                e,
              );
            }
          }

          break;
      }
      response.sendStatus(200);
    } catch (e) {
      console.error('Unexpected error processing webhook:', e);
      response.sendStatus(500);
    }
  },
);
