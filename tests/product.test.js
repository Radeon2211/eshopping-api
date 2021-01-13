const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/productModel');
const {
  userOne,
  userTwo,
  productOne,
  productFour,
  userThree,
  setupDatabase,
} = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should create product', async () => {
  const { body } = await request(app)
    .post('/products')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      name: 'Mega mushrooms',
      description: 'Healthy mega mushrooms',
      price: 1.5,
      quantity: 1000,
      condition: 'not_applicable',
    })
    .expect(201);
  const product = await Product.findById(body.product._id);
  expect(product).not.toBeNull();
});

// * DELETING PRODUCTS
test('Should NOT userTwo delete the productOne', async () => {
  await request(app)
    .delete(`/products/${productOne._id}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(403);
  const product = await Product.findById(productOne._id);
  expect(product).not.toBeNull();
});

test('Should NOT create product with invalid quantity', async () => {
  await request(app)
    .post(`/products`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      name: 'Mega mushrooms',
      description: 'Healthy mega mushrooms',
      price: '1,50',
      quantity: 'Quantity',
      seller: userOne._id,
    })
    .expect(400);
});

test(`Should delete authenticated user's product`, async () => {
  await request(app)
    .delete(`/products/${productOne._id}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  const product = await Product.findById(productOne._id);
  expect(product).toBeNull();
});

test('Should NOT delete product if user is unauthenticated', async () => {
  await request(app).delete(`/products/${productOne._id}`).expect(401);
  const product = await Product.findById(productOne._id);
  expect(product).not.toBeNull();
});

test('Should NOT delete other users product', async () => {
  await request(app)
    .delete(`/products/${productOne._id}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(403);
  const product = await Product.findById(productOne._id);
  expect(product).not.toBeNull();
});

test('Should admin delete other user product', async () => {
  await request(app)
    .delete(`/products/${productOne._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .expect(200);
  const product = await Product.findById(productOne._id);
  expect(product).toBeNull();
});

// * UPDATING PRODUCTS
test('Should update product', async () => {
  const { body } = await request(app)
    .patch(`/products/${productOne._id}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      name: 'Cool mushrooms',
    })
    .expect(200);
  expect(body.product).toMatchObject({
    name: 'Cool mushrooms',
    photo: false,
    seller: {
      username: userOne.username,
    },
  });
});

test('Should NOT update other user product', async () => {
  await request(app)
    .patch(`/products/${productOne._id}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send({
      name: 'Cool mushrooms',
    })
    .expect(404);
  const product = await Product.findById(productOne._id);
  expect(product.name).not.toEqual('Cool mushrooms');
});

// * FETCHING PRODUCTS
test('Should fetch three products with boolean product photo and seller username', async () => {
  const { body } = await request(app).get('/products?limit=3').expect(200);
  expect(body.products).toHaveLength(3);
  expect(body.products[0]).toMatchObject({
    ...productFour,
    _id: productFour._id.toJSON(),
    photo: false,
    seller: {
      username: userThree.username,
    },
  });
  expect(body.products.every(({ photo }) => photo === false)).toEqual(true);
});

test('Should fetch product by id with boolean product photo and seller username', async () => {
  const { body } = await request(app).get(`/products/${productOne._id}`).expect(200);
  expect(body.product).toMatchObject({
    ...productOne,
    _id: productOne._id.toJSON(),
    quantitySold: 0,
    buyerQuantity: 0,
    seller: {
      username: userOne.username,
    },
  });
});

test('Should fetch knife only', async () => {
  const { body } = await request(app).get(`/products?name=knife`).expect(200);
  expect(body.products).toHaveLength(1);
  expect(body.products[0].name).toEqual('Knife for cutting mushrooms');
});

test('Should fetch only new products', async () => {
  const { body } = await request(app).get(`/products?condition=new`).expect(200);
  expect(body.products).toHaveLength(2);
});

test('Should sort products by name descending', async () => {
  const { body } = await request(app).get(`/products?sortBy=name:desc`).expect(200);
  expect(body.products[0].name).toEqual('Wellingtons');
});

test('Should sort products by price ascending', async () => {
  const { body } = await request(app).get(`/products?sortBy=price:asc`).expect(200);
  expect(body.products[1].price).toBeGreaterThan(body.products[0].price);
});

test('Should sort products by price descending', async () => {
  const { body } = await request(app).get(`/products?sortBy=price:desc`).expect(200);
  expect(body.products[0].price).toBeGreaterThan(body.products[1].price);
});

test('Should sort products by price descending and filter these above $10', async () => {
  const { body } = await request(app).get(`/products?sortBy=price:desc&minPrice=10`).expect(200);
  expect(body.products[0].price).toBeGreaterThan(body.products[1].price);
  body.products.forEach(({ price }) => {
    expect(price).toBeGreaterThanOrEqual(10);
  });
});

test('Should fetch first two products', async () => {
  const { body } = await request(app).get(`/products?limit=2`).expect(200);
  expect(body.products).toHaveLength(2);
});

test('Should fetch oldest (saved as first) product by default, and 4 as productCount', async () => {
  const { body } = await request(app).get(`/products?limit=1&p=4`).expect(200);
  expect(body.products[0].name).toEqual('Mushrooms');
  expect(body.productCount).toEqual(4);
});

// * UPLOADING AND DELETING PHOTO
test('Should upload photo for first product', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(200);
  const product = await Product.findById(productOne._id);
  expect(product.photo).toEqual(expect.any(Buffer));
});

test('Should NOT upload photo for first product by not a seller', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(403);
  const product = await Product.findById(productOne._id);
  expect(product.photo).toBeUndefined();
});

test('Should delete photo of first product', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(200);

  await request(app)
    .delete(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);

  const product = await Product.findById(productOne._id);
  expect(product.photo).toBeUndefined();
});

test('Should NOT delete photo of first product by not a seller', async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .attach('photo', 'tests/fixtures/mushrooms.jpg')
    .expect(200);

  await request(app)
    .delete(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(403);

  const product = await Product.findById(productOne._id);
  expect(product.photo).toEqual(expect.any(Buffer));
});
