const request = require('supertest');
const mockedEnv = require('mocked-env');
const app = require('../../src/app');
const Product = require('../../src/models/productModel');
const User = require('../../src/models/userModel');
const Order = require('../../src/models/orderModel');
const VerificationCode = require('../../src/models/verificationCodeModel');
const { setupDatabase, userOne, userFour, productOne } = require('./fixtures/db');
const {
  envModes,
  authMiddlewaresErrorMessage,
  userStatuses,
} = require('../../src/shared/constants');
const cypressFixtures = require('../cypress/db');

let restoreEnv;

const testWhenNotE2ETesting = async (route) => {
  restoreEnv = mockedEnv({
    MODE: envModes.PRODUCTION,
  });
  const response1 = await request(app).patch(route).expect(401);
  expect(response1.body).toEqual({
    message: authMiddlewaresErrorMessage,
  });

  restoreEnv = mockedEnv({
    MODE: envModes.DEVELOPMENT,
  });
  const response2 = await request(app).patch(route).expect(401);
  expect(response2.body).toEqual({
    message: authMiddlewaresErrorMessage,
  });

  restoreEnv = mockedEnv({
    MODE: envModes.UNIT_TESTING,
  });
  const response3 = await request(app).patch(route).expect(401);
  expect(response3.body).toEqual({
    message: authMiddlewaresErrorMessage,
  });
};

beforeEach(setupDatabase);

beforeEach(() => {
  if (restoreEnv) restoreEnv();
  restoreEnv = mockedEnv({
    MODE: envModes.E2E_TESTING,
  });
});

afterEach(() => {
  restoreEnv();
});

describe('POST /testing/seed', () => {
  const testedRoute = '/testing/seed';

  test('should seed database', async () => {
    await request(app).patch(testedRoute).expect(200);

    const users = await User.find().lean();
    expect(users).toEqual([
      ...cypressFixtures.users.map((user, idx) => ({
        ...user,
        password: users[parseInt(idx, 10)].password,
        createdAt: users[parseInt(idx, 10)].createdAt,
      })),
    ]);

    const products = await Product.find().lean();
    expect(products).toEqual([
      ...cypressFixtures.products.map((user, idx) => ({
        ...user,
        createdAt: products[parseInt(idx, 10)].createdAt,
        updatedAt: products[parseInt(idx, 10)].updatedAt,
      })),
    ]);

    const orders = await Order.find().lean();
    expect(orders).toHaveLength(0);

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });

  test('should get 401 if environment mode is other than E2E_TESTING', async () => {
    await testWhenNotE2ETesting(testedRoute);
  });
});

describe('PATCH /testing/verify-email', () => {
  const testedRoute = '/testing/verify-email';

  test('should change email and delete verification code', async () => {
    const newEmail = 'newemail@example.com';
    await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({
        currentPassword: userOne.password,
        email: newEmail,
      })
      .expect(200);

    const verificationCodesBefore = await VerificationCode.find().lean();
    expect(verificationCodesBefore).toHaveLength(1);

    await request(app)
      .patch(testedRoute)
      .send({
        email: userOne.email,
      })
      .expect(200);

    const user = await User.findOne({ email: newEmail });
    expect(user).not.toBeNull();

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });

  test('should get 401 if environment mode is other than E2E_TESTING', async () => {
    await testWhenNotE2ETesting(testedRoute);
  });
});

describe('PATCH /testing/activate-account', () => {
  const testedRoute = '/testing/activate-account';

  test('should activate account and delete verification code', async () => {
    await request(app)
      .post('/users/send-account-verification-email')
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .expect(200);

    const verificationCodesBefore = await VerificationCode.find().lean();
    expect(verificationCodesBefore).toHaveLength(1);

    await request(app)
      .patch(testedRoute)
      .send({
        email: userFour.email,
      })
      .expect(200);

    const user = await User.findOne({ email: userFour.email });
    expect(user.status).toEqual(userStatuses.ACTIVE);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });

  test('should get 401 if environment mode is other than E2E_TESTING', async () => {
    await testWhenNotE2ETesting(testedRoute);
  });
});

describe('PATCH /testing/edit-product-quantity', () => {
  const testedRoute = '/testing/edit-product-quantity';

  test('should set new quantity to product with given name', async () => {
    const newQuantity = 2;

    const productBefore = await Product.findOne({ name: productOne.name });
    expect(productBefore.quantity).toEqual(productOne.quantity);

    await request(app)
      .patch(testedRoute)
      .send({
        name: productOne.name,
        newQuantity,
      })
      .expect(200);

    const productAfter = await Product.findOne({ name: productOne.name });
    expect(productAfter.quantity).toEqual(newQuantity);
  });

  test('should remove product with given name', async () => {
    const productBefore = await Product.findOne({ name: productOne.name });
    expect(productBefore.quantity).toEqual(productOne.quantity);

    await request(app)
      .patch(testedRoute)
      .send({
        name: productOne.name,
        newQuantity: 0,
      })
      .expect(200);

    const productAfter = await Product.findOne({ name: productOne.name });
    expect(productAfter).toBeNull();
  });

  test('should get 401 if environment mode is other than E2E_TESTING', async () => {
    await testWhenNotE2ETesting(testedRoute);
  });
});
