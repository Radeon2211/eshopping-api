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
      price: 1.5,
      quantity: 1000,
      seller: userOneId,
    })
    .expect(201);
  const product = await Product.findById(response.body._id);
  expect(product).not.toBeNull();
});

test('Should fetch three products', async () => {
  const response = await request(app)
    .get('/products')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
  expect(response.body.products).toHaveLength(3);
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

test('Should delete authenticated users product', async () => {
  const response = await request(app)
    .delete(`/products/${productOne._id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
  const product = await Product.findById(response.body._id);
  expect(product).toBeNull();
});

test('Should not delete product if unauthenticated', async () => {
  await request(app)
    .delete(`/products/${productOne._id}`)
    .send()
    .expect(401);
  const product = await Product.findById(productOne._id);
  expect(product).not.toBeNull();
});

test('Should not delete other users product', async () => {
  await request(app)
    .delete(`/products/${productOne._id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .send()
    .expect(404);
  const product = await Product.findById(productOne._id);
  expect(product).not.toBeNull();
});

test('Should update product', async () => {
  await request(app)
    .patch(`/products/${productOne._id}/seller`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      name: 'Cool mushrooms',
    })
    .expect(200);
  const product = await Product.findById(productOne._id);
  expect(product.name).toBe('Cool mushrooms');
});

test('Should update other user product', async () => {
  await request(app)
    .patch(`/products/${productOne._id}/buyer`)
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .send({
      quantityPurchased: 10,
    })
    .expect(200);
  const product = await Product.findById(productOne._id);
  expect(product.quantity).toBe(990);
});

test('Should not update other user product', async () => {
  await request(app)
    .patch(`/products/${productOne._id}/seller`)
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .send({
      name: 'Cool mushrooms',
    })
    .expect(404);
  const product = await Product.findById(productOne._id);
  expect(product.name).not.toBe('Cool mushrooms');
});

test('Should fetch product by id', async () => {
  const response = await request(app)
    .get(`/products/${productOne._id}`)
    .send()
    .expect(200);
  expect(response.body._id).not.toBeNull();
});

test('Should fetch knife', async () => {
  const response = await request(app)
    .get(`/products?name=knife`)
    .send()
    .expect(200);
  expect(response.body.products[0].name).toBe('Knife for cutting mushrooms');
});

test('Should fetch last product', async () => {
  const response = await request(app)
    .get(`/products?limit=1&skip=2`)
    .send()
    .expect(200);
  expect(response.body.products[0].name).toBe('Wellingtons');
});

test('Should fetch only new products', async () => {
  const response = await request(app)
    .get(`/products?condition=new`)
    .send()
    .expect(200);
  expect(response.body.products).toHaveLength(2);
});

test('Should sort products by name descending', async () => {
  const response = await request(app)
    .get(`/products?sortBy=name:desc`)
    .send()
    .expect(200);
  expect(response.body.products[0].name).toBe('Wellingtons');
});

test('Should sort products by price ascending', async () => {
  const response = await request(app)
    .get(`/products?sortBy=price:asc`)
    .send()
    .expect(200);
  expect(response.body.products[1].price).toBeGreaterThan(response.body.products[0].price);
});

test('Should sort products by price descending', async () => {
  const response = await request(app)
    .get(`/products?sortBy=price:desc`)
    .send()
    .expect(200);
  expect(response.body.products[0].price).toBeGreaterThan(response.body.products[1].price);
});

test('Should sort products by price descending and filter these above $10', async () => {
  const response = await request(app)
    .get(`/products?sortBy=price:desc&minPrice=10`)
    .send()
    .expect(200);
  expect(response.body.products[0].price).toBeGreaterThan(response.body.products[1].price);
  response.body.products.forEach(({ price }) => {
    expect(price).toBeGreaterThanOrEqual(10);
  });
});

test('Should fetch first two products', async () => {
  const response = await request(app)
    .get(`/products?limit=2`)
    .send()
    .expect(200);
  expect(response.body.products).toHaveLength(2);
});

test('Should fetch last product, and 3 as productCount', async () => {
  const response = await request(app)
    .get(`/products?limit=1&skip=2`)
    .send()
    .expect(200);
  expect(response.body.products[0].name).toBe('Wellingtons');
  expect(response.body.productCount).toBe(3);
});

test('Should upload photo for first product', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(200);
  const product = await Product.findById(productOne._id);
  expect(product.photo).toEqual(expect.any(Buffer));
});

test('Should not upload photo for first product by not a seller', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(400);
  const product = await Product.findById(productOne._id);
  expect(product.photo).toBe(undefined);
});

test('Should delete photo of first product', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(200);
  await request(app)
    .delete(`/products/${productOne._id}/photo`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
  const product = await Product.findById(productOne._id);
  expect(product.photo).toBe(undefined);
});

test('Should not delete photo of first product by not a seller', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(200);
  await request(app)
    .delete(`/products/${productOne._id}/photo`)
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .send()
    .expect(404);
  const product = await Product.findById(productOne._id);
  expect(product.photo).toEqual(expect.any(Buffer));
});