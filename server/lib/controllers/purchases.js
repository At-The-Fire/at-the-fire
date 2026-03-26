const { Router } = require('express');
const authenticateAWS = require('../middleware/authenticateAWS');
const Auction = require('../models/Auction');
const Post = require('../models/Post');
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
  // For each item: decrements gallery_posts.quantity; if quantity=0, sets sold=true
  // Returns { purchaseIds, summary }
  .post('/confirm', authenticateAWS, async (req, res, next) => {
    const client = await pool.connect();
    let capturedTransactionId = null;
    let transactionStarted = false;
    try {
      const { intentId, items, shippingAddress } = req.body;
      const payment = req.body?.payment;
      const buyerSub = req.userAWSSub;

      if (!intentId || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'intentId and items are required' });
      }

      if (
        !shippingAddress ||
        !shippingAddress.fullName ||
        !shippingAddress.line1 ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.zip
      ) {
        return res
          .status(400)
          .json({ error: 'Shipping address is required (fullName, line1, city, state, zip)' });
      }

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

      // Fetch all posts in parallel — reads outside the transaction
      const posts = await Promise.all(
        normalizedItems.map((item) => Post.getForPurchase(item.postId)),
      );

      const itemDetails = [];
      for (let i = 0; i < normalizedItems.length; i++) {
        const item = normalizedItems[i];
        const post = posts[i];

        if (!post) {
          return res.status(404).json({ error: `Post ${item.postId} not found` });
        }
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

        const shippingCost = Number.parseFloat(post.shipping_cost) || 0;
        const amountPaid = pricePerItem * item.quantity + shippingCost;
        const feePct = Number.parseFloat(process.env.PLATFORM_FEE_PCT) || 0;
        const platformFee = Math.round((amountPaid - shippingCost) * feePct * 100) / 100;
        const sellerNet = Math.round((amountPaid - platformFee) * 100) / 100;

        itemDetails.push({
          postId: post.id,
          sellerSub: post.seller_sub,
          availableQuantity: post.available_quantity,
          quantity: item.quantity,
          shippingCost,
          amountPaid,
          platformFee,
          sellerNet,
        });
      }

      // Capture payment before transaction (refund on fulfillment failure)
      const captureResult = await paymentService.capturePayment(intentId, payment);
      capturedTransactionId = captureResult?.transactionId || null;

      await client.query('BEGIN');
      transactionStarted = true;

      const purchaseIds = [];
      const summary = [];

      for (const item of itemDetails) {
        const purchase = await Purchase.insertCompleted(
          {
            buyerSub,
            sellerSub: item.sellerSub,
            itemType: 'gallery_post',
            itemId: item.postId,
            quantity: item.quantity,
            amountPaid: item.amountPaid,
            shippingCost: item.shippingCost,
            platformFee: item.platformFee,
            sellerNet: item.sellerNet,
            processorTransactionId: capturedTransactionId,
            shippingAddress,
          },
          client,
        );

        purchaseIds.push(purchase.id);

        const newQuantity = item.availableQuantity - item.quantity;
        const isSold = newQuantity === 0;

        const decremented = await Post.decrementQuantity(
          item.postId,
          newQuantity,
          isSold,
          item.quantity,
          client,
        );

        if (!decremented) {
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

      const io = req.app.get('io');
      if (io) {
        const sellerSubs = [...new Set(itemDetails.map((item) => item.sellerSub))];
        for (const sellerSub of sellerSubs) {
          io.to(`user_${sellerSub}`).emit('gallery-sold');
        }
      }

      res.json({ purchaseIds, summary });
    } catch (e) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {
          console.error('ROLLBACK');
        }
      }
      if (capturedTransactionId) {
        try {
          await paymentService.refundPayment(capturedTransactionId);
        } catch (_) {
          console.error('Error with refund');
        }
      }
      next(e);
    } finally {
      client.release();
    }
  })

  // POST /api/v1/purchases/auction-intent
  // Body: { auctionId }
  // Verifies buyer is the auction winner, creates a payment intent for final_bid + shipping_cost
  // Returns { intentId, clientSecret, totalAmount }
  .post('/auction-intent', authenticateAWS, async (req, res, next) => {
    try {
      const { auctionId } = req.body;
      const buyerSub = req.userAWSSub;

      if (!auctionId) {
        return res.status(400).json({ error: 'auctionId is required' });
      }

      const result = await Auction.getResultForPayment(auctionId);
      if (!result) return res.status(404).json({ error: 'Auction result not found' });
      if (result.winner_sub !== buyerSub) return res.status(403).json({ error: 'Forbidden' });
      if (result.is_paid) return res.status(409).json({ error: 'Already paid' });

      const shippingCost = Number.parseFloat(result.shipping_cost) || 0;
      const finalBid = Number.parseFloat(result.final_bid);
      const totalAmount = Math.round((finalBid + shippingCost) * 100) / 100;

      const intentResult = await paymentService.createPaymentIntent(totalAmount, 'usd', {
        buyerSub,
        auctionId,
      });

      res.json({ ...intentResult, totalAmount });
    } catch (e) {
      next(e);
    }
  })

  // POST /api/v1/purchases/auction-confirm
  // Body: { intentId, auctionId, payment? }
  // Atomically: captures payment, flips auction_results.is_paid, creates purchases row
  // Returns { purchaseId }
  .post('/auction-confirm', authenticateAWS, async (req, res, next) => {
    const client = await pool.connect();
    let capturedTransactionId = null;
    let transactionStarted = false;
    try {
      const { intentId, auctionId, shippingAddress } = req.body;
      const payment = req.body?.payment;
      const buyerSub = req.userAWSSub;

      if (!intentId || !auctionId) {
        return res.status(400).json({ error: 'intentId and auctionId are required' });
      }

      if (
        !shippingAddress ||
        !shippingAddress.fullName ||
        !shippingAddress.line1 ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.zip
      ) {
        return res
          .status(400)
          .json({ error: 'Shipping address is required (fullName, line1, city, state, zip)' });
      }

      const auctionData = await Auction.getResultForPayment(auctionId);
      if (!auctionData) return res.status(404).json({ error: 'Auction result not found' });
      if (auctionData.winner_sub !== buyerSub) return res.status(403).json({ error: 'Forbidden' });
      if (auctionData.is_paid) return res.status(409).json({ error: 'Already paid' });

      const shippingCost = Number.parseFloat(auctionData.shipping_cost) || 0;
      const finalBid = Number.parseFloat(auctionData.final_bid);
      const amountPaid = Math.round((finalBid + shippingCost) * 100) / 100;
      const feePct = Number.parseFloat(process.env.PLATFORM_FEE_PCT) || 0;
      const platformFee = Math.round(finalBid * feePct * 100) / 100;
      const sellerNet = Math.round((finalBid - platformFee + shippingCost) * 100) / 100;

      const captureResult = await paymentService.capturePayment(intentId, payment);
      capturedTransactionId = captureResult?.transactionId || null;

      await client.query('BEGIN');
      transactionStarted = true;

      const updated = await Auction.setIsPaidWithFees(
        auctionId,
        buyerSub,
        { platformFee, sellerNet },
        client,
      );

      if (!updated) {
        const err = new Error('Auction result not found or already paid');
        err.status = 409;
        throw err;
      }

      const purchase = await Purchase.insertCompleted(
        {
          buyerSub,
          sellerSub: auctionData.seller_sub,
          itemType: 'auction',
          itemId: auctionId,
          quantity: 1,
          amountPaid,
          shippingCost,
          platformFee,
          sellerNet,
          processorTransactionId: capturedTransactionId,
          shippingAddress,
        },
        client,
      );

      await client.query('COMMIT');
      transactionStarted = false;

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${auctionData.seller_sub}`).emit('auction-paid', {
          auctionId: Number(auctionId),
          isPaid: true,
        });
      }

      res.json({ purchaseId: purchase.id });
    } catch (e) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {
          console.error('ROLLBACK');
        }
      }
      if (capturedTransactionId) {
        try {
          await paymentService.refundPayment(capturedTransactionId);
        } catch (_) {
          console.error('Error with refund');
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
      const purchases = await Purchase.getBySellerSub(req.userAWSSub);
      res.json(purchases);
    } catch (e) {
      next(e);
    }
  })

  // GET /api/v1/purchases - get user's purchase history
  .get('/', authenticateAWS, async (req, res, next) => {
    try {
      const purchases = await Purchase.getByBuyerSub(req.userAWSSub);
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

      if (purchase.sellerSub !== req.userAWSSub) {
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
