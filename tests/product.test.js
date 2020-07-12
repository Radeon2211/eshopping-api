const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/productModel');
const { userOneId, userOne, userTwo, productOne, productTwo, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should create product', async () => {
  const response = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      name: 'Mega mushrooms',
      description: 'Healthy mega mushrooms',
      price: '1,50',
      quantity: 1000,
      seller: userOneId,
    })
    .expect(201);
  const product = await Product.findById(response.body._id);
  expect(product).not.toBeNull();
});

test('Should fetch two products', async () => {
  const response = await request(app)
    .get('/products')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
  expect(response.body).toHaveLength(2);
});

test('Should not second user delete the first task', async () => {
  await request(app)
    .delete(`/prodcuts/${productOne._id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .send()
    .expect(404);
  const product = await Product.findById(productOne._id);
  expect(product).not.toBeNull();
});

test('Should not create product with invalid quantity', async () => {
  await request(app)
    .post(`/products`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      name: 'Mega mushrooms',
      description: 'Healthy mega mushrooms',
      price: '1,50',
      quantity: 'Quantity',
      seller: userOneId,
    })
    .expect(400);
});