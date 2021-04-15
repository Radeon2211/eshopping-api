const express = require('express');
const Joi = require('joi-oid');
const { ObjectID } = require('mongodb');
const generatePassword = require('generate-password');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const { authPending, authActive } = require('../middlewares/auth');
const {
  loginLimiter,
  signupLimiter,
  accountVerificationEmailLimiter,
  verificationLinkLimiter,
  resetPasswordRequestLimiter,
  changeEmailLimiter,
} = require('../middlewares/limiters');
const {
  updateCartActions,
  MAX_CART_ITEMS_NUMBER,
  verificationCodeTypes,
  envModes,
  userStatuses,
} = require('../shared/constants');
const {
  updateUserCart,
  verifyItemsToTransaction,
  getFullUser,
  verificationCodeChecker,
} = require('../shared/utility');
const {
  sendAccountVerificationEmail,
  sendResetPasswordVerificationEmail,
  sendNewPasswordEmail,
  sendChangeEmailVerificationEmail,
} = require('../emails/account');

const router = new express.Router();

router.post('/users', signupLimiter, async (req, res) => {
  let user = null;
  try {
    user = new User({
      ...req.body,
      status: userStatuses.PENDING,
      cart: [],
      tokens: [],
      isAdmin: undefined,
      createdAt: undefined,
    });
    await user.save();

    const verificationLink = await user.generateVerificationCode(
      verificationCodeTypes.ACCOUNT_ACTIVATION,
    );
    if (process.env.MODE !== envModes.TESTING) {
      await sendAccountVerificationEmail(user.email, user.username, verificationLink);
    }

    const token = await user.generateAuthToken();
    if (process.env.MODE === envModes.PRODUCTION) {
      res.cookie('token', token, { httpOnly: true, sameSite: 'None', secure: true });
    } else {
      res.cookie('token', token, { httpOnly: true });
    }
    res.status(201).send({ user });
  } catch (err) {
    if (user) {
      await User.findByIdAndDelete(user._id);
    }
    res.status(400).send(err);
  }
});

router.post('/users/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    const isCartDifferent = await updateUserCart(user, user.cart);

    const token = await user.generateAuthToken();
    if (process.env.MODE === envModes.PRODUCTION) {
      res.cookie('token', token, { httpOnly: true, sameSite: 'None', secure: true });
    } else {
      res.cookie('token', token, { httpOnly: true });
    }

    const fullUser = await getFullUser(user._id);
    res.send({ user: fullUser, isDifferent: isCartDifferent });
  } catch (err) {
    res.status(400).send(err);
  }
});

router.post('/users/logout', authPending, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(({ token }) => token !== req.token);
    await req.user.save();
    res.send();
  } catch (err) {
    res.status(500).send();
  }
});

router.post(
  '/users/send-account-verification-email',
  accountVerificationEmailLimiter,
  authPending,
  async (req, res) => {
    try {
      if (req.user.status === userStatuses.ACTIVE) {
        return res.status(400).send({
          message: 'Your account is already active',
        });
      }

      const verificationLink = await req.user.generateVerificationCode(
        verificationCodeTypes.ACCOUNT_ACTIVATION,
      );
      if (process.env.MODE !== envModes.TESTING) {
        await sendAccountVerificationEmail(req.user.email, req.user.username, verificationLink);
      }

      res.send();
    } catch (err) {
      res.status(500).send();
    }
  },
);

