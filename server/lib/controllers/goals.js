const { Router } = require('express');
const QuotaGoal = require('../models/QuotaGoals.js');
const validateQuotaGoals = require('../middleware/validateQuotaGoals.js');

module.exports = Router()
  .get('/', async (req, res, next) => {
    try {
      const customerId = req.customerId;
      const data = await QuotaGoal.getQuotaGoals(customerId);

      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .put('/', validateQuotaGoals, async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot edit goals.',
      });
    }
    try {
      const customerId = req.customerId;

      const data = await QuotaGoal.editQuotaGoals(customerId, req.body);

      res.json(data);
    } catch (e) {
      next(e);
    }
  });
