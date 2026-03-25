const { Router } = require('express');
const authenticateAWS = require('../middleware/authenticateAWS');
const pool = require('../utils/pool');

module.exports = Router()
  // POST /api/v1/cart/validate
  // Body: [{ postId, quantity }]
  // For each item: check gallery_posts WHERE id=$1 AND sold=false AND quantity >= requested
  // Returns: [{ postId, available: bool, currentPrice, availableQty }]
  .post('/validate', authenticateAWS, async (req, res, next) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const validationResults = await Promise.all(
        items.map(async (item) => {
          const { postId, quantity } = item;

          const { rows } = await pool.query(
            `
            SELECT id, price, quantity, sold, shipping_cost
            FROM gallery_posts
            WHERE id = $1
            `,
            [postId],
          );

          if (!rows[0]) {
            return {
              postId,
              available: false,
              reason: 'Post not found',
              currentPrice: null,
              availableQty: 0,
            };
          }

          const post = rows[0];

          // Check if sold
          if (post.sold) {
            return {
              postId,
              available: false,
              reason: 'Item already sold',
              currentPrice: post.price,
              availableQty: 0,
            };
          }

          // Check if sufficient quantity
          if (post.quantity < quantity) {
            return {
              postId,
              available: false,
              reason: 'Insufficient quantity',
              currentPrice: post.price,
              availableQty: post.quantity,
            };
          }

          return {
            postId,
            available: true,
            currentPrice: post.price,
            availableQty: post.quantity,
            shippingCost: post.shipping_cost,
          };
        }),
      );

      res.json(validationResults);
    } catch (e) {
      next(e);
    }
  });