router.get('/users/:id/verify-account/:code', verificationLinkLimiter, async (req, res) => {
  try {
    const { isError, user, verificationCode } = await verificationCodeChecker(req.params.id, {
      code: req.params.code,
      type: verificationCodeTypes.ACCOUNT_ACTIVATION,
    });

    if (isError) {
      return res.status(400).send({
        message:
          'Verification link has been expired or you are not allowed to perform this action or your account already does not exist',
      });
    }

    user.status = userStatuses.ACTIVE;
    await user.save();
    await verificationCode.remove();

    res.redirect(process.env.FRONTEND_URL);
  } catch (err) {
    if (err.message) {
      return res.status(400).send(err);
    }
    res.status(500).send(err);
  }
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

router.post('/users/request-for-reset-password', resetPasswordRequestLimiter, async (req, res) => {
  try {
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send({ message: `We can't find any user with this email` });
    }

    const verificationLink = await user.generateVerificationCode(
      verificationCodeTypes.RESET_PASSWORD,
    );
    if (process.env.MODE !== envModes.TESTING) {
      await sendResetPasswordVerificationEmail(user.email, verificationLink);
    }

    res.send();
  } catch (err) {
    res.status(500).send();
  }
});

router.get('/users/:id/reset-password/:code', verificationLinkLimiter, async (req, res) => {
  try {
    const { isError, user, verificationCode } = await verificationCodeChecker(req.params.id, {
      code: req.params.code,
      type: verificationCodeTypes.RESET_PASSWORD,
    });

    if (isError) {
      return res.status(400).send({
        message:
          'Verification link has been expired or you are not allowed to perform this action or account does not exist',
      });
    }

    const newPassword = generatePassword.generate({
      length: 15,
      numbers: true,
    });
    user.password = newPassword;

    if (process.env.MODE !== envModes.TESTING) {
      await sendNewPasswordEmail(user.email, newPassword);
    }

    await user.save();
    await verificationCode.remove();

    res.send({ message: 'New password has been sent successfully. Go back to your inbox' });
  } catch (err) {
    if (err.message) {
      return res.status(400).send(err);
    }
    res.status(500).send(err);
  }
});

router.get('/users/me', authPending, async (req, res) => {
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
      return res.status(404).send({ message: 'User with given username does not exist' });
    }
    const publicProfile = user.getPublicProfile();
    res.send({ profile: publicProfile });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.patch('/users/me', authActive, async (req, res) => {
  try {
    let updates = Object.keys(req.body);
    const allowedUpdates = [
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
    if (updates.includes('password')) {
      updates = await req.user.checkCurrentCredentials(updates, req.body);
    }
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
      return res.status(400).send({ message: `You can't change these data` });
    }
    updates.forEach((update) => {
      // eslint-disable-next-line security/detect-object-injection
      req.user[update] = req.body[update];
    });
    await updateUserCart(req.user, req.user.cart);
    const user = await getFullUser(req.user._id);
    res.send({ user });
  } catch (err) {
    if (err.message) {
      return res.status(400).send(err);
    }
    res.status(500).send(err);
  }
});

router.patch('/users/me/email', changeEmailLimiter, authActive, async (req, res) => {
  try {
    await req.user.checkCurrentCredentials(['email'], req.body);
    const userWithGivenEmail = await User.findOne({ email: req.body.email });
    if (userWithGivenEmail) {
      return res.status(409).send({ message: 'Given email is already taken' });
    }
    const verificationLink = await req.user.generateVerificationCode(
      verificationCodeTypes.CHANGE_EMAIL,
      req.body.email,
    );
    if (process.env.MODE !== envModes.TESTING) {
      await sendChangeEmailVerificationEmail(req.body.email, verificationLink);
    }
    res.send();
  } catch (err) {
    if (err.message) {
      return res.status(400).send(err);
    }
    res.status(500).send(err);
  }
});

router.get('/users/:id/change-email/:code', verificationLinkLimiter, async (req, res) => {
  try {
    const { isError, user, verificationCode } = await verificationCodeChecker(req.params.id, {
      code: req.params.code,
      type: verificationCodeTypes.CHANGE_EMAIL,
    });

    if (isError) {
      return res.status(400).send({
        message:
          'Verification link has been expired or you are not allowed to perform this action or account does not exist',
      });
    }

    user.email = verificationCode.newEmail;
    await user.save();
    await verificationCode.remove();

    res.redirect(process.env.FRONTEND_URL);
  } catch (err) {
    if (err.message) {
      return res.status(400).send(err);
    }
    res.status(500).send(err);
  }
});

router.patch('/users/add-admin', authActive, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).send({ message: 'You are not allowed to do that' });
    }
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send({ message: 'User with given email does not exist' });
    }
    if (req.body.email === req.user.email) {
      return res.status(400).send({ message: 'You are already an admin' });
    }
    if (user.status === userStatuses.PENDING) {
      return res.status(400).send({ message: 'This user has not activated the account yet' });
    }
    if (user.isAdmin) {
      return res.status(400).send({ message: 'This user is already an admin' });
    }
    user.isAdmin = true;
    await user.save();
    res.send();
  } catch (err) {
    res.status(400).send(err);
  }
});

router.patch('/users/remove-admin', authActive, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).send({ message: 'You are not allowed to do that' });
    }
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send({ message: 'User with given email does not exist' });
    }
    if (!user.isAdmin) {
      return res
        .status(400)
        .send({ message: 'This user is not an admin so the action is not needed' });
    }
    user.isAdmin = undefined;
    await user.save();
    res.send();
  } catch (err) {
    res.status(400).send(err);
  }
});

router.delete('/users/me', authPending, async (req, res) => {
  try {
    await req.user.checkCurrentPassword(req.body);
    await req.user.remove();
    res.send();
  } catch (err) {
    if (err.message) {
      return res.status(400).send(err);
    }
    res.status(500).send(err);
  }
});

router.get('/cart', authActive, async (req, res) => {
  try {
    const isCartDifferent = await updateUserCart(req.user, req.user.cart);
    const user = await getFullUser(req.user._id);
    res.send({ cart: user.cart, isDifferent: isCartDifferent });
  } catch (err) {
    res.status(500).send(err);
  }
});

const addToCartSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required().label('Quantity'),
  product: Joi.objectId().required().label('Product'),
})
  .required()
  .label('New item');

router.patch('/cart/add', authActive, async (req, res) => {
  try {
    const { error } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

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

router.patch('/cart/:itemId/update', authActive, async (req, res) => {
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

router.patch('/cart/:itemId/remove', authActive, async (req, res) => {
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

router.patch('/cart/clear', authActive, async (req, res) => {
  try {
    req.user.cart = [];
    await req.user.save();
    res.send();
  } catch (err) {
    res.status(500).send(err);
  }
});

const trasactionSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required().label('Quantity'),
  product: Joi.objectId().required().label('Product'),
})
  .optional()
  .label('Item');

router.patch('/transaction', authActive, async (req, res) => {
  try {
    const { error } = trasactionSchema.validate(req.body.singleItem);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

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
