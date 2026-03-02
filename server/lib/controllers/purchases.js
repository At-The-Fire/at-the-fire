const { Router } = require('express');
const authenticateAWS = require('../middleware/authenticateAWS');
const Purchase = require('../models/Purchase');
const paymentService = require('../services/paymentService');
const pool = require('../utils/pool');
const getRedisClient = require('../../redisClient');

module.exports = Router()
  // POST /api/v1/purchases/intent
  // Calls paymentService.createPaymentIntent(totalAmount, 'usd', { buyerSub, items })
  // Returns { intentId, clientSecret } — or 503 with NullAdapter
  .post('/intent', authenticateAWS, async (req, res, next) => {
    try {
      const { totalAmount, items } = req.body;
      const buyerSub = req.userAWSSub;

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
    let capturedTransactionId = null;
    let transactionStarted = false;
    try {
      const { intentId, items } = req.body;
      const payment = req.body?.payment;
      const buyerSub = req.userAWSSub;

      if (!intentId || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'intentId and items are required' });
      }

      // Validate items + calculate totals BEFORE capturing payment
      const normalizedItems = items.map((item) => ({
        postId: Number(item?.postId),
        quantity: Number(item?.quantity),
      }));

      for (const item of normalizedItems) {
        if (!Number.isInteger(item.postId) || item.postId <= 0) {
          return res.status(400).json({ error: 'Each item requires a valid postId' });
        }
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          return res.status(400).json({ error: 'Each item requires a valid quantity' });
        }
      }

      const itemDetails = [];
      for (const item of normalizedItems) {
        const { rows: postRows } = await client.query(
          `
          SELECT id, customer_id, price, quantity AS available_quantity, sold
          FROM gallery_posts
          WHERE id = $1
          `,
          [item.postId],
        );

        if (!postRows[0]) {
          return res.status(404).json({ error: `Post ${item.postId} not found` });
        }

        const post = postRows[0];
        if (post.sold) {
          return res.status(409).json({ error: `Post ${item.postId} is already sold` });
        }
        if (post.available_quantity < item.quantity) {
          return res.status(409).json({ error: `Insufficient quantity for post ${item.postId}` });
        }

        const pricePerItem = Number.parseFloat(post.price);
        if (!Number.isFinite(pricePerItem) || pricePerItem < 0) {
          return res.status(400).json({ error: `Invalid price for post ${item.postId}` });
        }

        itemDetails.push({
          postId: post.id,
          sellerCustomerId: post.customer_id,
          pricePerItem,
          availableQuantity: post.available_quantity,
          quantity: item.quantity,
          amountPaid: pricePerItem * item.quantity,
        });
      }

      // Capture payment (mock or real processor). If processor isn't configured, this will 503.
      const captureResult = await paymentService.capturePayment(intentId, payment);
      capturedTransactionId = captureResult?.transactionId || null;

      await client.query('BEGIN');
      transactionStarted = true;

      const purchaseIds = [];
      const summary = [];

      for (const item of itemDetails) {
        // 1) Create purchase record
        const { rows: purchaseRows } = await client.query(
          `
          INSERT INTO purchases (
            buyer_sub,
            seller_customer_id,
            item_type,
            item_id,
            quantity,
            amount_paid,
            processor_transaction_id,
            status
          )
          VALUES ($1, $2, 'gallery_post', $3, $4, $5, $6, 'completed')
          RETURNING id
          `,
          [
            buyerSub,
            item.sellerCustomerId,
            item.postId,
            item.quantity,
            item.amountPaid,
            capturedTransactionId,
          ],
        );

        purchaseIds.push(purchaseRows[0].id);

        // 2) Decrement inventory atomically and prevent negative quantities
        const newQuantity = item.availableQuantity - item.quantity;
        const isSold = newQuantity === 0;

        const updateResult = await client.query(
          `
          UPDATE gallery_posts
          SET quantity = $2, sold = $3
          WHERE id = $1 AND sold = false AND quantity >= $4
          RETURNING id
          `,
          [item.postId, newQuantity, isSold, item.quantity],
        );

        if (!updateResult.rows[0]) {
          const err = new Error(`Insufficient quantity for post ${item.postId}`);
          err.status = 409;
          throw err;
        }

        summary.push({
          postId: item.postId,
          quantityPurchased: item.quantity,
          amountPaid: item.amountPaid,
          newQuantity,
          isSold,
        });
      }

      await client.query('COMMIT');
      transactionStarted = false;

      const redisClient = await getRedisClient();
      await redisClient.del('gallery:main');

      res.json({ purchaseIds, summary });
    } catch (e) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {
          // ignore rollback errors
        }
      }

      // Best-effort refund if we captured but failed to fulfill.
      if (capturedTransactionId) {
        try {
          await paymentService.refundPayment(capturedTransactionId);
        } catch (_) {
          // Do not mask original error
        }
      }

      next(e);
    } finally {
      client.release();
    }
  })

  // GET /api/v1/purchases/seller - get seller's sales
  .get('/seller', authenticateAWS, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        'SELECT customer_id FROM stripe_customers WHERE aws_sub = $1',
        [req.userAWSSub],
      );
      if (!rows[0]) return res.json([]);
      const purchases = await Purchase.getBySellerCustomerId(rows[0].customer_id);
      res.json(purchases);
    } catch (e) {
      next(e);
    }
  })

  // GET /api/v1/purchases - get user's purchase history
  .get('/', authenticateAWS, async (req, res, next) => {
    try {
      const buyerSub = req.userAWSSub;
      const purchases = await Purchase.getByBuyerSub(buyerSub);
      res.json(purchases);
    } catch (e) {
      next(e);
    }
  })

  // PUT /api/v1/purchases/:id/tracking - seller sets tracking number
  .put('/:id/tracking', authenticateAWS, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { trackingNumber } = req.body;

      if (!trackingNumber || typeof trackingNumber !== 'string') {
        return res.status(400).json({ error: 'trackingNumber must be a string' });
      }

      const purchase = await Purchase.getById(id);
      if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

      // Verify seller ownership via stripe_customers
      const { rows } = await pool.query(
        'SELECT aws_sub FROM stripe_customers WHERE customer_id = $1',
        [purchase.sellerCustomerId],
      );
      if (!rows[0] || rows[0].aws_sub !== req.userAWSSub) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updated = await Purchase.updateTracking(id, trackingNumber);

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${updated.buyerSub}`).emit('tracking-info', {
          purchaseId: updated.id,
          trackingNumber: updated.trackingNumber,
        });
      }

      res.json(updated);
    } catch (e) {
      next(e);
    }
  });
