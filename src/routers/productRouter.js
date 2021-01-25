const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const sharp = require('sharp');
const imagemin = require('imagemin');
const mozjpeg = require('imagemin-mozjpeg');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const auth = require('../middlewares/auth');
const getCurrentUser = require('../middlewares/getCurrentUser');
const { photoLimiter } = require('../middlewares/limiters');
const { createSortObject, getCorrectProduct } = require('../shared/utility');
const { pages, SELLER_USERNAME_POPULATE } = require('../shared/constants');

const router = new express.Router();

router.post('/products', auth, async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      seller: req.user._id,
      quantitySold: 0,
      buyerQuantity: 0,
    });
    await product.save();
    res.status(201).send({ productId: product._id });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.get('/products', getCurrentUser, async (req, res) => {
  try {
    const match = {};
    const { page, seller: sellerUsername } = req.query;

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
        const sellerDetails = await User.findOne({ username: sellerUsername }).lean();
        if (sellerDetails) {
          match.seller = sellerDetails._id;
        } else {
          return res.send({ products: [], productCount: 0, productPrices: [] });
        }
        break;
      default:
        break;
    }

    if (req.query.condition) {
      const conditionArray = req.query.condition.split(',');
      // eslint-disable-next-line security/detect-non-literal-regexp
      match.condition = new RegExp(conditionArray.toString().replace(/,/g, '|'), 'gi');
    }
    if (req.query.name) {
      // eslint-disable-next-line security/detect-non-literal-regexp
      match.name = new RegExp(req.query.name, 'gi');
    }
    match.price = {
      $gte: req.query.minPrice || 0,
      $lte: req.query.maxPrice || Infinity,
    };
    const sort = createSortObject(req);

    const limit = +req.query.limit || 10;
    const products = await Product.find(match, null, {
      limit,
      skip: ((+req.query.p || 1) - 1) * limit,
      collation: {
        locale: 'en',
      },
      sort,
    })
      .populate(SELLER_USERNAME_POPULATE)
      .lean();

    const productCount = await Product.countDocuments(match);

    const matchToPrices = { ...match };
    delete matchToPrices.condition;
    delete matchToPrices.price;

    const productPrices = await Product.aggregate([
      { $match: matchToPrices },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
    ]);

    const correctProducts = products.map((product) => getCorrectProduct(product, true));

    res.send({ products: correctProducts, productCount, productPrices });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(SELLER_USERNAME_POPULATE).lean();
    if (!product) {
      return res.status(404).send({ message: 'Product with given ID does not exist' });
    }
    const correctProduct = getCorrectProduct(product, true);
    res.send({ product: correctProduct });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/products/:id', auth, async (req, res) => {
  try {
    const updateKeys = Object.keys(req.body);
    const allowedUpdates = ['name', 'description', 'price', 'quantity', 'condition'];
    const isValidOperation = updateKeys.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).send({ message: `You can't change these data!` });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      seller: req.user._id,
    }).populate(SELLER_USERNAME_POPULATE);

    if (!product) {
      return res.status(404).send({
        message: 'Product which you try to update does not exist or you are not a seller',
      });
    }

    updateKeys.forEach((updateKey) => {
      // eslint-disable-next-line security/detect-object-injection
      product[updateKey] = req.body[updateKey];
    });
    await product.save();

    const leanProduct = await Product.findById(product._id)
      .populate(SELLER_USERNAME_POPULATE)
      .lean();
    const correctProduct = getCorrectProduct(leanProduct, true);

    res.send({ product: correctProduct });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.delete('/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send({ message: 'Product with given ID does not exist' });
    }
    if (!product.seller.equals(req.user._id) && !req.user.isAdmin) {
      return res.status(403).send({ message: 'You are not allowed to do this' });
    }

    await product.deleteOne();
    res.send();
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
  },
});

router.post(
  '/products/:id/photo',
  auth,
  upload.single('photo'),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).send({ message: 'Product with given ID does not exist' });
      }
      if (!product.seller.equals(req.user._id)) {
        return res.status(403).send({ message: 'You are not allowed to do this' });
      }

      const buffer = await sharp(req.file.buffer).resize({ height: 500 }).jpeg().toBuffer();
      const miniBuffer = await imagemin.buffer(buffer, {
        plugins: [mozjpeg({ quality: 60 })],
      });

      product.photo = miniBuffer;
      await product.save();
      res.send();
    } catch (err) {
      res.status(500).send(err);
    }
  },
  (err, req, res) => {
    res.status(500).send(err);
  },
);

router.get('/products/:id/photo', photoLimiter, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send({ message: 'Product with given ID does not exist' });
    }
    if (!product.photo) {
      return res.status(404).send({ message: 'Product with given ID does not have any photo' });
    }

    res.set('Content-Type', 'image/jpeg');
    res.send(product.photo);
  } catch (err) {
    res.status(500).send();
  }
});

router.delete('/products/:id/photo', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(SELLER_USERNAME_POPULATE);

    if (!product) {
      return res.status(404).send({ message: 'Product with given ID does not exist' });
    }
    if (!product.photo) {
      return res.status(404).send({ message: 'This product does not have any photo to delete' });
    }
    if (product.seller.username !== req.user.username && !req.user.isAdmin) {
      return res.status(403).send({ message: 'You are not allowed to do this' });
    }

    product.photo = undefined;
    product.save();
    res.send();
  } catch (err) {
    res.status(500).send();
  }
});

module.exports = router;
