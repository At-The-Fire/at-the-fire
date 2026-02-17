const { Router } = require('express');
const InventorySnapshot = require('../models/InventorySnapshot.js');

module.exports = Router()
  .get('/', async (req, res, next) => {
    try {
      const customerId = req.customerId;

      // Pass customerId to your service or database query
      const data = await InventorySnapshot.getInventorySnapshots(customerId);

      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .post('/', async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message:
          'Your subscription is inactive. You cannot create new inventory snapshots.',
      });
    }
    try {
      // Access the category_count and price_count from the request body
      const { category_count, price_count } = req.body;
      const customer_id = req.customerId;

      const data = await InventorySnapshot.addOrUpdateSnapshot(
        customer_id,
        category_count,
        price_count
      );

      res.json(data);
    } catch (e) {
      next(e);
    }
  });
