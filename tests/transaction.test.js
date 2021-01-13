const request = require('supertest');
const app = require('../src/app');
const {
  userOne,
  userTwo,
  userThree,
  productOne,
  productFour,
  setupDatabase,
} = require('./fixtures/db');

beforeEach(setupDatabase);

// * TRANSACTION WITH ITEMS FROM CART
test('Should get transaction products the same as in cart, isDifferent false, cart null', async () => {
  const { body } = await request(app)
    .patch(`/transaction`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.isDifferent).toEqual(false);
  expect(body.cart).toBeNull();
  expect(body.transaction).toHaveLength(2);
  expect(body.transaction.every(({ photo }) => photo === false)).toEqual(true);
});

test('Should get transaction products the same as in cart, isDifferent true, cart length 2 with edited item', async () => {
  await request(app)
    .patch(`/products/${productFour._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({
      quantity: 40,
    });
  const { body } = await request(app)
    .patch(`/transaction`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.transaction).toHaveLength(2);
  expect(body.transaction[1].quantity).toEqual(40);
  expect(body.isDifferent).toEqual(true);
  expect(body.cart).toHaveLength(2);
  expect(body.cart[1].quantity).toEqual(40);
});

test('Should get transaction empty, isDifferent true, cart length 0', async () => {
  await request(app)
    .delete(`/products/${productOne._id}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`]);
  const { body } = await request(app)
    .patch(`/transaction`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.transaction).toHaveLength(0);
  expect(body.isDifferent).toEqual(true);
  expect(body.cart).toHaveLength(0);
});

// * TRANSACTION WITH SINGLE ITEM
test('Should get transaction product the same as given, isDifferent false, cart null', async () => {
  const { body } = await request(app)
    .patch(`/transaction`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ singleItem: { product: productFour._id, quantity: 1 } })
    .expect(200);
  expect(body.transaction).toHaveLength(1);
  expect(body.transaction[0]._id).toEqual(productFour._id.toString());
  expect(body.isDifferent).toEqual(false);
  expect(body.cart).toBeNull();
});

test('Should get transaction product edited, isDifferent true, cart null', async () => {
  await request(app)
    .patch(`/products/${productFour._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({
      quantity: 40,
    });
  const { body } = await request(app)
    .patch(`/transaction`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ singleItem: { product: productFour._id, quantity: 50 } })
    .expect(200);
  expect(body.transaction).toHaveLength(1);
  expect(body.transaction[0].quantity).toEqual(40);
  expect(body.isDifferent).toEqual(true);
  expect(body.cart).toBeNull();
});

test('Should get transaction empty, isDifferent true, cart null', async () => {
  await request(app)
    .delete(`/products/${productFour._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`]);
  const { body } = await request(app)
    .patch(`/transaction`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ singleItem: { product: productFour._id, quantity: 50 } })
    .expect(200);
  expect(body.transaction).toHaveLength(0);
  expect(body.isDifferent).toEqual(true);
  expect(body.cart).toBeNull();
});
