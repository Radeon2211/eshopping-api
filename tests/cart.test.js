const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Product = require('../src/models/productModel');
const {
  userOne,
  userTwo,
  productOne,
  productTwo,
  productThree,
  productFour,
  userThree,
  setupDatabase,
  cartItemOneId,
  cartItemTwoId,
  cartItemThreeId,
} = require('./fixtures/db');
const { updateCartActions } = require('../src/shared/constants');

beforeEach(setupDatabase);

// * GET CART
test('Should get user cart with 2 products with boolean product photo and isDifferent false and 48 quantity of second product', async () => {
  const { body } = await request(app)
    .get('/cart')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.cart).toHaveLength(2);
  expect(body.cart[1].quantity).toEqual(48);
  expect(body.isDifferent).toEqual(false);
  expect(body.cart.every(({ product }) => product.photo === false)).toEqual(true);
});

test('Should get user cart with 1 product and isDifferent true when product is deleted from db before', async () => {
  await request(app)
    .delete(`/products/${productFour._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`]);
  const { body } = await request(app)
    .get('/cart')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(body.cart).toHaveLength(1);
  expect(body.isDifferent).toEqual(true);
});

test('Should get user cart with 2 products and isDifferent true and 40 quantity when product is updated in db before', async () => {
  await request(app)
    .patch(`/products/${productFour._id}/seller`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({
      quantity: 40,
    });
  const { body } = await request(app)
    .get('/cart')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(body.cart).toHaveLength(2);
  expect(body.cart[1].quantity).toEqual(40);
  expect(body.isDifferent).toEqual(true);
});

// * ADD ITEM TO CART
test('Should add new item to cart and cart length should be 2 with boolean product photo and isDifferent false', async () => {
  const { body } = await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({ quantity: 2, product: productTwo._id })
    .expect(200);
  expect(body.isDifferent).toEqual(false);
  expect(body.cart).toHaveLength(2);
  expect(body.cart.every(({ product }) => product.photo === false)).toEqual(true);
});

test('Should add new item to cart and cart length should be 1 and isDifferent true', async () => {
  await request(app)
    .delete(`/products/${productThree._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`]);
  const { body } = await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({ quantity: 2, product: productTwo._id })
    .expect(200);
  expect(body.cart).toHaveLength(1);
  expect(body.isDifferent).toEqual(true);
});

test('Should add 1 quantity to item in cart and should equals 3', async () => {
  const { body } = await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 1, product: productTwo._id })
    .expect(200);
  expect(body.cart[0].quantity).toEqual(3);
});

test('Should add 1 quantity to item in cart and should equals 3 even if given quantity equals 3 (total quantity of product in db)', async () => {
  const { body } = await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 3, product: productTwo._id })
    .expect(200);
  expect(body.cart[0].quantity).toEqual(3);
});

test('Should NOT add item to cart if cart items number is 50 or higher', async () => {
  jest.setTimeout(15000);
  for (let i = 0; i < 48; i += 1) {
    const productId = new mongoose.Types.ObjectId();
    const product = {
      _id: productId,
      name: 'Product name',
      description: '',
      price: 10,
      condition: 'new',
      quantity: 1,
      seller: userTwo._id,
    };
    await new Product(product).save();
    await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ quantity: 1, product: productId });
  }
  await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 2, product: productThree._id })
    .expect(403);
});

test(`Should NOT add item to cart with user's product`, async () => {
  await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 1, product: productOne._id })
    .expect(403);
});

test('Should NOT add new item to cart if given productId does not exists in db', async () => {
  await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 1, product: new mongoose.Types.ObjectId() })
    .expect(403);
});

test('Should NOT add new item to cart if given productId is not valid mongoose ObjectID', async () => {
  await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 1, product: 'productId' })
    .expect(500);
});

// * REMOVE ITEM FROM CART
test('Should remove item from cart and get user cart length 1 with boolean product photo and isDifferent false', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemTwoId}/remove`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.isDifferent).toEqual(false);
  expect(body.cart).toHaveLength(1);
  expect(body.cart[0].product.photo).toEqual(false);
});

test('Should remove item from cart and get user cart length 0 and isDifferent true', async () => {
  await request(app)
    .delete(`/products/${productFour._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`]);
  const { body } = await request(app)
    .patch(`/cart/${cartItemTwoId}/remove`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.cart).toHaveLength(0);
  expect(body.isDifferent).toEqual(true);
});

// * INCREMENT AND DECREMENT ITEM QUANTITY IN CART
test('Should increment quantity of cart item and get it with boolean product photo', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.INCREMENT}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.cart[0].quantity).toEqual(3);
  expect(body.cart[0].product.photo).toEqual(false);
});

test('Should decrement quantity of cart item', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.DECREMENT}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.cart[0].quantity).toEqual(1);
});

test('Should update quantity of cart item to 20', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=20`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.cart[0].quantity).toEqual(20);
});

test('Should update quantity of cart item to product quantity if given quantity is greater than product quantity', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=2000`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.cart[0].quantity).toEqual(1000);
});

test('Should NOT update quantity of cart item if given quantity is false value after parsing to int', async () => {
  await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=0`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(400);
});

test('Should NOT update quantity of cart item if given quantity is lower than 1', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=-1`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.cart[0].quantity).toEqual(2);
});

test('Should return the same quantity of cart item if given quantity equals to cart item quantity', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=2`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.cart[0].quantity).toEqual(2);
});

test('Should NOT increment quantity of cart item if product quantity equals to cart item quantity', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemThreeId}/update?action=${updateCartActions.INCREMENT}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .expect(200);
  expect(body.cart[0].quantity).toEqual(1);
});

test('Should NOT decrement quantity of cart item if product quantity equals to cart item quantity', async () => {
  const { body } = await request(app)
    .patch(`/cart/${cartItemThreeId}/update?action=${updateCartActions.DECREMENT}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .expect(200);
  expect(body.cart[0].quantity).toEqual(1);
});

test('Should NOT update when updating cart item quantity if no action is given', async () => {
  await request(app)
    .patch(`/cart/${cartItemTwoId}/update`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(400);
});
