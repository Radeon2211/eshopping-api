const express = require('express');
const { ObjectID } = require('mongodb');
const User = require('../models/userModel');
const auth = require('../middleware/auth');

const router = new express.Router();
const { updateCartActions, MAX_CART_ITEMS_NUMBER } = require('../shared/constants');
const { updateUserCart, verifyItemsToTransaction, getFullUser } = require('../shared/utility');
const Product = require('../models/productModel');

router.post('/users', async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    const token = await user.generateAuthToken();
    res.cookie('token', token, { httpOnly: true, sameSite: 'None', secure: true });
    res.status(201).send({ user });
  } catch (err) {
    if (user) {
      await User.findByIdAndDelete(user._id);
    }
    res.status(400).send(err);
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password);
    const isCartDifferent = await updateUserCart(user, user.cart);
    const fullUser = await getFullUser(user._id);
    const token = await user.generateAuthToken();
    res.cookie('token', token, { httpOnly: true, sameSite: 'None', secure: true });
    res.send({ user: fullUser, isDifferent: isCartDifferent });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(({ token }) => token !== req.token);
    await req.user.save();
    res.send();
  } catch (err) {
    res.status(500).send();
  }
});

router.get('/users/me', auth, async (req, res) => {
  try {
    const isCartDifferent = await updateUserCart(req.user, req.user.cart);
    const user = await getFullUser(req.user._id);
    res.send({ user, isDifferent: isCartDifferent });
  } catch (err) {
    res.status(500).send();
  }
});

router.get('/users/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    const publicProfile = user.getPublicProfile();
    res.send({ profile: publicProfile });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/users/me', auth, async (req, res) => {
  let updates = Object.keys(req.body);
  const allowedUpdates = [
    'email',
    'password',
    'firstName',
    'lastName',
    'street',
    'zipCode',
    'country',
    'city',
    'phone',
    'contacts',
  ];
  try {
    if (updates.includes('email') || updates.includes('password')) {
      updates = await req.user.checkCurrentCredentials(updates, req.body);
    }
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
      return res.status(400).send({ message: `You can't change these data` });
    }
    updates.forEach((update) => {
      req.user[update] = req.body[update];
    });
    await updateUserCart(req.user, req.user.cart);
    const user = await getFullUser(req.user._id);
    res.send({ user });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.patch('/users/add-admin', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).send({ message: `You are not an admin and you can't do that` });
    }
    const user = await User.findOne({ email: req.body.email });
    user.isAdmin = true;
    await user.save();
    res.send();
  } catch (err) {
    res.status(400).send(err);
  }
});

router.patch('/users/remove-admin', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).send({ message: `You are not an admin and you can't do that` });
    }
    const user = await User.findOne({ email: req.body.email });
    user.isAdmin = undefined;
    await user.save();
    res.send();
  } catch (err) {
    res.status(400).send(err);
  }
});

router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.checkCurrentPassword(req.body);
    await req.user.remove();
    res.send();
  } catch (err) {
    if (err.message) {
      res.status(400).send(err);
      return;
    }
    res.status(500).send(err);
  }
});

router.get('/cart', auth, async (req, res) => {
  try {
    const isCartDifferent = await updateUserCart(req.user, req.user.cart);
    const user = await getFullUser(req.user._id);
    res.send({ cart: user.cart, isDifferent: isCartDifferent });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/cart/add', auth, async (req, res) => {
  try {
    const newItem = req.body;
    const productDetails = await Product.findById(newItem.product).lean();
    if (!productDetails) {
      return res.status(404).send({ message: 'This product probably has already been sold' });
    }
    if (productDetails.seller.equals(req.user._id)) {
      return res.status(403).send({ message: `You can't add your own product to the cart!` });
    }
    let updatedCart = null;
    const givenProductInCart = req.user.cart.find(({ product }) =>
      product.equals(productDetails._id),
    );
    if (givenProductInCart) {
      const cart = JSON.parse(JSON.stringify(req.user.cart));
      updatedCart = cart.map((item) => {
        if (item.product === newItem.product) {
          if (item.quantity + newItem.quantity > productDetails.quantity) {
            return {
              ...item,
              quantity: productDetails.quantity,
            };
          }
          return {
            ...item,
            quantity: item.quantity + newItem.quantity,
          };
        }
        return item;
      });
    } else {
      if (req.user.cart.length >= MAX_CART_ITEMS_NUMBER) {
        return res.status(403).send({ message: 'You can have up to 50 products in the cart' });
      }
      updatedCart = [...req.user.cart, newItem];
    }
    const isCartDifferent = await updateUserCart(req.user, updatedCart);
    const user = await getFullUser(req.user._id);
    res.send({ cart: user.cart, isDifferent: isCartDifferent });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/cart/:itemId/update', auth, async (req, res) => {
  try {
    const { action } = req.query;
    const givenQuantity = +req.query.quantity;
    if (
      !Object.values(updateCartActions).includes(action) ||
      (action === updateCartActions.NUMBER && !givenQuantity)
    ) {
      return res.status(400).send({
        message: 'Cart update action to perform is not provided or is not valid',
      });
    }
    const cart = JSON.parse(JSON.stringify(req.user.cart));
    const updatedCart = [];
    for (const item of cart) {
      if (item._id === req.params.itemId) {
        let productDetails = null;
        switch (action) {
          case updateCartActions.INCREMENT:
            productDetails = await Product.findById(item.product).lean();
            if (item.quantity >= productDetails.quantity) {
              updatedCart.push(item);
            } else {
              updatedCart.push({
                ...item,
                quantity: item.quantity + 1,
              });
            }
            break;
          case updateCartActions.DECREMENT:
            if (item.quantity <= 1) {
              updatedCart.push(item);
            } else {
              updatedCart.push({
                ...item,
                quantity: item.quantity - 1,
              });
            }
            break;
          case updateCartActions.NUMBER:
            productDetails = await Product.findById(item.product).lean();
            if (givenQuantity < 1 || givenQuantity === item.quantity) {
              updatedCart.push(item);
            } else if (givenQuantity > productDetails.quantity) {
              updatedCart.push({
                ...item,
                quantity: productDetails.quantity,
              });
            } else {
              updatedCart.push({
                ...item,
                quantity: givenQuantity,
              });
            }
            break;
          default:
            updatedCart.push(item);
        }
      } else {
        updatedCart.push(item);
      }
    }
    const isCartDifferent = await updateUserCart(req.user, updatedCart);
    const user = await getFullUser(req.user._id);
    res.send({ cart: user.cart, isDifferent: isCartDifferent });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/cart/:itemId/remove', auth, async (req, res) => {
  try {
    const { cart } = req.user;
    const updatedCart = cart.filter(({ _id }) => ObjectID(_id).toString() !== req.params.itemId);
    const isCartDifferent = await updateUserCart(req.user, updatedCart);
    const user = await getFullUser(req.user._id);
    res.send({ cart: user.cart, isDifferent: isCartDifferent });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/cart/clear', auth, async (req, res) => {
  try {
    req.user.cart = [];
    await req.user.save();
    res.send();
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/transaction', auth, async (req, res) => {
  try {
    const { singleItem } = req.body;

    const items = singleItem ? [singleItem] : req.user.cart;
    const { transaction, isDifferent } = await verifyItemsToTransaction(
      items,
      !singleItem,
      req.user,
    );

    let updatedCart = null;
    if (isDifferent && !singleItem) {
      const user = await getFullUser(req.user._id);
      updatedCart = user.cart;
    }

    res.send({ transaction, isDifferent, cart: updatedCart });
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
