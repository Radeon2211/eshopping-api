const express = require('express');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const VerificationCode = require('../models/verificationCodeModel');
const { seedAuth } = require('../middlewares/auth');
const { userOne, productOne } = require('../../tests/cypress/db');

const router = new express.Router();

router.post('/seed', seedAuth, async (_, res) => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Order.deleteMany();
    await VerificationCode.deleteMany();

    await new User(userOne).save();
    await new Product(productOne).save();

    res.send();
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
