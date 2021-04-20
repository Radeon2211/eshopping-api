const request = require('supertest');
const mockedEnv = require('mocked-env');
const app = require('../../src/app');
const Product = require('../../src/models/productModel');
const User = require('../../src/models/userModel');
const Order = require('../../src/models/orderModel');
const VerificationCode = require('../../src/models/verificationCodeModel');
const { setupDatabase, userOne } = require('./fixtures/db');
const { envModes, authMiddlewaresErrorMessage } = require('../../src/shared/constants');
const cypressFixtures = require('../cypress/db');

let restoreEnv;

const testSeedWhenNotE2ETesting = async (mode) => {
  restoreEnv = mockedEnv({
    MODE: mode,
  });
  const { body } = await request(app).post('/testing/seed').expect(401);
  expect(body).toEqual({
    message: authMiddlewaresErrorMessage,
  });
};

const testVerifyEmailWhenNotE2ETesting = async (mode) => {
  restoreEnv = mockedEnv({
    MODE: mode,
  });
  const { body } = await request(app).post('/testing/seed').expect(401);
  expect(body).toEqual({
    message: authMiddlewaresErrorMessage,
  });
};

beforeEach(setupDatabase);

beforeEach(() => {
  restoreEnv = mockedEnv({
    MODE: envModes.E2E_TESTING,
  });
});

afterEach(() => {
  restoreEnv();
});

describe('POST /testing/seed', () => {
  test('should seed database', async () => {
    await request(app).post('/testing/seed').expect(200);

    const users = await User.find().lean();
    expect(users).toEqual([
      {
        ...cypressFixtures.userOne,
        password: users[0].password,
        createdAt: users[0].createdAt,
      },
    ]);

    const products = await Product.find().lean();
    expect(products).toEqual([
      {
        ...cypressFixtures.productOne,
        createdAt: products[0].createdAt,
        updatedAt: products[0].updatedAt,
      },
    ]);

    const orders = await Order.find().lean();
    expect(orders).toHaveLength(0);

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });

  test('should get 401 if environment mode is PRODUCTION', async () => {
    await testSeedWhenNotE2ETesting(envModes.PRODUCTION);
  });

  test('should get 401 if environment mode is DEVELOPMENT', async () => {
    await testSeedWhenNotE2ETesting(envModes.DEVELOPMENT);
  });

  test('should get 401 if environment mode is UNIT_TESTING', async () => {
    await testSeedWhenNotE2ETesting(envModes.UNIT_TESTING);
  });
});

describe('POST /testing/verify-email', () => {
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
      .patch('/testing/verify-email')
      .send({
        email: userOne.email,
      })
      .expect(200);

    const user = await User.findOne({ email: newEmail });
    expect(user).not.toBeNull();

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });

  test('should get 401 if environment mode is PRODUCTION', async () => {
    await testVerifyEmailWhenNotE2ETesting(envModes.PRODUCTION);
  });

  test('should get 401 if environment mode is DEVELOPMENT', async () => {
    await testVerifyEmailWhenNotE2ETesting(envModes.DEVELOPMENT);
  });

  test('should get 401 if environment mode is UNIT_TESTING', async () => {
    await testVerifyEmailWhenNotE2ETesting(envModes.UNIT_TESTING);
  });
});
