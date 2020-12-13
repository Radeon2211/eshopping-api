const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { userOne, userTwo, orderOne, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should create order', async () => {
  const response = await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send([{
      seller: userTwo._id,
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
      deliveryAddress: {
        firstName: 'Krzysztof',
        lastName: 'Kononwicz',
        street: 'Szkolna 17',
        zipCode: '15-950',
        city: 'Białystok',
        country: 'Poland',
      },
    }])
    .expect(201);
  expect(response.body.orders).not.toBeNull();
});

test('Should fetch one order (buy)', async () => {
  const response = await request(app)
    .get('/orders/buy')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.orders).toHaveLength(1);
});

test('Should fetch one order (sell)', async () => {
  const response = await request(app)
    .get('/orders/sell')
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.orders).toHaveLength(1);
});

test('Should not fetch orders (buy) by a user that does not have buy orders', async () => {
  const response = await request(app)
    .get('/orders/buy')
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.orders).toHaveLength(0);
});

test('Should not fetch orders (sell) by a user that does not have sell orders', async () => {
  const response = await request(app)
    .get('/orders/sell')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.orders).toHaveLength(0);
});

test('Should fetch order by id', async () => {
  const response = await request(app)
    .get(`/orders/${orderOne._id}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.order).not.toBeNull();
});
