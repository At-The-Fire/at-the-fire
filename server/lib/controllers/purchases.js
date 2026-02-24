const { Router } = require('express');
const authenticateAWS = require('../middleware/authenticateAWS');
const Purchase = require('../models/Purchase');
const paymentService = require('../services/paymentService');
const pool = require('../utils/pool');

module.exports = Router()
  // POST /api/v1/purchases/intent
  // Calls paymentService.createPaymentIntent(totalAmount, 'usd', { buyerSub, items })
  // Returns { intentId, clientSecret } — or 503 with NullAdapter
  .post('/intent', authenticateAWS, async (req, res, next) => {
    try {
      const { totalAmount, items } = req.body;
      const buyerSub = req.user.sub;

      if (!totalAmount || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'totalAmount and items are required' });
      }

      // Call payment service (will throw 503 if NullAdapter)
      const result = await paymentService.createPaymentIntent(totalAmount, 'usd', {
        buyerSub,
        items,
      });

      res.json(result);
    } catch (e) {
      next(e);
    }
  })

  // POST /api/v1/purchases/confirm
  // Body: { intentId, items: [{ postId, quantity }] }
  // Creates purchases row(s)
  // For each item: decrements gallery_posts.quantity; if quantity=0, sets sold=true
  // Returns { purchaseIds, summary }
  .post('/confirm', authenticateAWS, async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { intentId, items } = req.body;
      const buyerSub = req.user.sub;

      if (!intentId || !items || !Array.isArray(items)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'intentId and items are required' });
      }

      const purchaseIds = [];
      const summary = [];

      for (const item of items) {
        const { postId, quantity } = item;

        // 1. Get post details including seller customer_id
        const { rows: postRows } = await client.query(
          `
          SELECT id, customer_id, price, quantity AS available_quantity
          FROM gallery_posts
          WHERE id = $1
          `,
          [postId],
        );

        if (!postRows[0]) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Post ${postId} not found` });
        }

        const post = postRows[0];
        const sellerCustomerId = post.customer_id;
        const pricePerItem = parseFloat(post.price);
        const amountPaid = pricePerItem * quantity;

        // 2. Create purchase record
        const { rows: purchaseRows } = await client.query(
          `
          INSERT INTO purchases (buyer_sub, seller_customer_id, item_type, item_id, quantity, amount_paid)
          VALUES ($1, $2, 'gallery_post', $3, $4, $5)
          RETURNING id
          `,
          [buyerSub, sellerCustomerId, postId, quantity, amountPaid],
        );

        purchaseIds.push(purchaseRows[0].id);

        // 3. Decrement gallery_posts.quantity
        const newQuantity = post.available_quantity - quantity;
        const isSold = newQuantity === 0;

        await client.query(
          `
          UPDATE gallery_posts
          SET quantity = $2, sold = $3
          WHERE id = $1
          `,
          [postId, newQuantity, isSold],
        );

        summary.push({
          postId,
          quantityPurchased: quantity,
          amountPaid,
          newQuantity,
          isSold,
        });
      }

      await client.query('COMMIT');

      res.json({ purchaseIds, summary });
    } catch (e) {
      await client.query('ROLLBACK');
      next(e);
    } finally {
      client.release();
    }
  })

  // GET /api/v1/purchases - get user's purchase history
  .get('/', authenticateAWS, async (req, res, next) => {
    try {
      const buyerSub = req.user.sub;
      const purchases = await Purchase.getByBuyerSub(buyerSub);
      res.json(purchases);
    } catch (e) {
      next(e);
    }
  });
