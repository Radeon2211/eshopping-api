const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/productModel');
const Order = require('../src/models/orderModel');
const User = require('../src/models/userModel');
const {
  userOne,
  userTwo,
  userThree,
  productOne,
  productTwo,
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
} = require('../src/shared/constants');
const {
  createSortObject,
  getCorrectProduct,
  getCorrectOrders,
  getFullUser,
  updateUserCart,
  verifyItemsToTransaction,
  verifyItemsToBuy,
  splitOrderProducts,
} = require('../src/shared/utility');

beforeEach(setupDatabase);

// * CONSTANTS * //

// * SELLER_USERNAME_POPULATE
test('Should get product with seller username', async () => {
  const product = await Product.findById(productOne._id).populate(SELLER_USERNAME_POPULATE).lean();
  expect(product).toMatchObject({
    ...productOne,
    seller: {
      username: userOne.username,
    },
  });
});

// * BUYER_USERNAME_POPULATE
test('Should get order with buyer username', async () => {
  await new Order(orderOne).save();

  const order = await Order.findById(orderOne._id).populate(BUYER_USERNAME_POPULATE).lean();
  expect(order).toMatchObject({
    ...orderOne,
    buyer: {
      username: userOne.username,
    },
  });
});

// * ORDER_SELLER_POPULATE
test('Should get order with seller username, email and phone', async () => {
  await new Order(orderOne).save();

  const order = await Order.findById(orderOne._id).populate(ORDER_SELLER_POPULATE).lean();
  expect(order).toMatchObject({
    ...orderOne,
    seller: {
      username: userTwo.username,
      email: userTwo.email,
      phone: userTwo.phone,
    },
  });
});

// * CART_POPULATE
test('Should get user with poulated cart and seller username of each product', async () => {
  const { cart } = await User.findById(userOne._id).populate(CART_POPULATE).lean();

  expect(cart).toHaveLength(2);

  expect(cart[0].quantity).toEqual(2);
  expect(cart[0].product).toMatchObject({
    ...productTwo,
    seller: {
      username: userTwo.username,
    },
  });

  expect(cart[1].quantity).toEqual(48);
  expect(cart[1].product).toMatchObject({
    ...productFour,
    seller: {
      username: userThree.username,
    },
  });
});

// * MyError
test('Should get object with message after throwing error with MyError', async () => {
  const errorMessage = 'test error';
  try {
    throw new MyError(errorMessage);
  } catch (err) {
    expect(err).toEqual({
      message: errorMessage,
    });
  }
});

// * UTILITY * //

// * createSortObject()
test('Should create sort object with createdAt descending when no sort options are set', async () => {
  const req = {
    query: {},
  };
  const sort = createSortObject(req);
  expect(sort).toEqual({
    createdAt: -1,
  });
});

