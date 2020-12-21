const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const sharp = require('sharp');
const imagemin = require('imagemin');
const mozjpeg = require('imagemin-mozjpeg');
const Product = require('../models/productModel');
const auth = require('../middleware/auth');
const getCurrentUser = require('../middleware/getCurrentUser');
const { createSortObject, pages, PRODUCT_SELLER_POPULATE } = require('../utils/utilities');
const User = require('../models/userModel');
const router = new express.Router();

router.post('/products', auth, async (req, res) => {
  const product = new Product({
    ...req.body,
    seller: req.user._id,
  });
  try {
    await product.save();
    res.status(201).send({ product });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.get('/products', getCurrentUser, async (req, res) => {
  const match = {};
  const page = req.query.page;
  const sellerUsername = req.query.seller;

  switch (page) {
    case pages.ALL_PRODUCTS:
      if (req.user) {
        match.seller = {
          $ne: mongoose.Types.ObjectId(req.user._id),
        };
      }
      break;
    case pages.MY_PRODUCTS:
      if (req.user) {
        match.seller = req.user._id;
      }
      break;
    case pages.USER_PRODUCTS:
      const sellerDetails = await User.findOne({ username: sellerUsername });
      match.seller = sellerDetails._id;
      break;
    default:
      break;
  }
  if (req.query.condition) {
    const conditionArray = req.query.condition.split(',');
    match.condition = new RegExp(conditionArray.toString().replace(/,/g, '|'), 'gi');
  }
  if (req.query.name) {
    match.name = new RegExp(req.query.name, 'gi');
  }
  match.price = {
    $gte: req.query.minPrice || 0,
    $lte: req.query.maxPrice || Infinity,
  }
  const sort = createSortObject(req);
  try {
    const limit = +req.query.limit || 10;
    const products = await Product.find(match, null, {
      limit,
      skip: ((+req.query.p) - 1) * limit,
      collation: {
        locale: 'en',
      },
      sort,
    });
    const productCount = await Product.countDocuments(match);

    const matchToPrices = { ...match };
    delete matchToPrices.condition;
    delete matchToPrices.price;

    const productPrices = await Product.aggregate([
      { $match: matchToPrices },
      { $group: {
        _id: null,
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      } },
    ]);

    res.send({ products, productCount, productPrices });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(PRODUCT_SELLER_POPULATE);
    if (!product) {
      return res.status(404).send({ message: 'Product not found' });
    }
    res.send({ product });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/products/:id/seller', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'description', 'price', 'quantity', 'condition'];
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
  if (!isValidOperation) {
    return res.status(400).send({ message: `You can't change these data!` });
  }
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id }).populate(PRODUCT_SELLER_POPULATE);
    if (!product) {
      return res.status(404).send();
    }
    updates.forEach((update) => {
      product[update] = req.body[update];
    });
    await product.save();
    res.send({ product });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.patch('/products/:id/buyer', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id });
    if (!product) {
      return res.status(404).send();
    }
    if (product.seller.equals(req.user._id)) {
      return res.status(403).send();
    }
    if (product.quantity < +req.body.quantityPurchased) {
      throw new Error({ message: `There are not that many pieces available anymore. Since the start of the transaction, the number of pieces has decreased` });
    }
    product.quantity = product.quantity - +req.body.quantityPurchased;
    product.quantitySold = product.quantitySold + +req.body.quantityPurchased;
    if (product.quantity <= 0) {
      await product.remove();
      return res.send();
    }
    await product.save();
    res.send({ product });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.delete('/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id }).populate(PRODUCT_SELLER_POPULATE);
    if (!product) {
      return res.status(404).send({ message: 'This product does not exist' });
    }
    if (!product.seller.equals(req.user._id) && !req.user.isAdmin) {
      return res.status(403).send({ message: `You don't have permission to do this!` });
    }
    product.deleteOne();
    res.send({ product });
  } catch (err) {
    res.status(500).send(err);
  }
});

const upload = multer({
  limits: {
    fileSize: 6291456,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Please upload a JPG or PNG'));
    }
    cb(undefined, true);
  }
});

router.post('/products/:id/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    const buffer = await sharp(req.file.buffer).resize({ height: 500 }).jpeg().toBuffer();
    const miniBuffer = await imagemin.buffer(buffer, {
      plugins: [mozjpeg({ quality: 60 })],
    });
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id }).populate(PRODUCT_SELLER_POPULATE);
    if (!product) {
      throw new Error({ message: 'Product not found' });
    }
    product.photo = miniBuffer;
    await product.save();
    res.send({ product });
  } catch (err) {
    res.status(400).send(err);
  }
}, (err, req, res, next) => {
  res.status(400).send(err);
});

router.get('/products/:id/photo', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.photo) {
      throw new Error();
    }
    res.set('Content-Type', 'image/jpeg');
    res.send(product.photo);
  } catch (err) {
    res.status(404).send();
  }
});

router.delete('/products/:id/photo', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id }).populate(PRODUCT_SELLER_POPULATE);
    if (!product || !product.photo) {
      return res.status(404).send();
    }
    if (!product.seller.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).send();
    }
    product.photo = undefined;
    product.save();
    res.send();
  } catch (err) {
    res.status(500).send();
  }
});

module.exports = router;