const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Order = require('../src/models/orderModel');
const { userOneId, userOne, userTwo, productOne, productTwo, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should create order', async () => {
  const response = await request(app)
    .post('/orders')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send([{
      seller: userOneId,
      overallPrice: 70,
      products: [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Item1',
          price: 2,
          quantity: 10,
          totalPrice: 20,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Item2',
          price: 2.50,
          quantity: 20,
          totalPrice: 50,
        },
      ],
    }])
    .expect(201);
  expect(response.body).not.toBeNull();
});

test('Should fetch one order (buy)', async () => {
  const response = await request(app)
    .get('/orders/buy')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
  expect(response.body).toHaveLength(1);
});

test('Should fetch one order (sell)', async () => {
  const response = await request(app)
    .get('/orders/sell')
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .send()
    .expect(200);
  expect(response.body).toHaveLength(1);
});

test('Should not fetch orders (buy) by a user that does not have buy orders', async () => {
  const response = await request(app)
    .get('/orders/buy')
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .send()
    .expect(200);
  expect(response.body).toHaveLength(0);
});

test('Should not fetch orders (sell) by a user that does not have sell orders', async () => {
  const response = await request(app)
    .get('/orders/sell')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
  expect(response.body).toHaveLength(0);
});