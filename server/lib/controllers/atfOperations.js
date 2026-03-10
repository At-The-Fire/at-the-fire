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
const pool = require('../utils/pool');

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

      res.json({
        users: allUsers,
        customers: allCustomers,
        posts: allPosts,
        subscriptions: allSubscriptions,
      });
    } catch (e) {
      next(e);
    }
  })

  .get('/invoices', async (req, res, next) => {
    try {
      const invoices = await Invoices.getInvoices();
      if (!invoices) return res.status(404).json({ message: 'No invoices found.' });
      res.json(invoices);
    } catch (e) {
      next(e);
    }
  })

  .delete('/delete-user/:sub', async (req, res, next) => {
    const { sub } = req.params;
    const cognitoClient = new CognitoIdentityProviderClient();
    let cognitoError = null;
    let stripeError = null;

    try {
      const [cognitoUser, stripeCustomer] = await Promise.all([
        AWSUser.getCognitoUserBySub({ sub }),
        StripeCustomer.getStripeByAWSSub(sub),
      ]);

      if (!cognitoUser) return res.status(404).json({ message: 'User not found' });

      // Collect S3 URLs to clean up
      const s3Urls = [];
      if (cognitoUser.imageUrl) s3Urls.push(cognitoUser.imageUrl);
      if (stripeCustomer) {
        if (stripeCustomer.logoImageUrl) s3Urls.push(stripeCustomer.logoImageUrl);
        const posts = await AWSUser.getGalleryPosts(stripeCustomer.customerId);
        posts.forEach((p) => { if (p.image_url) s3Urls.push(p.image_url); });
      }
      const { rows: auctionRows } = await pool.query(
        'SELECT image_urls FROM auctions WHERE seller_sub = $1',
        [sub]
      );
      auctionRows.forEach((row) => row.image_urls?.forEach((url) => s3Urls.push(url)));

      await Promise.all(s3Urls.map(deleteFromS3));

      // Single DB transaction — explicit deletes in dependency order
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // purchases has no ON DELETE CASCADE on buyer_sub or seller_customer_id
        await client.query('DELETE FROM purchases WHERE buyer_sub = $1', [sub]);

        if (stripeCustomer) {
          const customerId = stripeCustomer.customerId;
          // purchases where this user is the seller
          await client.query('DELETE FROM purchases WHERE seller_customer_id = $1', [customerId]);
          await client.query('DELETE FROM image_uploads WHERE customer_id = $1', [customerId]);
          await client.query('DELETE FROM quota_tracking WHERE customer_id = $1', [customerId]);
          await client.query('DELETE FROM quota_goals WHERE customer_id = $1', [customerId]);
          await client.query('DELETE FROM orders WHERE customer_id = $1', [customerId]);
          await client.query('DELETE FROM inventory_snapshot WHERE customer_id = $1', [customerId]);
          await client.query('DELETE FROM subscriptions WHERE customer_id = $1', [customerId]);
          await client.query('DELETE FROM invoices WHERE customer_id = $1', [customerId]);
          await client.query('DELETE FROM gallery_posts WHERE customer_id = $1', [customerId]);
          await client.query('DELETE FROM stripe_customers WHERE customer_id = $1', [customerId]);
        }

        // auction_results has no ON DELETE CASCADE — must delete before auctions (and cognito_users)
        await client.query('DELETE FROM auction_results WHERE winner_sub = $1', [sub]);
        await client.query(
          'DELETE FROM auction_results WHERE auction_id IN (SELECT id FROM auctions WHERE seller_sub = $1)',
          [sub]
        );

        // Deleting cognito_users cascades: auctions, bids, auction_notifications, followers, messages, etc.
        await client.query('DELETE FROM cognito_users WHERE sub = $1', [sub]);

        await client.query('COMMIT');
      } catch (dbErr) {
        await client.query('ROLLBACK');
        throw dbErr;
      } finally {
        client.release();
      }

      // External deletions — best-effort, don't block on failure
      if (stripeCustomer) {
        try {
          const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
          await stripe.customers.del(stripeCustomer.customerId);
        } catch (err) {
          stripeError = err;
        }
      }

      try {
        await cognitoClient.send(
          new AdminDeleteUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: sub,
          })
        );
      } catch (err) {
        cognitoError = err;
      }

      const warnings = [
        stripeError && `Stripe: ${stripeError.message}`,
        cognitoError && `Cognito: ${cognitoError.message}`,
      ].filter(Boolean);

      return res.json({
        message: warnings.length ? 'User deleted from DB, but some external cleanup failed' : 'User successfully deleted',
        ...(warnings.length && { warnings }),
      });
    } catch (e) {
      next(e);
    }
  });
