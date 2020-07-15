const express = require('express');
const Order = require('../models/orderModel');
const auth = require('../middleware/auth');
const router = new express.Router();

router.post('/orders', auth, (req, res) => {
  try {
    const orders = [];
    req.body.forEach(async (order) => {
      const newOrder = new Order({
        ...order,
        buyer: req.user._id,
      });
      orders.push(newOrder);
      await newOrder.save();
    });
    res.status(201).send(orders);
  } catch (err) {
    res.status(400).send(err);
  }
});

router.get('/orders/buy', auth, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id }, null, {
      limit: parseInt(req.query.limit),
      skip: parseInt(req.query.skip),
    });
    res.send(orders);
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/orders/sell', auth, async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user._id }, null, {
      limit: parseInt(req.query.limit),
      skip: parseInt(req.query.skip),
    });
    res.send(orders);
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;