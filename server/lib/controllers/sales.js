const { Router } = require('express');
const Sales = require('../models/Sales');
const QuotaProduct = require('../models/QuotaProduct');

const router = Router({ mergeParams: true });

// GET all sales for a product
router.get('/', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const sales = await Sales.getSalesByProductId(productId);
    res.json(sales);
  } catch (e) {
    next(e);
  }
});

// POST a new sale for a product
router.post('/', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantitySold, dateSold } = req.body;

    //Product check
    const product = await QuotaProduct.getQuotaProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Oversell check
    const total = await QuotaProduct.getSalesTotal(productId);
    if (Number(total) + Number(quantitySold) > Number(product.qty)) {
      return res.status(400).json({ error: 'Sale exceeds available stock' });
    }

    // Calculate if this sale completes the product
    const newTotal = Number(total) + Number(quantitySold);
    const isSold = newTotal >= Number(product.qty);

    const sale = await Sales.insertSale({
      productId,
      quantitySold,
      dateSold,
      isSold,
    });

    res.status(201).json(sale);
  } catch (e) {
    next(e);
  }
});

// PUT a sale for a product
router.put('/:saleId', async (req, res, next) => {
  try {
    const { saleId } = req.params;
    const { quantitySold, dateSold } = req.body;

    const sale = await Sales.updateSale(saleId, { quantitySold, dateSold });
    res.json(sale);
  } catch (e) {
    next(e);
  }
});

// DELETE a sale by saleId
router.delete('/:saleId', async (req, res, next) => {
  try {
    const { saleId } = req.params;
    const deleted = await Sales.deleteSale(saleId);
    if (!deleted) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
