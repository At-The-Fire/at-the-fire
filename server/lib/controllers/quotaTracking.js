const { Router } = require('express');
const QuotaProduct = require('../models/QuotaProduct.js');
const validateQuotaProduct = require('../middleware/validateQuotaProduct.js');
const authDelUp = require('../middleware/authDelUp.js');
const Post = require('../models/Post.js');
const Sales = require('../models/Sales.js');

module.exports = Router()
  .get('/', async (req, res, next) => {
    try {
      const customerId = req.customerId;
      const data = await QuotaProduct.getQuotaProducts(customerId);
      // For each product with a post_id, check if the post exists
      for (const product of data) {
        if (product.post_id) {
          const post = await Post.getById(product.post_id);
          if (!post) {
            product.post_id = null;
          }
        }
        // Add sales array for each product
        product.sales = await Sales.getSalesByProductId(product.id);
      }

      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .post('/', validateQuotaProduct, async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot create new inventory products.',
      });
    }
    try {
      const customer_id = req.customerId;
      const data = await QuotaProduct.insertNewProduct({
        ...req.body,
        customer_id,
      });
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .put('/:id', [validateQuotaProduct, authDelUp], async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot edit inventory products.',
      });
    }
    try {
      const customerId = req.customerId;
      const data = await QuotaProduct.updateProduct(req.body, req.params.id, customerId);

      if (!data) {
        res.status(404).send({ error: 'Product not found' });
      }

      // Add sales array for the updated product, matching GET behavior
      data.sales = await Sales.getSalesByProductId(data.id);

      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .delete('/:id', authDelUp, async (req, res, next) => {
    try {
      const deletedProduct = await QuotaProduct.deleteProduct(req.params.id);

      if (!deletedProduct) {
        res.status(404).send({ error: 'Product not found' });
      }

      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });
