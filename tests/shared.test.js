const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/productModel');
const User = require('../src/models/userModel');
const {
  userOne,
  userTwo,
  productTwo,
  productFour,
  userThree,
  setupDatabase,
  productOne,
} = require('./fixtures/db');
const { CART_POPULATE, PRODUCT_SELLER_POPULATE, MyError } = require('../src/shared/constants');
const {
  createSortObject,
  getCorrectProduct,
  getFullUser,
  updateUserCart,
  verifyItemsToTransaction,
  verifyItemsToBuy,
  splitOrderProducts,
} = require('../src/shared/utility');

beforeEach(setupDatabase);

// * CONSTANTS
test('Should get product with seller username', async () => {
  const product = await Product.findById(productOne._id).populate(PRODUCT_SELLER_POPULATE).lean();
  expect(product).toMatchObject({
    ...productOne,
    quantitySold: 0,
    seller: {
      _id: userOne._id,
      username: userOne.username,
    },
  });
});

test('Should get user with poulated cart and seller username of each product', async () => {
  const { cart } = await User.findById(userOne._id).populate(CART_POPULATE).lean();
  expect(cart).toHaveLength(2);
  expect(cart[0].quantity).toEqual(2);
  expect(cart[0].product).toMatchObject({
    ...productTwo,
    quantitySold: 0,
    seller: {
      _id: userTwo._id,
      username: userTwo.username,
    },
  });
});

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

// * UTILITY
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
test('Should get product with boolean photo - false', async () => {
  const product = await Product.findById(productOne._id).lean();
  const correctProduct = getCorrectProduct(product);
  expect(correctProduct.photo).toEqual(false);
});

test('Should get product with boolean photo - true', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(200);
  const product = await Product.findById(productOne._id).lean();
  const correctProduct = getCorrectProduct(product);
  expect(correctProduct.photo).toEqual(true);
});

// * getFullUser()
test('Should user with populated cart with boolean product photo', async () => {
  const { cart } = await getFullUser(userOne._id);
  expect(cart).toHaveLength(2);
  expect(cart[0].quantity).toEqual(2);
  expect(cart[0].product).toMatchObject({
    ...productTwo,
    quantitySold: 0,
    photo: false,
    seller: {
      _id: userTwo._id,
      username: userTwo.username,
    },
  });
});

// * updateUserCart()
test('Should update user cart and return isDifferent false', async () => {
  const user = await User.findById(userOne._id);
  const isDifferent = await updateUserCart(user, user.cart);
  expect(isDifferent).toEqual(false);
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
      _id: userTwo._id,
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
      _id: userThree._id,
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
      _id: userTwo._id,
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
      _id: userThree._id,
      username: userThree.username,
    },
  });
  expect(isDifferent).toEqual(true);
});

// * verifyItemsToBuy()
test('Should verify items to buy and get isDifferent false', async () => {
  const item = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: false,
    seller: {
      _id: userTwo._id,
      username: userTwo.username,
    },
  };
  const { transaction, orderProducts, isDifferent } = await verifyItemsToBuy([item]);
  expect(transaction).toHaveLength(1);
  expect(orderProducts).toHaveLength(1);
  expect(transaction[0]).toEqual(item);
  expect(orderProducts[0]).toEqual({
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 1,
    photo: productTwo.photo,
    seller: userTwo._id,
  });
  expect(isDifferent).toEqual(false);
});

test('Should verify items to buy and get transaction with updated item and isDifferent true if given quantity is too high', async () => {
  const item = {
    _id: productTwo._id,
    name: productTwo.name,
    price: productTwo.price,
    quantity: 10,
    photo: false,
    seller: {
      _id: userTwo._id,
      username: userTwo.username,
    },
  };
  const { transaction, isDifferent } = await verifyItemsToBuy([item]);
  expect(transaction).toHaveLength(1);
  expect(transaction[0]).toEqual({
    ...item,
    quantity: 3,
  });
  expect(isDifferent).toEqual(true);
});

test('Should verify items to buy and get transaction with updated item and isDifferent true if quantity changed before', async () => {
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
      _id: userTwo._id,
      username: userTwo.username,
    },
  };
  const { transaction, isDifferent } = await verifyItemsToBuy([item]);
  expect(transaction).toHaveLength(1);
  expect(transaction[0]).toEqual({
    ...item,
    quantity: 1,
  });
  expect(isDifferent).toEqual(true);
});

test('Should verify items to buy and get empty transaction and isDifferent true', async () => {
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
      _id: userTwo._id,
      username: userTwo.username,
    },
  };
  const { transaction, isDifferent } = await verifyItemsToBuy([item]);
  expect(transaction).toHaveLength(0);
  expect(isDifferent).toEqual(true);
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
