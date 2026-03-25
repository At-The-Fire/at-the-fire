const { Router } = require('express');
const InventorySnapshot = require('../models/InventorySnapshot.js');

module.exports = Router()
  .get('/', async (req, res, next) => {
    try {
      const data = await InventorySnapshot.getInventorySnapshots(req.userAWSSub);
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .post('/', async (req, res, next) => {
    try {
      const data = await InventorySnapshot.addOrUpdateSnapshot(req.userAWSSub);
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
