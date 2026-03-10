const { Router } = require('express');
const AWSUser = require('../models/AWSUser.js');
const Post = require('../models/Post.js');
const StripeCustomer = require('../models/StripeCustomer.js');
const Subscriptions = require('../models/Subscriptions.js');
const {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const Stripe = require('stripe');
const Invoices = require('../models/Invoices.js');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function deleteFromS3(url) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    const key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
    if (key) {
      await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }));
    }
  } catch (err) {
    console.error('S3 delete failed for', url, err);
  }
}

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

  .delete('/delete-user/:sub', async (req, res, next) => {
    try {
      const { sub } = req.params;
      const cognitoClient = new CognitoIdentityProviderClient();
      let cognitoError = null;

      // Delete avatar from S3 before removing DB row
      const cognitoUser = await AWSUser.getCognitoUserBySub({ sub });
      if (cognitoUser?.imageUrl) {
        await deleteFromS3(cognitoUser.imageUrl);
      }

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

  .delete('/delete-subscriber/:sub', async (req, res, next) => {
    try {
      const { sub } = req.params;

      const stripeCustomer = await StripeCustomer.getStripeByAWSSub(sub);
      if (!stripeCustomer) {
        return res.status(404).json({ message: 'Subscriber not found' });
      }

      // Delete gallery post images from S3
      const posts = await AWSUser.getGalleryPosts(stripeCustomer.customerId);
      await Promise.all(posts.map((post) => deleteFromS3(post.image_url)));

      // Delete logo from S3
      if (stripeCustomer.logoImageUrl) {
        await deleteFromS3(stripeCustomer.logoImageUrl);
      }

      //* delete customer from Stripe
      const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
      let stripeError = null;

      // Try to delete from Stripe, but don't block DB cleanup if it fails
      try {
        await stripe.customers.del(stripeCustomer.customerId);
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
