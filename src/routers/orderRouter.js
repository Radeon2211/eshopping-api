const express = require('express');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const auth = require('../middleware/auth');
const {
  createSortObject,
  verifyItemsToBuy,
  splitOrderProducts,
  updateUserCart,
  getFullUser,
} = require('../shared/utility');

const router = new express.Router();

router.post('/orders', auth, async (req, res) => {
  try {
    const { transaction, orderProducts, isDifferent } = await verifyItemsToBuy(
      req.body.transaction,
    );
    if (isDifferent) {
      await updateUserCart(req.user, req.user.cart);
      return res.status(200).send({ transaction });
    }

    const splittedProducts = await splitOrderProducts(orderProducts);

    for (const order of splittedProducts) {
      const overallPrice = order.products.reduce(
        (acc, { price, quantity }) => acc + price * quantity,
        0,
      );
      const roundedOverallPrice = Math.round((overallPrice + Number.EPSILON) * 100) / 100;

      const newOrder = new Order({
        ...order,
        buyer: req.user._id,
        deliveryAddress: req.body.deliveryAddress,
        overallPrice: roundedOverallPrice,
      });
      await newOrder.save();

      for (const orderProduct of order.products) {
        const productDetails = await Product.findById(orderProduct._id);
        productDetails.quantity -= orderProduct.quantity;

        if (productDetails.quantity <= 0) {
          await productDetails.remove();
        } else {
          productDetails.quantitySold += orderProduct.quantity;
          const userBoughtQuantity = await Order.countDocuments({
            buyer: newOrder.buyer,
            'products._id': orderProduct._id,
          });
          if (userBoughtQuantity <= 1) {
            productDetails.buyerQuantity += 1;
          }
          await productDetails.save();
        }
      }
    }

    await updateUserCart(req.user, req.user.cart);

    let updatedCart = null;
    if (req.body.clearCart) {
      updatedCart = [];
      req.user.cart = [];
      await req.user.save();
    } else {
      const user = await getFullUser(req.user._id);
      updatedCart = user.cart;
    }

    res.status(201).send({ cart: updatedCart });
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
    }).lean();
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
    }).lean();
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
