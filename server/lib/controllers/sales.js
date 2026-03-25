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

    const product = await QuotaProduct.getQuotaProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Ownership check
    if (product.customer_id !== req.customerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Oversell check
    const total = await QuotaProduct.getSalesTotal(productId);
    if (Number(total) + Number(quantitySold) > Number(product.qty)) {
      return res.status(400).json({ error: 'Sale exceeds available stock' });
    }

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
    const { productId, saleId } = req.params;
    const { quantitySold, dateSold } = req.body;

    const product = await QuotaProduct.getQuotaProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.customer_id !== req.customerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sale = await Sales.updateSale(saleId, { quantitySold, dateSold });
    res.json(sale);
  } catch (e) {
    next(e);
  }
});

// DELETE a sale by saleId
router.delete('/:saleId', async (req, res, next) => {
  try {
    const { productId, saleId } = req.params;

    const product = await QuotaProduct.getQuotaProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.customer_id !== req.customerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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
