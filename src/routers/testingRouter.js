const express = require('express');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const VerificationCode = require('../models/verificationCodeModel');
const { e2eAuth } = require('../middlewares/auth');
const cypressFixtures = require('../../tests/cypress/db');
const { verificationCodeTypes, userStatuses } = require('../shared/constants');

const router = new express.Router();

router.patch('/testing/seed', e2eAuth, async (_, res) => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Order.deleteMany();
    await VerificationCode.deleteMany();

    for (const user of cypressFixtures.users) {
      await new User(user).save();
    }
    for (const product of cypressFixtures.products) {
      await new Product(product).save();
    }

    res.send();
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/testing/verify-email', e2eAuth, async (req, res) => {
  try {
    const verificationCode = await VerificationCode.findOne({
      email: req.body.email,
      type: verificationCodeTypes.CHANGE_EMAIL,
    });
    const user = await User.findOne({ email: req.body.email });

    user.email = verificationCode.newEmail;
    await user.save();
    await verificationCode.remove();

    res.send();
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/testing/activate-account', e2eAuth, async (req, res) => {
  try {
    const verificationCode = await VerificationCode.findOne({
      email: req.body.email,
      type: verificationCodeTypes.ACCOUNT_ACTIVATION,
    });
    const user = await User.findOne({ email: req.body.email });

    user.status = userStatuses.ACTIVE;
    await user.save();
    await verificationCode.remove();

    res.send();
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
