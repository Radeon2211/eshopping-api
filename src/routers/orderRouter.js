const express = require('express');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const auth = require('../middleware/auth');
const photoLimiter = require('../middleware/photoLimiter');
const {
  orderTypes,
  SELLER_USERNAME_POPULATE,
  BUYER_USERNAME_POPULATE,
  ORDER_SELLER_POPULATE,
} = require('../shared/constants');
const {
  createSortObject,
  getCorrectOrders,
  verifyItemsToBuy,
  splitOrderProducts,
  updateUserCart,
  getFullUser,
} = require('../shared/utility');

const router = new express.Router();

router.post('/orders', auth, async (req, res) => {
  try {
    const { transaction, orderProducts, isDifferent, isBuyingOwnProducts } = await verifyItemsToBuy(
      req.body.transaction,
      req.user._id,
    );

    if (isBuyingOwnProducts) {
      return res.status(403).send({ message: `You can't buy your own products` });
    }

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

router.get('/orders', auth, async (req, res) => {
  try {
    const sort = createSortObject(req);

    let match = null;
    if (req.query.type === orderTypes.PLACED_ORDERS) {
      match = { buyer: req.user._id };
    } else {
      match = { seller: req.user._id };
    }

    const orders = await Order.find(match, null, {
      limit: 6,
      skip: ((+req.query.p || 1) - 1) * 6,
      sort,
    })
      .populate(SELLER_USERNAME_POPULATE)
      .populate(BUYER_USERNAME_POPULATE)
      .lean();

    const orderCount = await Order.countDocuments(match);
    const correctOrders = getCorrectOrders(orders);

    res.send({ orders: correctOrders, orderCount });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate(ORDER_SELLER_POPULATE)
      .populate(BUYER_USERNAME_POPULATE)
      .lean();

    if (!order) {
      return res.status(404).send({ message: 'Such order does not exist' });
    }

    let isDifferentSeller = true;
    let isDifferentBuyer = true;
    if (order.seller) {
      if (order.seller.username === req.user.username) {
        isDifferentSeller = false;
      }
    }
    if (order.buyer) {
      if (order.buyer.username === req.user.username) {
        isDifferentBuyer = false;
      }
    }

    if (isDifferentSeller && isDifferentBuyer) {
      return res.status(403).send({ message: 'You are not allowed to get this order details' });
    }

    const correctOrder = getCorrectOrders([order])[0];

    res.send({ order: correctOrder });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/orders/:id/:productId/photo', photoLimiter, auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send({ message: 'Such order does not exist' });
    }

    const product = order.products.find(({ _id }) => _id.equals(req.params.productId));

    if (!product) {
      return res.status(404).send({ message: 'This product does not exist in given order' });
    }
    if (!product.photo) {
      return res.status(404).send({ message: 'This product does not have any photo' });
    }
    if (!order.seller.equals(req.user._id) && !order.buyer.equals(req.user._id)) {
      return res.status(403).send({ message: 'You are not allowed to get this photo' });
    }

    res.set('Content-Type', 'image/jpeg');
    res.send(product.photo);
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
