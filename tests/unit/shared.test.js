const request = require('supertest');
const mongoose = require('mongoose');
const mockedEnv = require('mocked-env');
const validateUUID = require('uuid-validate');
const app = require('../../src/app');
const Product = require('../../src/models/productModel');
const Order = require('../../src/models/orderModel');
const User = require('../../src/models/userModel');
const VerificationCode = require('../../src/models/verificationCodeModel');
const {
  userOne,
  userTwo,
  userThree,
  productOne,
  productTwo,
  productThree,
  productFour,
  orderOne,
  setupDatabase,
} = require('./fixtures/db');
const {
  SELLER_USERNAME_POPULATE,
  BUYER_USERNAME_POPULATE,
  ORDER_SELLER_POPULATE,
  CART_POPULATE,
  MyError,
  verificationCodeTypes,
  envModes,
} = require('../../src/shared/constants');
const {
  createSortObject,
  getCorrectProduct,
  getCorrectOrders,
  getFullUser,
  checkCartDifference,
  verifyCart,
  updateUserCart,
  getTransactionProduct,
  verifyItemsToTransaction,
  getOrderProduct,
  verifyItemsToBuy,
  splitOrderProducts,
  verificationCodeChecker,
  isTestingMode,
  isDevOrE2EMode,
} = require('../../src/shared/utility');

beforeEach(setupDatabase);

describe('Constants', () => {
  describe('SELLER_USERNAME_POPULATE', () => {
    test(`should get product with seller username if seller's account exists`, async () => {
      const product = await Product.findById(productOne._id)
        .populate(SELLER_USERNAME_POPULATE)
        .lean();
      expect(product.seller).toEqual({
        username: userOne.username,
      });
    });

    test(`should get order with seller null if seller's account does not exist`, async () => {
      await new Order(orderOne).save();

      await request(app)
        .delete('/users/me')
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .send({ currentPassword: userTwo.password })
        .expect(200);

      const order = await Order.findById(orderOne._id).populate(SELLER_USERNAME_POPULATE).lean();
      expect(order.seller).toBeNull();
    });
  });

  describe('BUYER_USERNAME_POPULATE', () => {
    test(`should get order with buyer username if buyer's account exists`, async () => {
      await new Order(orderOne).save();

      const order = await Order.findById(orderOne._id).populate(BUYER_USERNAME_POPULATE).lean();
      expect(order.buyer).toEqual({
        username: userOne.username,
      });
    });

    test(`should get order with buyer null if buyer's account does not exist`, async () => {
      await new Order(orderOne).save();

      await request(app)
        .delete('/users/me')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ currentPassword: userOne.password })
        .expect(200);

      const order = await Order.findById(orderOne._id).populate(BUYER_USERNAME_POPULATE).lean();
      expect(order.buyer).toBeNull();
    });
  });

  describe('ORDER_SELLER_POPULATE', () => {
    test(`should get order with seller username, email and phone if seller's account exists`, async () => {
      await new Order(orderOne).save();

      const order = await Order.findById(orderOne._id).populate(ORDER_SELLER_POPULATE).lean();
      expect(order.seller).toEqual({
        username: userTwo.username,
        email: userTwo.email,
        phone: userTwo.phone,
      });
    });

    test(`should get order with seller null if seller's account does not exist`, async () => {
      await new Order(orderOne).save();

      await request(app)
        .delete('/users/me')
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .send({ currentPassword: userTwo.password })
        .expect(200);

      const order = await Order.findById(orderOne._id).populate(ORDER_SELLER_POPULATE).lean();
      expect(order.seller).toBeNull();
    });
  });

  describe('CART_POPULATE', () => {
    test('should get user with poulated cart and seller username of each product', async () => {
      const { cart } = await User.findById(userOne._id).populate(CART_POPULATE).lean();

      expect(cart).toHaveLength(2);

      expect(cart[0]).toEqual({
        _id: userOne.cart[0]._id,
        quantity: 2,
        product: {
          ...productTwo,
          seller: {
            username: userTwo.username,
          },
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      });
      expect(cart[0].product.createdAt).toBeDefined();
      expect(cart[0].product.updatedAt).toBeDefined();

      expect(cart[1]).toEqual({
        _id: userOne.cart[1]._id,
        quantity: 48,
        product: {
          ...productFour,
          seller: {
            username: userThree.username,
          },
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          createdAt: cart[1].product.createdAt,
          updatedAt: cart[1].product.updatedAt,
        },
      });
      expect(cart[1].product.createdAt).toBeDefined();
      expect(cart[1].product.updatedAt).toBeDefined();
    });
  });

  describe('MyError', () => {
    test('should get object with message after throwing error with MyError', async () => {
      const errorMessage = 'test error';
      try {
        throw new MyError(errorMessage);
      } catch (err) {
        expect(err).toEqual({
          message: errorMessage,
        });
      }
    });
  });
});

