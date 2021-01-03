const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/userModel');
const { userOne, userTwo, userThree, productFour, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should signup a new user', async () => {
  const { body } = await request(app)
    .post('/users')
    .send({
      firstName: 'John',
      lastName: 'Smith',
      username: 'jsmith',
      email: 'jsmith@gmail.com',
      password: 'Pa$$w0rd',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
      contacts: ['email'],
    })
    .expect(201);
  const user = await User.findById(body.user._id);
  expect(user).not.toBeNull();
  expect(body.user).toMatchObject({
    firstName: 'John',
    lastName: 'Smith',
    username: 'jsmith',
    email: 'jsmith@gmail.com',
    street: 'Szkolna 17',
    zipCode: '15-950',
    city: 'Białystok',
    country: 'Poland',
    phone: '123459876',
    cart: [],
    contacts: ['email'],
  });
  expect(user.password).not.toEqual('Pa$$w0rd');
});

test('Should login existing user with isDifferent false and cart length 2 with boolean product photo', async () => {
  const { body } = await request(app)
    .post('/users/login')
    .send({
      email: 'user1@wp.pl',
      password: 'Pa$$w0rd',
    })
    .expect(200);
  const user = await User.findById(userOne._id);
  expect(user.tokens).toHaveLength(2);
  expect(body.isDifferent).toEqual(false);
  expect(body.user.cart).toHaveLength(2);
  expect(body.user.cart.every(({ product }) => product.photo === false));
});

test('Should login existing user with isDifferent true and cart length 1 with boolean product photo', async () => {
  await request(app)
    .delete(`/products/${productFour._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`]);
  const { body } = await request(app)
    .post('/users/login')
    .send({
      email: 'user1@wp.pl',
      password: 'Pa$$w0rd',
    })
    .expect(200);
  expect(body.isDifferent).toEqual(true);
  expect(body.user.cart).toHaveLength(1);
  expect(body.user.cart[0].product.photo).toEqual(false);
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

test('Should get profile for user with isDifferent false and cart length 2 with boolean product photo', async () => {
  const { body } = await request(app)
    .get(`/users/me`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.isDifferent).toEqual(false);
  expect(body.user.cart).toHaveLength(2);
  expect(body.user.cart.every(({ product }) => product.photo === false));
});

test('Should get profile for user with isDifferent true and cart length 1', async () => {
  await request(app)
    .delete(`/products/${productFour._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`]);
  const { body } = await request(app)
    .get(`/users/me`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(body.user.cart).toHaveLength(1);
  expect(body.isDifferent).toEqual(true);
});

test('Should NOT get profile for unauthenticated user', async () => {
  await request(app).get(`/users/me`).send().expect(401);
});

test('Should get only username of the user', async () => {
  const { body } = await request(app).get(`/users/${userTwo.username}`).send().expect(200);
  const userInfoKeys = Object.keys(body.profile);
  expect(userInfoKeys).toHaveLength(1);
  expect(userInfoKeys[0]).toEqual('username');
});

test('Should get username, email and phone of the user', async () => {
  const { body } = await request(app).get(`/users/${userOne.username}`).send().expect(200);
  expect(Object.keys(body.profile)).toHaveLength(3);
  expect(body.username).not.toBeNull();
  expect(body.email).not.toBeNull();
  expect(body.phone).not.toBeNull();
});

test('Should delete user profile', async () => {
  await request(app)
    .delete(`/users/me`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ currentPassword: userOne.password })
    .expect(200);
  const user = await User.findById(userOne._id);
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
  const user = await User.findById(userOne._id);
  expect(user.phone).toEqual('987612345');
  expect(user.cart).toHaveLength(2);
});

test('Should update valid user fields and get cart length 1', async () => {
  await request(app)
    .delete(`/products/${productFour._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`]);
  const { body } = await request(app)
    .patch('/users/me')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      phone: '987612345',
    })
    .expect(200);
  expect(body.user.cart).toHaveLength(1);
});

test('Should NOT update invalid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      username: 'newUsername',
    })
    .expect(400);
  const user = await User.findById(userOne._id);
  expect(user.username).toEqual('Konon');
});

test('Should NOT signup user with invalid username', async () => {
  await request(app)
    .post('/users')
    .send({
      firstName: 'John',
      lastName: 'Smith',
      username: 'j',
      email: 'johnsmith@gmail.com',
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
      firstName: 'John',
      lastName: 'Smith',
      username: 'jsmith',
      email: 'johnsmith',
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
      firstName: 'John',
      lastName: 'Smith',
      username: 'johnsmith',
      email: 'johnsmith@gmail.com',
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
  await request(app).delete('/users/me').expect(401);
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
