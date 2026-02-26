const { Router } = require('express');
const Orders = require('../models/Orders.js');
const validateOrder = require('../middleware/validateOrder.js');

function checkIfOrderExistsAndMatchCustomerId({
  res,
  existingOrder,
  customerId,
}) {
  if (!existingOrder) {
    res.status(404).json({
      message: 'Order not found',
    });
    return true;
  }

  if (existingOrder.customerId !== customerId) {
    res.status(403).json({
      message: 'Access denied',
    });
    return true;
  }
}

module.exports = Router()
  .get('/', async (req, res, next) => {
    try {
      const customerId = req.customerId;

      const data = await Orders.getOrders(customerId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .post('/', validateOrder, async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot create new orders.',
      });
    }

    try {
      const customerId = req.customerId;
      const data = await Orders.insertNewOrder({
        customerId,
        ...req.body.orderData,
      });

      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .put('/:orderId', validateOrder, async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot edit orders.',
      });
    }
    try {
      const customerId = req.customerId;
      const orderId = req.params.orderId;
      const orderData = req.body.orderData;

      // Check if the order belongs to the customer
      const existingOrder = await Orders.getOrderById(orderId);

      const checkOrderObj = {
        res,
        existingOrder,
        customerId,
      };

      if (checkIfOrderExistsAndMatchCustomerId(checkOrderObj)) return;

      // Update the order
      const updatedOrder = await Orders.editOrder(
        orderId,
        customerId,
        orderData
      );
      res.json(updatedOrder);
    } catch (e) {
      next(e);
    }
  })

  .put('/:orderId/fulfillment', async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot edit orders.',
      });
    }

    if (typeof req.body.isFulfilled === 'undefined') {
      return res.status(400).json({
        error: 'Missing data',
      });
    }

    try {
      const customerId = req.customerId;
      const orderId = req.params.orderId;
      const fulfillment = req.body.isFulfilled;

      const existingOrder = await Orders.getOrderById(orderId);

      const checkOrderObj = {
        res,
        existingOrder,
        customerId,
      };

      if (checkIfOrderExistsAndMatchCustomerId(checkOrderObj)) return;

      const updatedOrder = await Orders.updateFulfillment(
        orderId,
        customerId,
        fulfillment
      );
      res.json(updatedOrder);
    } catch (e) {
      next(e);
    }
  })

  .delete('/:orderId', async (req, res, next) => {
    try {
      const orderId = req.params.orderId;
      const customerId = req.customerId;

      const existingOrder = await Orders.getOrderById(orderId);

      const checkOrderObj = {
        res,
        existingOrder,
        customerId,
      };

      if (checkIfOrderExistsAndMatchCustomerId(checkOrderObj)) return;

      await Orders.deleteOrder(orderId, customerId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
