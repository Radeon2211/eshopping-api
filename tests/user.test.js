const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/userModel');
const Product = require('../src/models/productModel');
const {
  userOneId,
  userOne,
  userTwo,
  productOneId,
  productTwoId,
  productThreeId,
  productFourId,
  userThree,
  setupDatabase,
  cartItemOneId,
  cartItemTwoId,
  cartItemThreeId,
} = require('./fixtures/db');
const { updateCartActions } = require('../src/shared/constants');

beforeEach(setupDatabase);

test('Should signup a new user', async () => {
  const response = await request(app)
    .post('/users')
    .send({
      firstName: 'Mr.',
      lastName: 'Mexicano',
      username: 'Mexicano',
      email: 'user4@wp.pl',
      password: 'Pa$$w0rd',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
    })
    .expect(201);
  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();
  expect(response.body).toMatchObject({
    user: {
      firstName: 'Mr.',
      lastName: 'Mexicano',
      username: 'Mexicano',
      email: 'user4@wp.pl',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
    },
  });
  expect(user.password).not.toBe('Pa$$w0rd');
});

test('Should login existing user with isDifferent false and cart length 2', async () => {
  const response = await request(app)
    .post('/users/login')
    .send({
      email: 'user1@wp.pl',
      password: 'Pa$$w0rd',
    })
    .expect(200);
  const user = await User.findById(userOneId);
  expect(user.tokens).toHaveLength(2);
  expect(user.cart).toHaveLength(2);
  expect(response.body.isDifferent).toEqual(false);
});

test('Should login existing user with isDifferent true and cart length 1', async () => {
  await request(app)
    .delete(`/products/${productFourId}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send();
  const response = await request(app)
    .post('/users/login')
    .send({
      email: 'user1@wp.pl',
      password: 'Pa$$w0rd',
    })
    .expect(200);
  expect(response.body.user.cart).toHaveLength(1);
  expect(response.body.isDifferent).toEqual(true);
});

test('Should NOT login non existing user', async () => {
  await request(app)
    .post('/users/login')
    .send({
      email: 'nonexistinguser@wp.pl',
      password: 'Pa$$w0rd',
    })
    .expect(400);
});

test('Should get profile for user with isDifferent false and cart length 2', async () => {
  const response = await request(app)
    .get(`/users/me`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.user.cart).toHaveLength(2);
  expect(response.body.isDifferent).toEqual(false);
});

test('Should get profile for user with isDifferent true and cart length 1', async () => {
  await request(app)
    .delete(`/products/${productFourId}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send();
  const response = await request(app)
    .get(`/users/me`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.user.cart).toHaveLength(1);
  expect(response.body.isDifferent).toEqual(true);
});

test('Should NOT get profile for unauthenticated user', async () => {
  await request(app).get(`/users/me`).send().expect(401);
});

test('Should get only username of the user', async () => {
  const response = await request(app).get(`/users/${userTwo.username}`).send().expect(200);
  const userInfoKeys = Object.keys(response.body.profile);
  expect(userInfoKeys).toHaveLength(1);
  expect(userInfoKeys[0]).toBe('username');
});

test('Should get username, email and phone of the user', async () => {
  const response = await request(app).get(`/users/${userOne.username}`).send().expect(200);
  expect(Object.keys(response.body.profile)).toHaveLength(3);
  expect(response.body.username).not.toBeNull();
  expect(response.body.email).not.toBeNull();
  expect(response.body.phone).not.toBeNull();
});

test('Should delete user profile', async () => {
  await request(app)
    .delete(`/users/me`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ currentPassword: userOne.password })
    .expect(200);
  const user = await User.findById(userOneId);
  expect(user).toBeNull();
});

test('Should NOT delete profile for unauthenticated user', async () => {
  await request(app).delete(`/users/me`).send().expect(401);
});

test('Should update valid user fields and get cart length 2', async () => {
  await request(app)
    .patch('/users/me')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      phone: '987612345',
    })
    .expect(200);
  const user = await User.findById(userOneId);
  expect(user.phone).toEqual('987612345');
  expect(user.cart).toHaveLength(2);
});

