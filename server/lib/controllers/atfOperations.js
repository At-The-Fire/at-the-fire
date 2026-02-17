const { Router } = require('express');
const AWSUser = require('../models/AWSUser.js');
const Post = require('../models/Post.js');
const StripeCustomer = require('../models/StripeCustomer.js');
const Subscriptions = require('../models/Subscriptions.js');
const {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const Stripe = require('stripe');
const Invoices = require('../models/Invoices.js');

module.exports = Router()
  .get('/', async (req, res, next) => {
    try {
      const [allUsers, allPosts, allCustomers, allSubscriptions] = await Promise.all([
        AWSUser.getAllUsers(),
        Post.getAllPosts(),
        StripeCustomer.getAllCustomers(),
        Subscriptions.getAllSubscriptions(),
      ]);

      const data = {
        users: allUsers,
        customers: allCustomers,
        posts: allPosts,
        subscriptions: allSubscriptions,
      };
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  //TODO
  //! this needs tests still 1.15.25
  .get('/invoices', async (req, res, next) => {
    try {
      const invoices = await Invoices.getInvoices();

      if (!invoices) {
        return res.status(404).json({
          message: 'No invoices found.',
        });
      }
      res.json(invoices);
    } catch (e) {
      next(e);
    }
  })

  //TODO
  //! this ALSO needs to delete avatar
  .delete('/delete-user/:sub', async (req, res, next) => {
    try {
      const { sub } = req.params;
      const cognitoClient = new CognitoIdentityProviderClient();
      let cognitoError = null;

      // Try to delete from Cognito, but don't block DB cleanup if it fails
      try {
        await cognitoClient.send(
          new AdminDeleteUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: sub,
          })
        );
      } catch (err) {
        // Log the error, but continue
        cognitoError = err;
      }

      // Always attempt to delete from your DB
      const data = await AWSUser.deleteUser(sub);

      // Respond based on what happened
      if (!data) {
        return res.status(404).json({ message: 'User not found in DB' });
      }
      if (cognitoError) {
        return res.status(200).json({
          message: 'User deleted from DB, but there was an issue deleting from Cognito.',
          cognitoError: cognitoError.message,
        });
      }
      return res
        .status(200)
        .json({ message: 'User successfully deleted from both DB and Cognito' });
    } catch (e) {
      next(e);
    }
  })

  //! this needs to ALSO delete logo and all posts/ post images
  .delete('/delete-subscriber/:sub', async (req, res, next) => {
    try {
      const { sub } = req.params;

      const stripeCustomerId = await StripeCustomer.getStripeByAWSSub(sub);
      if (!stripeCustomerId) {
        return res.status(404).json({ message: 'Subscriber not found' });
      }

      //* delete customer from Stripe
      const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
      let stripeError = null;

      // Try to delete from Stripe, but don't block DB cleanup if it fails
      try {
        if (stripeCustomerId) {
          await stripe.customers.del(stripeCustomerId.customerId);
        }
      } catch (err) {
        // Log the error, but continue
        stripeError = err;
      }

      // Always attempt to delete from your DB
      const data = await StripeCustomer.deleteSubscriber(sub);

      // Respond based on what happened
      if (!data) {
        return res.status(404).json({ message: 'Subscriber not found in DB' });
      }
      if (stripeError) {
        // Optionally, include info about the Stripe error
        return res.status(200).json({
          message: 'Subscriber deleted from DB, but there was an issue deleting from Stripe.',
          stripeError: stripeError.message,
        });
      }
      return res
        .status(200)
        .json({ message: 'Subscriber successfully deleted from both DB and Stripe' });
    } catch (e) {
      next(e);
    }
  });