describe('Utility', () => {
  describe('createSortObject()', () => {
    test('should create sort object with createdAt descending if sort options are not set', async () => {
      const req = {
        query: {},
      };
      const sort = createSortObject(req);
      expect(sort).toEqual({
        createdAt: -1,
      });
    });

    test('should create sort object with price descending', async () => {
      const req = {
        query: {
          sortBy: 'price:desc',
        },
      };
      const sort = createSortObject(req);
      expect(sort).toEqual({
        price: -1,
      });
    });

    test('should create sort object with name ascending', async () => {
      const req = {
        query: {
          sortBy: 'name:asc',
        },
      };
      const sort = createSortObject(req);
      expect(sort).toEqual({
        name: 1,
      });
    });
  });

  describe('getCorrectProduct', () => {
    test('should get product with boolean photo false without seller username', async () => {
      const product = await Product.findById(productOne._id).lean();
      const correctProduct = getCorrectProduct(product);

      expect(correctProduct).toEqual({
        ...product,
        photo: false,
      });
    });

    test('should get product with boolean photo true and seller username when second argument is true', async () => {
      await request(app)
        .post(`/products/${productOne._id}/photo`)
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .attach('photo', 'tests/unit/fixtures/mushrooms.jpg')
        .expect(200);

      const product = await Product.findById(productOne._id)
        .populate(SELLER_USERNAME_POPULATE)
        .lean();
      const correctProduct = getCorrectProduct(product, true);

      expect(correctProduct).toEqual({
        ...product,
        photo: true,
        seller: {
          username: userOne.username,
        },
      });
    });

    test('should get product with boolean photo true and seller null when second argument is true and an owner does not exist', async () => {
      await request(app)
        .post(`/products/${productOne._id}/photo`)
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .attach('photo', 'tests/unit/fixtures/mushrooms.jpg')
        .expect(200);

      await Product.updateOne({ _id: productOne._id }, { seller: new mongoose.Types.ObjectId() });

      const product = await Product.findById(productOne._id)
        .populate(SELLER_USERNAME_POPULATE)
        .lean();
      const correctProduct = getCorrectProduct(product, true);

      expect(correctProduct).toEqual({
        ...product,
        photo: true,
        seller: null,
      });
    });
  });

  describe('getCorrectOrders()', () => {
    test('should get orders with boolean photo products', async () => {
      await new Order(orderOne).save();

      const orders = await Order.find().lean();
      expect(orders).toHaveLength(1);

      const correctOrders = getCorrectOrders(orders);

      expect(correctOrders).toHaveLength(1);
      expect(correctOrders[0].products).toEqual([
        {
          ...orderOne.products[0],
          photo: false,
        },
        {
          ...orderOne.products[1],
          photo: false,
        },
      ]);
    });
  });

  describe('getFullUser()', () => {
    test('should get user without password and tokens but with populated cart with boolean product photo', async () => {
      const user = await getFullUser(userOne._id);

      expect(user).toEqual({
        _id: userOne._id,
        contacts: userOne.contacts,
        firstName: userOne.firstName,
        lastName: userOne.lastName,
        username: userOne.username,
        email: userOne.email,
        street: userOne.street,
        zipCode: userOne.zipCode,
        city: userOne.city,
        country: userOne.country,
        phone: userOne.phone,
        status: userOne.status,
        createdAt: user.createdAt,
        cart: [
          {
            _id: userOne.cart[0]._id,
            quantity: 2,
            product: {
              ...productTwo,
              photo: false,
              seller: {
                username: userTwo.username,
              },
              __v: 0,
              quantitySold: 0,
              buyerQuantity: 0,
              createdAt: user.cart[0].product.createdAt,
              updatedAt: user.cart[0].product.updatedAt,
            },
          },
          {
            _id: userOne.cart[1]._id,
            quantity: 48,
            product: {
              ...productFour,
              photo: false,
              seller: {
                username: userThree.username,
              },
              __v: 0,
              quantitySold: 0,
              buyerQuantity: 0,
              createdAt: user.cart[1].product.createdAt,
              updatedAt: user.cart[1].product.updatedAt,
            },
          },
        ],
      });
      expect(user.createdAt).toBeDefined();
    });
  });

  describe('checkCartDifference()', () => {
    test('should return true if carts are different (product of first item is deleted before)', async () => {
      const userOneCart = userOne.cart;

      await request(app)
        .delete(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .expect(200);

      const verifiedUserOneCart = await verifyCart(userOneCart);

      const isDifferent = await checkCartDifference(userOneCart, verifiedUserOneCart);
      expect(isDifferent).toEqual(true);
    });

    test('should return true if carts are different (product of first item changed quantity to 1 before - to lower than it is in cart)', async () => {
      const userOneCart = userOne.cart;

      await request(app)
        .patch(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .send({
          quantity: 1,
        })
        .expect(200);

      const verifiedUserOneCart = await verifyCart(userOneCart);

      const isDifferent = await checkCartDifference(userOneCart, verifiedUserOneCart);
      expect(isDifferent).toEqual(true);
    });

    test('should return false if carts are the same', async () => {
      const userOneCart = userOne.cart;
      const verifiedUserOneCart = await verifyCart(userOneCart);

      const isDifferent = await checkCartDifference(userOneCart, verifiedUserOneCart);
      expect(isDifferent).toEqual(false);
    });
  });

  describe('verifyCart()', () => {
    test('should return the same cart if nothing changed', async () => {
      const verifiedUserOneCart = await verifyCart(userOne.cart);

      expect(verifiedUserOneCart).toEqual([
        {
          _id: userOne.cart[0]._id.toJSON(),
          quantity: 2,
          product: userOne.cart[0].product.toJSON(),
        },
        {
          _id: userOne.cart[1]._id.toJSON(),
          quantity: 48,
          product: userOne.cart[1].product.toJSON(),
        },
      ]);
    });

    test('should return only second item from cart if product of first item is deleted before', async () => {
      await request(app)
        .delete(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .expect(200);

      const verifiedUserOneCart = await verifyCart(userOne.cart);

      expect(verifiedUserOneCart).toEqual([
        {
          _id: userOne.cart[1]._id.toJSON(),
          quantity: 48,
          product: userOne.cart[1].product.toJSON(),
        },
      ]);
    });

    test('should return cart with edited first item if product of first item changed quantity to 1 before - to lower than it is in cart', async () => {
      await request(app)
        .patch(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .send({
          quantity: 1,
        })
        .expect(200);

      const verifiedUserOneCart = await verifyCart(userOne.cart);

      expect(verifiedUserOneCart).toEqual([
        {
          _id: userOne.cart[0]._id.toJSON(),
          quantity: 1,
          product: userOne.cart[0].product.toJSON(),
        },
        {
          _id: userOne.cart[1]._id.toJSON(),
          quantity: 48,
          product: userOne.cart[1].product.toJSON(),
        },
      ]);
    });
  });

  describe('updateUserCart()', () => {
    test('should return isDifferent false if products from cart did not change before', async () => {
      const user = await User.findById(userOne._id);
      const isDifferent = await updateUserCart(user, user.cart);

      const userAfterUpdate = await User.findById(userOne._id).lean();

      expect(isDifferent).toEqual(false);
      expect(userAfterUpdate.cart).toEqual(userOne.cart);
    });

    test('should update cart and return isDifferent true if first product from cart changed quantity and it is lower than quantity in cart', async () => {
      await request(app)
        .patch(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .send({
          quantity: 1,
        })
        .expect(200);

      const user = await User.findById(userOne._id);
      const isDifferent = await updateUserCart(user, user.cart);
      const userAfterUpdate = await User.findById(userOne._id).lean();

      expect(isDifferent).toEqual(true);
      expect(userAfterUpdate.cart).toEqual([
        {
          ...userOne.cart[0],
          quantity: 1,
        },
        userOne.cart[1],
      ]);
    });

    test('should update cart and return isDifferent true if first product from cart is deleted before', async () => {
      await request(app)
        .delete(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .expect(200);

      const user = await User.findById(userOne._id);
      const isDifferent = await updateUserCart(user, user.cart);
      const userAfterUpdate = await User.findById(userOne._id).lean();

      expect(isDifferent).toEqual(true);
      expect(userAfterUpdate.cart).toEqual([userOne.cart[1]]);
    });
  });

  describe('getTransactionProduct()', () => {
    test('should get correct transaction product which has populated seller username', async () => {
      const product = await Product.findById(productOne._id)
        .populate(SELLER_USERNAME_POPULATE)
        .lean();
      const transactionProduct = getTransactionProduct(product);
      expect(transactionProduct).toEqual({
        _id: productOne._id,
        name: productOne.name,
        price: productOne.price,
        quantity: productOne.quantity,
        photo: false,
        seller: {
          username: userOne.username,
        },
      });
    });

    test('should get correct transaction product which has populated full seller', async () => {
      const product = await Product.findById(productOne._id).populate('seller').lean();
      const transactionProduct = getTransactionProduct(product);
      expect(transactionProduct).toEqual({
        _id: productOne._id,
        name: productOne.name,
        price: productOne.price,
        quantity: productOne.quantity,
        photo: false,
        seller: {
          username: userOne.username,
        },
      });
    });
  });

  describe('verifyItemsToTransaction()', () => {
    test('should verify items to transaction and get isDifferent false and update cart but cart should not change', async () => {
      const user = await User.findById(userOne._id);

      const { transaction, isDifferent } = await verifyItemsToTransaction(user.cart, true, user);

      const userAfterVerify = await User.findById(userOne._id).lean();
      expect(userAfterVerify.cart).toEqual(userOne.cart);

      expect(isDifferent).toEqual(false);
      expect(transaction).toEqual([
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 2,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 48,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ]);
    });

    test('should verify items to transaction and get isDifferent true if product of first item changed quantity to lower than it is in cart and update cart and cart should change', async () => {
      const user = await User.findById(userOne._id);

      await request(app)
        .patch(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .send({
          quantity: 1,
        })
        .expect(200);

      const singleItem = false;
      const { transaction, isDifferent } = await verifyItemsToTransaction(
        user.cart,
        !singleItem,
        user,
      );

      const userAfterVerify = await User.findById(userOne._id).lean();
      expect(userAfterVerify.cart).toEqual([
        {
          ...userOne.cart[0],
          quantity: 1,
        },
        userOne.cart[1],
      ]);

      expect(isDifferent).toEqual(true);
      expect(transaction).toEqual([
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 48,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ]);
    });

    test('should verify items to transaction and get isDifferent true and update cart and cart should change if product of first item is deleted', async () => {
      const user = await User.findById(userOne._id);

      await request(app)
        .delete(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .expect(200);

      const singleItem = false;
      const { transaction, isDifferent } = await verifyItemsToTransaction(
        user.cart,
        !singleItem,
        user,
      );

      const userAfterVerify = await User.findById(userOne._id).lean();
      expect(userAfterVerify.cart).toEqual([userOne.cart[1]]);

      expect(isDifferent).toEqual(true);
      expect(transaction).toEqual([
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 48,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ]);
    });
  });

  describe('getOrderProduct()', () => {
    test('should get correct order product which has populated full seller', async () => {
      const product = await Product.findById(productOne._id).populate('seller').lean();
      const orderProduct = getOrderProduct(product);
      expect(orderProduct).toEqual({
        _id: productOne._id,
        name: productOne.name,
        price: productOne.price,
        quantity: productOne.quantity,
        photo: undefined,
        seller: productOne.seller,
      });
    });
  });

  describe('verifyItemsToBuy()', () => {
    test('should get correct orderProducts, transaction, isDifferent false, isBuyingOwnProducts false if items are correct', async () => {
      const transactionToVerify = [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ];

      const {
        transaction,
        orderProducts,
        isDifferent,
        isBuyingOwnProducts,
      } = await verifyItemsToBuy(transactionToVerify, userOne._id);

      expect(isDifferent).toEqual(false);
      expect(isBuyingOwnProducts).toEqual(false);

      expect(transaction).toEqual(transactionToVerify);

      expect(orderProducts).toEqual([
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: productTwo.photo,
          seller: productTwo.seller,
        },
      ]);
    });

    test('should get orderProducts and transaction with updated item, isDifferent true, isBuyingOwnProducts false if given quantity is too high', async () => {
      const transactionToVerify = [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 10,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ];

      const {
        orderProducts,
        transaction,
        isDifferent,
        isBuyingOwnProducts,
      } = await verifyItemsToBuy(transactionToVerify, userOne._id);

      expect(isDifferent).toEqual(true);
      expect(isBuyingOwnProducts).toEqual(false);

      expect(transaction).toEqual([
        {
          ...transactionToVerify[0],
          quantity: 3,
        },
      ]);

      expect(orderProducts).toEqual([
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 3,
          photo: productTwo.photo,
          seller: productTwo.seller,
        },
      ]);
    });

    test('should get orderProducts and transaction with updated item, isDifferent true, isBuyingOwnProducts false if quantity changed before', async () => {
      await request(app)
        .patch(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .send({
          quantity: 1,
        })
        .expect(200);

      const transactionToVerify = [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 3,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ];

      const {
        orderProducts,
        transaction,
        isDifferent,
        isBuyingOwnProducts,
      } = await verifyItemsToBuy(transactionToVerify, userOne._id);

      expect(isDifferent).toEqual(true);
      expect(isBuyingOwnProducts).toEqual(false);

      expect(transaction).toEqual([
        {
          ...transactionToVerify[0],
          quantity: 1,
        },
      ]);

      expect(orderProducts).toEqual([
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: productTwo.photo,
          seller: productTwo.seller,
        },
      ]);
    });

    test('should get empty orderProducts and transaction, isDifferent true, isBuyingOwnProducts false', async () => {
      await request(app)
        .delete(`/products/${productTwo._id}`)
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .expect(200);

      const transactionToVerify = [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 3,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ];

      const {
        orderProducts,
        transaction,
        isDifferent,
        isBuyingOwnProducts,
      } = await verifyItemsToBuy(transactionToVerify, userOne._id);

      expect(isDifferent).toEqual(true);
      expect(isBuyingOwnProducts).toEqual(false);

      expect(orderProducts).toEqual([]);
      expect(transaction).toEqual([]);
    });

    test('should get isBuyingOwnProducts true if product seller is the same as buyer', async () => {
      const transactionToVerify = [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ];

      const { isBuyingOwnProducts } = await verifyItemsToBuy(transactionToVerify, userTwo._id);
      expect(isBuyingOwnProducts).toEqual(true);
    });
  });

  describe('splitOrderProduct()', () => {
    test('should split two orderProducts to two orders if they are from different sellers', async () => {
      const orderProducts = [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: productTwo.photo,
          seller: userTwo._id,
        },
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 1,
          photo: productFour.photo,
          seller: userThree._id,
        },
      ];

      const splittedOrderProducts = await splitOrderProducts(orderProducts);

      expect(splittedOrderProducts).toEqual([
        {
          seller: userTwo._id,
          products: [
            {
              _id: productTwo._id,
              name: productTwo.name,
              price: productTwo.price,
              quantity: 1,
              photo: productTwo.photo,
            },
          ],
        },
        {
          seller: userThree._id,
          products: [
            {
              _id: productFour._id,
              name: productFour.name,
              price: productFour.price,
              quantity: 1,
              photo: productFour.photo,
            },
          ],
        },
      ]);
    });

    test('should split three orderProducts to two orders if two of them are from the same seller', async () => {
      const orderProducts = [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: productTwo.photo,
          seller: userTwo._id,
        },
        {
          _id: productThree._id,
          name: productThree.name,
          price: productThree.price,
          quantity: 1,
          photo: productThree.photo,
          seller: userThree._id,
        },
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 1,
          photo: productFour.photo,
          seller: userThree._id,
        },
      ];

      const splittedOrderProducts = await splitOrderProducts(orderProducts);

      expect(splittedOrderProducts).toEqual([
        {
          seller: userTwo._id,
          products: [
            {
              _id: productTwo._id,
              name: productTwo.name,
              price: productTwo.price,
              quantity: 1,
              photo: productTwo.photo,
            },
          ],
        },
        {
          seller: userThree._id,
          products: [
            {
              _id: productThree._id,
              name: productThree.name,
              price: productThree.price,
              quantity: 1,
              photo: productThree.photo,
            },
            {
              _id: productFour._id,
              name: productFour.name,
              price: productFour.price,
              quantity: 1,
              photo: productFour.photo,
            },
          ],
        },
      ]);
    });
  });

  describe('verificationCodeChecker()', () => {
    test('should return isError false, correct user and verification code', async () => {
      await request(app)
        .post('/users/request-for-reset-password')
        .set('X-Forwarded-For', '192.168.3.1')
        .send({ email: userOne.email })
        .expect(200);

      const { _id: codeId, code } = await VerificationCode.findOne({ email: userOne.email }).lean();

      const { isError, user, verificationCode } = await verificationCodeChecker(
        userOne._id.toString(),
        {
          code,
          type: verificationCodeTypes.RESET_PASSWORD,
        },
      );

      expect(isError).toEqual(false);
      expect(user._id).toEqual(userOne._id);
      expect(verificationCode._id).toEqual(codeId);
      expect(validateUUID(verificationCode.code, 4)).toEqual(true);
    });

    test('should return isError true, user null and verification code null if any code does not exist', async () => {
      const { isError, user, verificationCode } = await verificationCodeChecker(
        userOne._id.toString(),
        {
          code: 'code',
          type: verificationCodeTypes.RESET_PASSWORD,
        },
      );

      expect(isError).toEqual(true);
      expect(user).toEqual(null);
      expect(verificationCode).toEqual(null);
    });
  });

  describe('isTestingMode()', () => {
    let restoreEnv;

    const testFunction = (mode, expectedResult) => {
      restoreEnv = mockedEnv({
        MODE: mode,
      });
      const result = isTestingMode();
      expect(result).toEqual(expectedResult);
    };

    afterEach(() => {
      restoreEnv();
    });

    test('should return true if environment mode is UNIT_TESTING', async () => {
      testFunction(envModes.UNIT_TESTING, true);
    });

    test('should return true if environment mode is E2E_TESTING', async () => {
      testFunction(envModes.E2E_TESTING, true);
    });

    test('should return false if environment mode is DEVELOPMENT', async () => {
      testFunction(envModes.DEVELOPMENT, false);
    });

    test('should return false if environment mode is PRODUCTION', async () => {
      testFunction(envModes.PRODUCTION, false);
    });
  });

  describe('isDevOrE2EMode()', () => {
    let restoreEnv;

    const testFunction = (mode, expectedResult) => {
      restoreEnv = mockedEnv({
        MODE: mode,
      });
      const result = isDevOrE2EMode();
      expect(result).toEqual(expectedResult);
    };

    afterEach(() => {
      restoreEnv();
    });

    test('should return false if environment mode is UNIT_TESTING', async () => {
      testFunction(envModes.UNIT_TESTING, false);
    });

    test('should return true if environment mode is E2E_TESTING', async () => {
      testFunction(envModes.E2E_TESTING, true);
    });

    test('should return true if environment mode is DEVELOPMENT', async () => {
      testFunction(envModes.DEVELOPMENT, true);
    });

    test('should return false if environment mode is PRODUCTION', async () => {
      testFunction(envModes.PRODUCTION, false);
    });
  });
});
