const express = require('express');
const Product = require('../models/productModel');
const auth = require('../middleware/auth');
const router = new express.Router();

router.post('/products', auth, async (req, res) => {
  const product = new Product({
    ...req.body,
    seller: req.user._id,
  });
  try {
    await product.save();
    res.status(201).send(product);
  } catch (err) {
    res.status(400).send(err);
  }
});

module.exports = router;