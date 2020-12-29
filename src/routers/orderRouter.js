const express = require('express');
const Order = require('../models/orderModel');
const auth = require('../middleware/auth');
const { createSortObject } = require('../shared/utility');

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
    res.status(201).send({ orders });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.get('/orders/buy', auth, async (req, res) => {
  try {
    const sort = createSortObject(req);
    const orders = await Order.find({ buyer: req.user._id }, null, {
      limit: parseInt(req.query.limit, 10),
      skip: parseInt(req.query.skip, 10),
      sort,
    });
    res.send({ orders });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/orders/sell', auth, async (req, res) => {
  try {
    const sort = createSortObject(req);
    const orders = await Order.find({ seller: req.user._id }, null, {
      limit: parseInt(req.query.limit, 10),
      skip: parseInt(req.query.skip, 10),
      sort,
    });
    res.send({ orders });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id }).populate('seller').populate('buyer');
    if (!order) {
      return res.status(404).send();
    }
    if (!order.seller.equals(req.user._id) && !order.buyer.equals(req.user._id)) {
      return res.status(403).send();
    }
    res.send({ order });
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
