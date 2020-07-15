const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const imagemin = require('imagemin');
const mozjpeg = require('imagemin-mozjpeg');
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

router.get('/products', async (req, res) => {
  const match = {};
  const sort = {};
  if (req.query.seller) {
    match.seller = req.query.seller;
  }
  if (req.query.condition) {
    match.condition = req.query.condition;
  }
  if (req.query.name) {
    match.name = new RegExp(req.query.name, 'gi');
  }
  match.price = {
    $gte: req.query.minPrice || 0,
    $lte: req.query.maxPrice || Infinity,
  }
  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(':');
    sort[parts[0]] = parts[1] === 'asc' ? 1 : -1;
  }
  try {
    const products = await Product.find(match, null, {
      limit: parseInt(req.query.limit),
      skip: parseInt(req.query.skip),
      sort,
    });
    const productCount = await Product.countDocuments(match);
    const productPrices = await Product.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" }
      } },
    ]);
    res.send({ products, productCount, productPrices });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id });
    if (!product) {
      return res.status(404).send();
    }
    res.send(product);
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/products/:id/seller', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'description', 'price', 'quantity', 'condition'];
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) {
      return res.status(404).send();
    }
    updates.forEach((update) => {
      product[update] = req.body[update];
    });
    await product.save();
    res.send(product);
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
    product.quantity = product.quantity - req.body.quantityPurchased;
    await product.save();
    res.send(product);
  } catch (err) {
    res.status(400).send(err);
  }
});

router.delete('/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
    if (!product) {
      return res.status(404).send();
    }
    res.send(product);
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
      return cb(new Error('Please upload a JPG, JPEG or PNG'));
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
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) {
      throw new Error();
    }
    product.photo = miniBuffer;
    await product.save();
    res.send();
  } catch (err) {
    res.status(400).send(err);
  }
}, (error, req, res, next) => {
  res.status(400).send({ error: error.message });
});

router.get('/products/:id/photo', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.photo) {
      throw new Error();
    }
    res.set('Content-Type', 'image/png');
    res.send(product.photo);
  } catch (err) {
    res.status(404).send();
  }
});

router.delete('/products/:id/photo', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product || !product.photo) {
      throw new Error();
    }
    product.photo = undefined;
    product.save();
    res.send();
  } catch (err) {
    res.status(404).send();
  }
});

module.exports = router;