const { Router } = require('express');
const adminIdCheck = require('../middleware/adminIdCheck');
const Payout = require('../models/Payout');

module.exports = Router()
  // GET /api/v1/payouts/summary — admin: all sellers with pending balances
  .get('/summary', [adminIdCheck], async (req, res, next) => {
    try {
      const summaries = await Payout.getSellerSummaries();
      res.json(summaries);
    } catch (e) {
      next(e);
    }
  })

  // GET /api/v1/payouts — admin: full payout history
  .get('/', [adminIdCheck], async (req, res, next) => {
    try {
      const history = await Payout.getPayoutHistory();
      res.json(history);
    } catch (e) {
      next(e);
    }
  })

  // POST /api/v1/payouts — admin: record a payout to a seller
  .post('/', [adminIdCheck], async (req, res, next) => {
    try {
      const { sellerSub, amount, periodStart, periodEnd, notes } = req.body;

      if (!sellerSub || typeof sellerSub !== 'string') {
        return res.status(400).json({ error: 'sellerSub is required' });
      }
      const parsedAmount = Number(amount);
      if (!parsedAmount || parsedAmount <= 0) {
        return res.status(400).json({ error: 'amount must be a positive number' });
      }

      const payout = await Payout.createPayout({
        sellerSub,
        amount: parsedAmount,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        notes: notes || null,
        paidBySub: req.userAWSSub,
      });

      res.status(201).json(payout);
    } catch (e) {
      next(e);
    }
  })

  // GET /api/v1/payouts/my-earnings — authenticated seller: own earnings + payout history
  .get('/my-earnings', async (req, res, next) => {
    try {
      const earnings = await Payout.getSellerEarnings(req.userAWSSub);
      res.json(earnings);
    } catch (e) {
      next(e);
    }
  });
