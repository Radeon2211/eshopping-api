const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/userModel');
const { userOneId, userTwoId, userOne, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should signup a new user', async () => {
  const response = await request(app).post('/users').send({
    firstName: 'Mr.',
    lastName: 'Mexicano',
    username: 'Mexicano',
    email: 'user3@wp.pl',
    password: 'Pa$$w0rd',
    street: 'Szkolna 17',
    zipCode: '15-950',
    city: 'Białystok',
    country: 'Poland',
    phone: '123459876',
  }).expect(201);
  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();
  expect(response.body).toMatchObject({
    user: {
      firstName: 'Mr.',
      lastName: 'Mexicano',
      username: 'Mexicano',
      email: 'user3@wp.pl',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
    },
    token: user.tokens[0].token,
  });
  expect(user.password).not.toBe('Pa$$w0rd');
});

test('Should login existing user', async () => {
  const response = await request(app).post('/users/login').send({
    email: 'user1@wp.pl',
    password: 'Pa$$w0rd',
  }).expect(200);
  const user = await User.findById(userOneId);
  expect(response.body.token).toBe(user.tokens[1].token);
});

test('Should not login non existing user', async () => {
  await request(app).post('/users/login').send({
    email: 'nonexistinguser@wp.pl',
    password: 'Pa$$w0rd',
  }).expect(400);
});

test('Should get profile for user', async () => {
  await request(app).get(`/users/me`).set('Authorization', `Bearer ${userOne.tokens[0].token}`).send().expect(200);
});

test('Should not get profile for unauthenticated user', async () => {
  await request(app).get(`/users/me`).send().expect(401);
});

test('Should get only username of the user', async () => {
  const response = await request(app).get(`/users/${userTwoId}`).send().expect(200);
  const userInfoKeys = Object.keys(response.body);
  expect(userInfoKeys).toHaveLength(1);
  expect(userInfoKeys[0]).toBe('username');
});

test('Should get username, email and phone of the user', async () => {
  const response = await request(app).get(`/users/${userOneId}`).send().expect(200);
  expect(Object.keys(response.body)).toHaveLength(3);
  expect(response.body.username).not.toBeNull();
  expect(response.body.email).not.toBeNull();
  expect(response.body.phone).not.toBeNull();
});

test('Should delete user profile', async () => {
  await request(app).delete(`/users/me`).set('Authorization', `Bearer ${userOne.tokens[0].token}`).send().expect(200);
  const user = await User.findById(userOneId);
  expect(user).toBeNull();
});

test('Should not delete profile for unauthenticated user', async () => {
  await request(app).delete(`/users/me`).send().expect(401);
});

test('Should update valid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      phone: '987612345',
    })
    .expect(200);
  const user = await User.findById(userOneId);
  expect(user.phone).toEqual('987612345');
});

test('Should not update invalid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      username: 'newUsername',
    })
    .expect(400);
  const user = await User.findById(userOneId);
  expect(user.username).toEqual('Konon');
});

test('Should not signup user with invalid username', async () => {
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

test('Should not signup user with invalid email', async () => {
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

test('Should not signup user with invalid password', async () => {
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

test('Should not update user if unauthenticated', async () => {
  await request(app)
    .patch('/users/me')
    .send({
      country: 'Russia',
    })
    .expect(401);
});

test('Should not update user with invalid password', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      password: 'pass',
    })
    .expect(400);
});

test('Should not delete user if unauthenticated', async () => {
  await request(app)
    .delete('/users/me')
    .send()
    .expect(401);
});