test('Should update valid user fields and get cart length 1', async () => {
  await request(app)
    .delete(`/products/${productFourId}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send();
  const response = await request(app)
    .patch('/users/me')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      phone: '987612345',
    })
    .expect(200);
  expect(response.body.user.cart).toHaveLength(1);
});

test('Should NOT update invalid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      username: 'newUsername',
    })
    .expect(400);
  const user = await User.findById(userOneId);
  expect(user.username).toEqual('Konon');
});

test('Should NOT signup user with invalid username', async () => {
  await request(app)
    .post('/users')
    .send({
      firstName: 'Mr.',
      lastName: 'Mexicano',
      username: 'M',
      email: 'user3@wp.pl',
      password: 'Pa$$w0rd',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
    })
    .expect(400);
});

test('Should NOT signup user with invalid email', async () => {
  await request(app)
    .post('/users')
    .send({
      firstName: 'Mr.',
      lastName: 'Mexicano',
      username: 'Mexicano',
      email: 'user3',
      password: 'Pa$$w0rd',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
    })
    .expect(400);
});

test('Should NOT signup user with invalid password', async () => {
  await request(app)
    .post('/users')
    .send({
      firstName: 'Mr.',
      lastName: 'Mexicano',
      username: 'Mexicano',
      email: 'user3@wp.pl',
      password: 'pass',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
    })
    .expect(400);
});

test('Should NOT update user if unauthenticated', async () => {
  await request(app)
    .patch('/users/me')
    .send({
      country: 'Russia',
    })
    .expect(401);
});

test('Should NOT update user with invalid current credentials', async () => {
  await request(app)
    .patch('/users/me')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      currentEmail: 'user1@wp.pl',
      currentPassword: 'incorrectPassword',
      password: 'password',
    })
    .expect(400);
});

test('Should NOT update user without current credentials', async () => {
  await request(app)
    .patch('/users/me')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      password: 'password',
    })
    .expect(400);
});

test('Should update user with current credentials', async () => {
  await request(app)
    .patch('/users/me')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      currentPassword: 'Pa$$w0rd',
      password: 'password',
    })
    .expect(200);
});

test('Should NOT delete user if unauthenticated', async () => {
  await request(app).delete('/users/me').send().expect(401);
});

test('Should admin make other user admin', async () => {
  await request(app)
    .patch('/users/add-admin')
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({ email: 'user1@wp.pl' })
    .expect(200);
});

test('Should NOT non admin update other user to admin', async () => {
  await request(app)
    .patch('/users/add-admin')
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send({ email: 'user1@wp.pl' })
    .expect(403);
});

test('Should admin remove other admin', async () => {
  await request(app)
    .patch('/users/remove-admin')
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({ email: 'user1@wp.pl' })
    .expect(200);
});

test('Should NOT non admin remove other admin', async () => {
  await request(app)
    .patch('/users/remove-admin')
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send({ email: 'user1@wp.pl' })
    .expect(403);
});

test('Should get user cart with 2 products and isDifferent false and 48 quantity of second product', async () => {
  const response = await request(app)
    .get('/cart')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.cart).toHaveLength(2);
  expect(response.body.cart[1].quantity).toEqual(48);
  expect(response.body.isDifferent).toEqual(false);
});

test('Should get user cart with 1 product and isDifferent true when product is deleted from db before', async () => {
  await request(app)
    .delete(`/products/${productFourId}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send();
  const response = await request(app)
    .get('/cart')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.cart).toHaveLength(1);
  expect(response.body.isDifferent).toEqual(true);
});

test('Should get user cart with 2 products and isDifferent true and 40 quantity when product is updated in db before', async () => {
  await request(app)
    .patch(`/products/${productFourId}/seller`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({
      quantity: 40,
    });
  const response = await request(app)
    .get('/cart')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(response.body.cart).toHaveLength(2);
  expect(response.body.cart[1].quantity).toEqual(40);
  expect(response.body.isDifferent).toEqual(true);
});

test('Should add new item to cart and cart length should be 2 and isDifferent false', async () => {
  const response = await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({ quantity: 2, product: productTwoId })
    .expect(200);
  expect(response.body.cart).toHaveLength(2);
  expect(response.body.isDifferent).toEqual(false);
});

test('Should add new item to cart and cart length should be 1 and isDifferent true', async () => {
  await request(app)
    .delete(`/products/${productThreeId}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send();
  const response = await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send({ quantity: 2, product: productTwoId })
    .expect(200);
  expect(response.body.cart).toHaveLength(1);
  expect(response.body.isDifferent).toEqual(true);
});

test('Should add 1 quantity to item in cart and should equals 3', async () => {
  const response = await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 1, product: productTwoId })
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(3);
});

test('Should add 1 quantity to item in cart and should equals 3 even if given quantity equals 3 (total quantity of product in db)', async () => {
  const response = await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 3, product: productTwoId })
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(3);
});

test('Should NOT add item to cart if cart items number is 50 or higher', async () => {
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
    .send({ quantity: 2, product: productThreeId })
    .expect(403);
});

test(`Should NOT add item to cart with user's product`, async () => {
  await request(app)
    .patch('/cart/add')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ quantity: 1, product: productOneId })
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

test('Should remove item from cart and get user cart length 1 and isDifferent false', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemTwoId}/remove`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart).toHaveLength(1);
  expect(response.body.isDifferent).toEqual(false);
});

test('Should remove item from cart and get user cart length 0 and isDifferent true', async () => {
  await request(app)
    .delete(`/products/${productFourId}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .send();
  const response = await request(app)
    .patch(`/cart/${cartItemTwoId}/remove`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart).toHaveLength(0);
  expect(response.body.isDifferent).toEqual(true);
});

test('Should increment quantity of cart item', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.INCREMENT}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(3);
});

test('Should decrement quantity of cart item', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.DECREMENT}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(1);
});

test('Should update quantity of cart item to 20', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=20`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(20);
});

test('Should update quantity of cart item to product quantity if given quantity is greater than product quantity', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=2000`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(1000);
});

test('Should NOT update quantity of cart item if given quantity is false value after parsing to int', async () => {
  await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=0`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(400);
});

test('Should NOT update quantity of cart item if given quantity is lower than 1', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=-1`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(2);
});

test('Should return the same quantity of cart item if given quantity equals to cart item quantity', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=2`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(2);
});

test('Should NOT increment quantity of cart item if product quantity equals to cart item quantity', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemThreeId}/update?action=${updateCartActions.INCREMENT}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(1);
});

test('Should NOT decrement quantity of cart item if product quantity equals to cart item quantity', async () => {
  const response = await request(app)
    .patch(`/cart/${cartItemThreeId}/update?action=${updateCartActions.DECREMENT}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .expect(200);
  expect(response.body.cart[0].quantity).toEqual(1);
});

test('Should NOT update when updating cart item quantity if no action is given', async () => {
  await request(app)
    .patch(`/cart/${cartItemTwoId}/update`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(400);
});