test('Should create sort object with price descending', async () => {
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

test('Should create sort object with name ascending', async () => {
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

// * getCorrectProduct()
test('Should get product with boolean photo - false without seller username', async () => {
  const product = await Product.findById(productOne._id).lean();
  const correctProduct = getCorrectProduct(product);

  expect(correctProduct.photo).toEqual(false);
  expect(correctProduct.seller).toEqual(product.seller);
});

test('Should get product with boolean photo - true with seller username when second argument is true', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(200);

  const product = await Product.findById(productOne._id).populate(SELLER_USERNAME_POPULATE).lean();
  const correctProduct = getCorrectProduct(product, true);

  expect(correctProduct.photo).toEqual(true);
  expect(correctProduct.seller).toEqual({
    username: userOne.username,
  });
});

// * getCorrectOrders()
test('Should get orders with boolean photo products', async () => {
  await new Order(orderOne).save();

  const orders = await Order.find().lean();
  expect(orders).toHaveLength(1);

  const correctOrders = getCorrectOrders(orders);

  expect(correctOrders).toHaveLength(1);
  expect(correctOrders[0].products).toMatchObject([
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

// * getFullUser()
test('Should get user without password and tokens but with populated cart with boolean product photo', async () => {
  const user = await getFullUser(userOne._id);

  expect(user.password).not.toBeDefined();
  expect(user.tokens).not.toBeDefined();

  expect(user.cart).toHaveLength(2);

  expect(user.cart[0].quantity).toEqual(2);
  expect(user.cart[0].product).toMatchObject({
    ...productTwo,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  });

  expect(user.cart[1].quantity).toEqual(48);
  expect(user.cart[1].product).toMatchObject({
    ...productFour,
    photo: false,
    seller: {
      username: userThree.username,
    },
  });
});

// * updateUserCart()
test('Should return isDifferent false if products from cart did not change before', async () => {
  const user = await User.findById(userOne._id);
  const isDifferent = await updateUserCart(user, user.cart);
  expect(isDifferent).toEqual(false);
});

test('Should update cart and return isDifferent true if first product from cart changed quantity and it is lower than quantity in cart', async () => {
  await request(app)
    .patch(`/products/${productTwo._id}/seller`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send({
      quantity: 1,
    });

  const user = await User.findById(userOne._id);
  const isDifferent = await updateUserCart(user, user.cart);

  const { cart } = await getFullUser(userOne._id);

  expect(isDifferent).toEqual(true);

  expect(cart).toHaveLength(2);

  expect(cart[0].quantity).toEqual(1);
  expect(cart[0].product).toMatchObject({
    ...productTwo,
    quantity: 1,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  });

  expect(cart[1].quantity).toEqual(48);
  expect(cart[1].product).toMatchObject({
    ...productFour,
    photo: false,
    seller: {
      username: userThree.username,
    },
  });
});

// * verifyItemsToTransaction()
test('Should verify items to transaction (and update none) and get isDifferent false', async () => {
  const user = await User.findById(userOne._id);

  const { transaction, isDifferent } = await verifyItemsToTransaction(user.cart, true, user);

  expect(transaction).toHaveLength(2);

  expect(transaction[0]).toEqual({
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 2,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  });

  expect(transaction[1]).toEqual({
    _id: productFour._id,
    name: productFour.name,
    price: productFour.price,
    quantity: 48,
    photo: false,
    seller: {
      username: userThree.username,
    },
  });

  expect(isDifferent).toEqual(false);
});

test('Should verify items to transaction (and update first item) and get isDifferent true', async () => {
  await request(app)
    .patch(`/products/${productTwo._id}/seller`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send({
      quantity: 1,
    });

  const user = await User.findById(userOne._id);

  const { transaction, isDifferent } = await verifyItemsToTransaction(user.cart, true, user);

  expect(transaction).toHaveLength(2);

  expect(transaction[0]).toEqual({
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  });

  expect(transaction[1]).toEqual({
    _id: productFour._id,
    name: productFour.name,
    price: productFour.price,
    quantity: 48,
    photo: false,
    seller: {
      username: userThree.username,
    },
  });

  expect(isDifferent).toEqual(true);
});

// * verifyItemsToBuy()
test('Should get correct orderProducts and isDifferent false and isBuyingOwnProducts false', async () => {
  const item = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  };

  const { transaction, orderProducts, isDifferent, isBuyingOwnProducts } = await verifyItemsToBuy(
    [item],
    userOne._id,
  );

  expect(transaction).toHaveLength(1);
  expect(transaction[0]).toEqual(item);
  expect(orderProducts).toHaveLength(1);

  expect(orderProducts[0]).toEqual({
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: productTwo.photo,
    seller: productTwo.seller,
  });

  expect(isDifferent).toEqual(false);
  expect(isBuyingOwnProducts).toEqual(false);
});

test('Should get transaction with updated item and isDifferent true if given quantity is too high', async () => {
  const item = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 10,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  };

  const { transaction, isDifferent } = await verifyItemsToBuy([item], userOne._id);

  expect(transaction).toHaveLength(1);
  expect(transaction[0]).toEqual({
    ...item,
    quantity: 3,
  });
  expect(isDifferent).toEqual(true);
});

test('Should get transaction with updated item and isDifferent true if quantity changed before', async () => {
  await request(app)
    .patch(`/products/${productTwo._id}/seller`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send({
      quantity: 1,
    });

  const item = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 3,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  };

  const { transaction, isDifferent } = await verifyItemsToBuy([item], userOne._id);

  expect(transaction).toHaveLength(1);
  expect(transaction[0]).toEqual({
    ...item,
    quantity: 1,
  });
  expect(isDifferent).toEqual(true);
});

test('Should get empty transaction and isDifferent true', async () => {
  await request(app)
    .delete(`/products/${productTwo._id}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`]);

  const item = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  };

  const { transaction, isDifferent } = await verifyItemsToBuy([item], userOne._id);

  expect(transaction).toHaveLength(0);
  expect(isDifferent).toEqual(true);
});

test('Should get empty transaction and isDifferent true', async () => {
  await request(app)
    .delete(`/products/${productTwo._id}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`]);

  const item = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  };

  const { transaction, isDifferent } = await verifyItemsToBuy([item], userOne._id);
  expect(transaction).toHaveLength(0);
  expect(isDifferent).toEqual(true);
});

test('Should get isBuyingOwnProducts true if product seller is the same as buyer', async () => {
  const item = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: false,
    seller: {
      username: userTwo.username,
    },
  };

  const { isBuyingOwnProducts } = await verifyItemsToBuy([item], userTwo._id);

  expect(isBuyingOwnProducts).toEqual(true);
});

// * splitOrderProduct()
test('Should verify items to buy and get empty transaction and isDifferent true', async () => {
  const item1 = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: productTwo.photo,
    seller: userTwo._id,
  };

  const item2 = {
    _id: productFour._id,
    name: productFour.name,
    price: productFour.price,
    quantity: 1,
    photo: productFour.photo,
    seller: userThree._id,
  };

  const splittedProducts = await splitOrderProducts([item1, item2]);

  expect(splittedProducts).toHaveLength(2);

  expect(splittedProducts[0]).toEqual({
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
  });

  expect(splittedProducts[1]).toEqual({
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
  });
});
