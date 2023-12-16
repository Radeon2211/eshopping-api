const request = require('supertest');
const mongoose = require('mongoose');
const mockedEnv = require('mocked-env');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const bcrypt = require('bcrypt');
const validateUUID = require('uuid-validate');
const app = require('../../src/app');
const User = require('../../src/models/userModel');
const Product = require('../../src/models/productModel');
const VerificationCode = require('../../src/models/verificationCodeModel');
const {
  userOne,
  userTwo,
  userThree,
  userFour,
  productOne,
  productTwo,
  productFour,
  setupDatabase,
} = require('./fixtures/db');
const { getFullUser, agendaRemoveExpiredUser } = require('../../src/shared/utility');
const {
  verificationCodeTypes,
  userStatuses,
  authMiddlewaresErrorMessage,
  envModes,
} = require('../../src/shared/constants');

beforeEach(setupDatabase);

const newUserData = {
  firstName: 'John',
  lastName: 'Smith',
  username: 'jsmith',
  email: 'jsmith@domain.com',
  password: 'Pa$$w0rd',
  street: 'Szkolna 17',
  zipCode: '15-950',
  city: 'Białystok',
  country: 'Poland',
  phone: '+48 123459876',
  contacts: {
    email: true,
    phone: false,
  },
};

describe('POST /users', () => {
  test('should get 409 if user with given email exist', async () => {
    const { body } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.1')
      .send({
        ...newUserData,
        email: userOne.email,
      })
      .expect(409);

    expect(body).toEqual({
      message: 'Email address is already taken',
    });
  });

  test('should get 409 if user with given username exist', async () => {
    const { body } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.1')
      .send({
        ...newUserData,
        username: userOne.username,
      })
      .expect(409);

    expect(body).toEqual({
      message: 'Username is already taken',
    });
  });

  test('should signup a new user and create verification code', async () => {
    const dateBefore = moment();
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.1')
      .send(newUserData)
      .expect(201);
    const dateAfter = moment();

    const newUser = await User.findById(user._id).lean();
    expect(newUser).not.toBeNull();

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toEqual([
      {
        _id: verificationCodes[0]._id,
        email: 'jsmith@domain.com',
        code: verificationCodes[0].code,
        type: verificationCodeTypes.ACCOUNT_ACTIVATION,
        expireAt: verificationCodes[0].expireAt,
      },
    ]);
    expect(validateUUID(verificationCodes[0].code, 4)).toEqual(true);

    const isPasswordCorrect = await bcrypt.compare(newUserData.password, newUser.password);
    expect(isPasswordCorrect).toEqual(true);
    expect(user.password).not.toEqual('Pa$$w0rd');

    expect(user).toEqual({
      ...newUserData,
      _id: newUser._id.toJSON(),
      password: undefined,
      cart: [],
      status: userStatuses.PENDING,
      createdAt: user.createdAt,
    });
    expect(user.createdAt).toBeDefined();
    expect(
      moment(user.createdAt).isBetween(
        dateBefore.subtract(1, 'minute'),
        dateAfter.add(1, 'minute'),
      ),
    ).toEqual(true);
  });

  test('should signup a new user without isAdmin, empty cart, 1 token, createdAt with current time', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.2')
      .send({
        ...newUserData,
        isAdmin: true,
        cart: userOne.cart,
        tokens: userOne.tokens,
        createdAt: '2020-11-11T11:11:11.911Z',
      })
      .expect(201);

    const newUser = await User.findById(user._id).lean();

    expect(newUser.tokens).toHaveLength(1);

    expect(user).toEqual({
      ...newUserData,
      _id: newUser._id.toJSON(),
      password: undefined,
      isAdmin: undefined,
      tokens: undefined,
      cart: [],
      status: userStatuses.PENDING,
      createdAt: user.createdAt,
    });
    expect(user.createdAt).not.toEqual('2020-11-11T11:11:11.911Z');
  });

  test('should NOT signup user with invalid username', async () => {
    await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.3')
      .send({
        ...newUserData,
        username: 'j',
      })
      .expect(400);
  });

  test('should NOT signup user with invalid email', async () => {
    await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.4')
      .send({
        ...newUserData,
        email: 'johnsmith',
      })
      .expect(400);
  });

  test('should NOT signup user with invalid password', async () => {
    await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.5')
      .send({
        ...newUserData,
        password: 'pass',
      })
      .expect(400);
  });

  test('should NOT signup user without contacts', async () => {
    await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.6')
      .send({
        ...newUserData,
        contacts: undefined,
      })
      .expect(400);
  });

  test('should NOT signup user with incomplete contacts', async () => {
    await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.7')
      .send({
        ...newUserData,
        contacts: {
          email: true,
        },
      })
      .expect(400);
  });
});

describe('POST /users/login', () => {
  let restoreEnv;

  beforeEach(() => {
    if (restoreEnv) restoreEnv();
  });

  test('should get correct cookies after successful login when environment is PRODUCTION', async () => {
    restoreEnv = mockedEnv({
      MODE: envModes.PRODUCTION,
    });

    const { headers } = await request(app)
      .post('/users/login')
      .send({
        email: userOne.email,
        password: userOne.password,
      })
      .expect(200);

    const setCookieItem = headers['set-cookie'][0];
    const jwtToken = setCookieItem.split(';')[0].split('=')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    expect(decoded?._id).not.toBeUndefined();
    expect(setCookieItem.includes('HttpOnly')).toEqual(true);
    expect(setCookieItem.includes('Secure')).toEqual(true);
    expect(setCookieItem.includes('SameSite')).toEqual(true);
  });

  test('should get correct cookies after successful login when environment is other than PRODUCTION', async () => {
    const { headers } = await request(app)
      .post('/users/login')
      .send({
        email: userOne.email,
        password: userOne.password,
      })
      .expect(200);

    const setCookieItem = headers['set-cookie'][0];
    const jwtToken = setCookieItem.split(';')[0].split('=')[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    expect(decoded?._id).not.toBeUndefined();
    expect(setCookieItem.includes('HttpOnly')).toEqual(true);
    expect(setCookieItem.includes('Secure')).toEqual(false);
    expect(setCookieItem.includes('SameSite')).toEqual(false);
  });

  test('should get isDifferent false and full user', async () => {
    const {
      body: { user, isDifferent },
    } = await request(app)
      .post('/users/login')
      .send({
        email: userOne.email,
        password: userOne.password,
      })
      .expect(200);

    const {
      body: { user: fullUser },
    } = await request(app)
      .get('/users/me')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const leanUser = await User.findById(userOne._id).lean();
    expect(leanUser.tokens).toHaveLength(userOne.tokens.length + 1);

    expect(isDifferent).toEqual(false);
    expect(user.cart).toEqual(fullUser.cart);
  });

  test('should get isDifferent true and user with cart length 1 if product of second cart item is deleted before', async () => {
    await request(app)
      .delete(`/products/${productFour._id}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    const {
      body: { user, isDifferent },
    } = await request(app)
      .post('/users/login')
      .send({
        email: userOne.email,
        password: userOne.password,
      })
      .expect(200);

    const {
      body: { user: fullUser },
    } = await request(app)
      .get('/users/me')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(true);
    expect(user.cart).toEqual([fullUser.cart[0]]);
  });

  test('should NOT login with non existing email', async () => {
    const { body } = await request(app)
      .post('/users/login')
      .send({
        email: 'incorrect@domain.com',
        password: 'Pa$$w0rd',
      })
      .expect(400);

    expect(body).toEqual({
      message: 'You entered incorrect credentials',
    });
  });

  test('should NOT login with incorrect password', async () => {
    const { body } = await request(app)
      .post('/users/login')
      .send({
        email: userOne.email,
        password: 'incorrectPassword',
      })
      .expect(400);

    expect(body).toEqual({
      message: 'You entered incorrect credentials',
    });
  });
});

describe('POST /users/logout', () => {
  test('should logout user and update tokens field', async () => {
    await request(app)
      .post('/users/logout')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const user = await User.findById(userOne._id).lean();
    expect(user.tokens).toEqual([]);
  });

  test('should get 401 if user is unauthenticated', async () => {
    const { body } = await request(app).post('/users/logout').expect(401);
    expect(body).toEqual({
      message: authMiddlewaresErrorMessage,
    });
  });
});

describe('POST /users/send-account-verification-email', () => {
  test('should create verification code to freshly created user', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.8')
      .send(newUserData)
      .expect(201);

    const newUser = await User.findById(user._id).lean();

    await request(app)
      .post('/users/send-account-verification-email')
      .set('Cookie', [`token=${newUser.tokens[0].token}`])
      .expect(200);

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toEqual([
      {
        _id: verificationCodes[0]._id,
        email: 'jsmith@domain.com',
        code: verificationCodes[0].code,
        type: verificationCodeTypes.ACCOUNT_ACTIVATION,
        expireAt: verificationCodes[0].expireAt,
      },
      {
        _id: verificationCodes[1]._id,
        email: 'jsmith@domain.com',
        code: verificationCodes[1].code,
        type: verificationCodeTypes.ACCOUNT_ACTIVATION,
        expireAt: verificationCodes[1].expireAt,
      },
    ]);
    expect(validateUUID(verificationCodes[0].code, 4)).toEqual(true);
    expect(validateUUID(verificationCodes[1].code, 4)).toEqual(true);
  });

  test('should NOT create verification code if user already has status active', async () => {
    const { body } = await request(app)
      .post('/users/send-account-verification-email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(400);

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);

    expect(body).toEqual({
      message: 'Your account is already active',
    });
  });

  test('should get 401 if user is unauthenticated', async () => {
    const { body } = await request(app).post('/users/send-account-verification-email').expect(401);
    expect(body).toEqual({
      message: authMiddlewaresErrorMessage,
    });
  });
});

describe('GET /users/:id/verify-account/:code', () => {
  test('should verify account of freshly created user', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.9')
      .send(newUserData)
      .expect(201);

    const verificationCode = await VerificationCode.findOne({ email: user.email }).lean();

    await request(app)
      .get(`/users/${user._id}/verify-account/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.9')
      .expect(302)
      .expect('Location', process.env.FRONTEND_URL);

    const newUser = await User.findById(user._id).lean();
    expect(newUser.status).toEqual(userStatuses.ACTIVE);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });

  test('should NOT verify account of freshly created user if type of verification code is incorrect', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.10')
      .send(newUserData)
      .expect(201);

    await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.10')
      .send({ email: user.email })
      .expect(200);

    const verificationCode = await VerificationCode.find({ email: user.email }).lean();

    await request(app)
      .get(`/users/${user._id}/verify-account/${verificationCode[1].code}`)
      .set('X-Forwarded-For', '192.168.2.10')
      .expect(400);

    const newUser = await User.findById(user._id).lean();
    expect(newUser.status).toEqual(userStatuses.PENDING);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(2);
  });

  test('should NOT verify account if verification code is incorrect', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.11')
      .send(newUserData)
      .expect(201);

    const { body } = await request(app)
      .get(`/users/${user._id}/verify-account/incorrectCode`)
      .set('X-Forwarded-For', '192.168.2.11')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or your account already does not exist',
    });

    const newUser = await User.findById(user._id).lean();
    expect(newUser.status).toEqual(userStatuses.PENDING);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(1);
  });

  test(`should NOT verify account if passed user id does not match to user's id whose email is in verification code record`, async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.12')
      .send(newUserData)
      .expect(201);

    const verificationCode = await VerificationCode.findOne({ email: user.email }).lean();

    const { body } = await request(app)
      .get(`/users/${new mongoose.Types.ObjectId()}/verify-account/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.12')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or your account already does not exist',
    });

    const newUser = await User.findById(user._id).lean();
    expect(newUser.status).toEqual(userStatuses.PENDING);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(1);
  });

  test('should NOT verify account if user does not exist', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.13')
      .send(newUserData)
      .expect(201);

    const newUserBefore = await User.findById(user._id).lean();

    const verificationCode = await VerificationCode.findOne({ email: user.email }).lean();

    await request(app)
      .delete('/users/me')
      .set('Cookie', [`token=${newUserBefore.tokens[0].token}`])
      .send({ currentPassword: newUserData.password })
      .expect(200);

    const { body } = await request(app)
      .get(`/users/${user._id}/verify-account/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.13')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or your account already does not exist',
    });

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });
});

describe('POST /users/request-for-reset-password', () => {
  test('should create correct verification code', async () => {
    await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.14')
      .send({ email: userOne.email })
      .expect(200);

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toEqual([
      {
        _id: verificationCodes[0]._id,
        email: userOne.email,
        code: verificationCodes[0].code,
        type: verificationCodeTypes.RESET_PASSWORD,
        expireAt: verificationCodes[0].expireAt,
      },
    ]);
    expect(validateUUID(verificationCodes[0].code, 4)).toEqual(true);
  });

  test('should get 404 if given email is not found in database', async () => {
    const { body } = await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.15')
      .send({ email: 'notfound@domain.com' })
      .expect(404);

    expect(body).toEqual({
      message: `We can't find any user with this email`,
    });

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });

  test('should get 400 if invalid email is given', async () => {
    const { body } = await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.16')
      .send({ email: 'incorrectEmail' })
      .expect(400);

    expect(body).toEqual({
      message: `"email" must be a valid email`,
    });

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });

  test('should get 400 if no email is given', async () => {
    const { body } = await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.17')
      .expect(400);

    expect(body).toEqual({
      message: `"email" is required`,
    });

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });
});

describe('GET /users/:id/reset-password/:code', () => {
  test('should reset password', async () => {
    await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.18')
      .send({ email: userOne.email })
      .expect(200);

    const verificationCode = await VerificationCode.findOne({ email: userOne.email }).lean();

    const { body } = await request(app)
      .get(`/users/${userOne._id}/reset-password/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.18')
      .expect(200);

    expect(body).toEqual({
      message: 'New password has been sent successfully. Go back to your inbox',
    });

    const userAfter = await User.findById(userOne._id).lean();
    const isPasswordStillTheSame = await bcrypt.compare(userOne.password, userAfter.password);
    expect(isPasswordStillTheSame).toEqual(false);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });

  test('should NOT reset password if type of verification code is incorrect', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.19')
      .send(newUserData)
      .expect(201);

    await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.19')
      .send({ email: user.email })
      .expect(200);

    const verificationCode = await VerificationCode.find({ email: user.email }).lean();

    await request(app)
      .get(`/users/${user._id}/reset-password/${verificationCode[0].code}`)
      .set('X-Forwarded-For', '192.168.2.19')
      .expect(400);

    const newUser = await User.findById(user._id).lean();
    const isPasswordStillTheSame = await bcrypt.compare(userOne.password, newUser.password);
    expect(isPasswordStillTheSame).toEqual(true);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(2);
  });

  test('should NOT reset password if verification code is incorrect', async () => {
    await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.20')
      .send({ email: userOne.email })
      .expect(200);

    const { body } = await request(app)
      .get(`/users/${userOne._id}/reset-password/incorrectCode`)
      .set('X-Forwarded-For', '192.168.2.20')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or account does not exist',
    });

    const userAfter = await User.findById(userOne._id).lean();
    const isPasswordStillTheSame = await bcrypt.compare(userOne.password, userAfter.password);
    expect(isPasswordStillTheSame).toEqual(true);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(1);
  });

  test(`should NOT reset password if passed user id does not match to user's id whose email is in verification code record`, async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.21')
      .send(newUserData)
      .expect(201);

    const verificationCode = await VerificationCode.findOne({ email: user.email }).lean();

    const { body } = await request(app)
      .get(`/users/${new mongoose.Types.ObjectId()}/reset-password/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.21')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or account does not exist',
    });

    const newUser = await User.findById(user._id).lean();
    const isPasswordStillTheSame = await bcrypt.compare(userOne.password, newUser.password);
    expect(isPasswordStillTheSame).toEqual(true);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(1);
  });

  test('should NOT reset password if user does not exist', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.22')
      .send(newUserData)
      .expect(201);

    const newUserBefore = await User.findById(user._id).lean();

    const verificationCode = await VerificationCode.findOne({ email: user.email }).lean();

    await request(app)
      .delete('/users/me')
      .set('Cookie', [`token=${newUserBefore.tokens[0].token}`])
      .send({ currentPassword: newUserData.password })
      .expect(200);

    const { body } = await request(app)
      .get(`/users/${user._id}/reset-password/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.22')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or account does not exist',
    });

    const userAfter = await User.findById(user._id).lean();
    expect(userAfter).toBeNull();

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });
});

describe('GET /users/me', () => {
  test('should get full user and isDifferent false', async () => {
    const {
      body: { user, isDifferent },
    } = await request(app)
      .get('/users/me')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const fullUser = await getFullUser(userOne._id);
    const cartToCompare = [
      {
        ...fullUser.cart[0],
        _id: user.cart[0]._id,
        product: {
          ...fullUser.cart[0].product,
          _id: user.cart[0].product._id,
          updatedAt: user.cart[0].product.updatedAt,
          createdAt: user.cart[0].product.createdAt,
        },
      },
      {
        ...fullUser.cart[1],
        _id: user.cart[1]._id,
        product: {
          ...fullUser.cart[1].product,
          _id: user.cart[1].product._id,
          updatedAt: user.cart[1].product.updatedAt,
          createdAt: user.cart[1].product.createdAt,
        },
      },
    ];

    expect(isDifferent).toEqual(false);
    expect(user).toEqual({
      ...fullUser,
      _id: userOne._id.toJSON(),
      cart: cartToCompare,
      createdAt: user.createdAt,
    });
  });

  test('should get full user with cart length 1, isDifferent true if product of second cart item is deleted before', async () => {
    await request(app)
      .delete(`/products/${productFour._id}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    const {
      body: { user, isDifferent },
    } = await request(app)
      .get('/users/me')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const fullUser = await getFullUser(userOne._id);
    const cartToCompare = [
      {
        ...fullUser.cart[0],
        _id: user.cart[0]._id,
        product: {
          ...fullUser.cart[0].product,
          _id: user.cart[0].product._id,
          updatedAt: user.cart[0].product.updatedAt,
          createdAt: user.cart[0].product.createdAt,
        },
      },
    ];

    expect(isDifferent).toEqual(true);
    expect(user).toEqual({
      ...fullUser,
      _id: userOne._id.toJSON(),
      cart: cartToCompare,
      createdAt: user.createdAt,
    });
  });

  test('should get 401 if user is unauthenticated', async () => {
    const { body } = await request(app).get('/users/me').expect(401);
    expect(body).toEqual({
      message: authMiddlewaresErrorMessage,
    });
  });
});

describe('GET /users/:username', () => {
  test('should get only username of the user', async () => {
    const {
      body: { profile },
    } = await request(app).get(`/users/${userTwo.username}`).expect(200);

    expect(profile).toEqual({
      username: userTwo.username,
    });
  });

  test('should get username, email and phone of the user if user has set contacts to [email, phone]', async () => {
    const {
      body: { profile },
    } = await request(app).get(`/users/${userOne.username}`).expect(200);

    expect(profile).toEqual({
      username: userOne.username,
      email: userOne.email,
      phone: userOne.phone,
    });
  });

  test('should get 404 if user with passed username does not exist', async () => {
    const { body } = await request(app).get('/users/notexist').expect(404);
    expect(body).toEqual({
      message: 'User with given username does not exist',
    });
  });
});

describe('PATCH /users/me', () => {
  describe('Everything expect password', () => {
    test('should update everything what is possible and get full updated user', async () => {
      const updates = {
        firstName: 'firstName',
        lastName: 'lastName',
        phone: '+48 987612345',
        street: 'street',
        zipCode: '77-777',
        city: 'city',
        country: 'country',
        contacts: {
          email: false,
          phone: true,
        },
        password: 'newPassword',
        currentPassword: userOne.password,
      };

      const updatesToCompare = {
        ...updates,
        password: undefined,
        currentPassword: undefined,
      };

      const {
        body: { user },
      } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.50')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send(updates)
        .expect(200);

      expect(user).toEqual({
        _id: userOne._id.toJSON(),
        ...updatesToCompare,
        email: userOne.email,
        username: userOne.username,
        status: userOne.status,
        createdAt: user.createdAt,
        cart: [
          {
            _id: userOne.cart[0]._id.toJSON(),
            quantity: 2,
            product: {
              ...productTwo,
              _id: productTwo._id.toJSON(),
              photo: false,
              seller: {
                username: userTwo.username,
              },
              __v: 0,
              quantitySold: 0,
              buyerQuantity: 0,
              createdAt: user.cart[0].product.createdAt,
              updatedAt: user.cart[0].product.updatedAt,
            },
          },
          {
            _id: userOne.cart[1]._id.toJSON(),
            quantity: 48,
            product: {
              ...productFour,
              _id: productFour._id.toJSON(),
              photo: false,
              seller: {
                username: userThree.username,
              },
              __v: 0,
              quantitySold: 0,
              buyerQuantity: 0,
              createdAt: user.cart[1].product.createdAt,
              updatedAt: user.cart[1].product.updatedAt,
            },
          },
        ],
      });
      expect(user.createdAt).toBeDefined();
    });

    test('should update phone field and get cart length 1 if product of second cart item is deleted before', async () => {
      await request(app)
        .delete(`/products/${productFour._id}`)
        .set('Cookie', [`token=${userThree.tokens[0].token}`])
        .expect(200);

      const newPhone = '+48 987612345';

      const {
        body: { user },
      } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.51')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          phone: newPhone,
        })
        .expect(200);

      expect(user.cart).toHaveLength(1);
      expect(user.cart[0].product._id).toEqual(productTwo._id.toJSON());
    });

    test('should update phone field and get user with updated cart if product of second item changed quantity before', async () => {
      await request(app)
        .patch(`/products/${productFour._id}`)
        .set('Cookie', [`token=${userThree.tokens[0].token}`])
        .send({
          quantity: 40,
        })
        .expect(200);

      const newPhone = '+48 987612345';

      const {
        body: { user },
      } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.53')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          phone: newPhone,
        })
        .expect(200);

      expect(user.cart).toHaveLength(2);
      expect(user.cart[1].quantity).toEqual(40);
    });

    test('should NOT update phone if it has not prefix', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.54')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          phone: '987612345',
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.phone).toEqual(userOne.phone);

      expect(body.errors.phone.message).toEqual('Enter valid phone number');
    });

    test('should NOT update phone if it has too long prefix', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.55')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          phone: '+12345 987612345',
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.phone).toEqual(userOne.phone);

      expect(body.errors.phone.message).toEqual('Enter valid phone number');
    });

    test('should NOT update phone if it has too long phone number (second part)', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.56')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          phone: '+1 1234567891234567',
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.phone).toEqual(userOne.phone);

      expect(body.errors.phone.message).toEqual('Enter valid phone number');
    });

    test('should NOT update phone if it has too short phone number (second part)', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.57')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          phone: '+1234 1234',
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.phone).toEqual(userOne.phone);

      expect(body.errors.phone.message).toEqual('Enter valid phone number');
    });

    test('should NOT update username', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.58')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          username: 'newUsername',
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.username).toEqual(userOne.username);

      expect(body).toEqual({
        message: `You can't change these data`,
      });
    });

    test('should NOT update email', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.59')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          email: 'newemail@domain.com',
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.email).toEqual(userOne.email);

      expect(body).toEqual({
        message: `You can't change these data`,
      });
    });

    test('should NOT update createdAt', async () => {
      const newCreatedAt = '2020-11-11T11:11:11.911Z';

      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.60')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          createdAt: newCreatedAt,
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.createdAt).not.toEqual(newCreatedAt);

      expect(body).toEqual({
        message: `You can't change these data`,
      });
    });

    test('should NOT update isAdmin', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.61')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          isAdmin: true,
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.isAdmin).toBeUndefined();

      expect(body).toEqual({
        message: `You can't change these data`,
      });
    });

    test('should NOT update tokens', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.62')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          tokens: [],
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.tokens).toEqual(userOne.tokens);

      expect(body).toEqual({
        message: `You can't change these data`,
      });
    });

    test('should NOT update cart', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.63')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          cart: [],
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.cart).toEqual(userOne.cart);

      expect(body).toEqual({
        message: `You can't change these data`,
      });
    });

    test('should NOT update status', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.64')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          status: userStatuses.PENDING,
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.status).toEqual(userOne.status);

      expect(body).toEqual({
        message: `You can't change these data`,
      });
    });
  });

  describe('Password', () => {
    test('should update password if currentPassword is correct and new password is different', async () => {
      const newPassword = 'newPassword';

      await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.65')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          currentPassword: userOne.password,
          password: newPassword,
        })
        .expect(200);

      const user = await User.findById(userOne._id).lean();
      const passwordChanged = await bcrypt.compare(newPassword, user.password);
      expect(passwordChanged).toEqual(true);
    });

    test('should NOT update password without current password', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.66')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          password: 'newPassword',
        })
        .expect(400);

      expect(body).toEqual({
        message: 'You must provide current password',
      });
    });

    test('should NOT update password if current password is invalid', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.67')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          currentPassword: 'incorrentPassword',
          password: 'newPassword',
        })
        .expect(400);

      expect(body).toEqual({
        message: 'Current password is incorrect',
      });
    });

    test('should NOT update password if new password is the same as current password', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.68')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          currentPassword: userOne.password,
          password: userOne.password,
        })
        .expect(400);

      expect(body).toEqual({
        message: 'New password is the same as current password',
      });
    });
  });

  describe('User unauthenticated or with status pending', () => {
    test('should get 401 if user has status pending', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('X-Forwarded-For', '192.168.2.69')
        .set('Cookie', [`token=${userFour.tokens[0].token}`])
        .send({
          country: 'Russia',
        })
        .expect(401);

      expect(body).toEqual({
        message: authMiddlewaresErrorMessage,
      });
    });

    test('should get 401 if user is unauthenticated', async () => {
      const { body } = await request(app).get('/users/me').expect(401);
      expect(body).toEqual({
        message: authMiddlewaresErrorMessage,
      });
    });
  });
});

describe('PATCH /users/me/email', () => {
  test('should generate verification code if current password is correct and new email is unique', async () => {
    const newEmail = 'newemail@domain.com';
    await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.23')
      .send({
        currentPassword: userOne.password,
        email: newEmail,
      })
      .expect(200);

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toEqual([
      {
        _id: verificationCodes[0]._id,
        email: userOne.email,
        code: verificationCodes[0].code,
        type: verificationCodeTypes.CHANGE_EMAIL,
        expireAt: verificationCodes[0].expireAt,
        newEmail,
      },
    ]);
    expect(validateUUID(verificationCodes[0].code, 4)).toEqual(true);
  });

  test('should NOT generate verification code if new email is not unique', async () => {
    const { body } = await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.24')
      .send({
        currentPassword: userOne.password,
        email: userTwo.email,
      })
      .expect(409);

    expect(body).toEqual({
      message: 'Given email is already taken',
    });

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });

  test('should NOT generate verification code if new email is the same as current email', async () => {
    const { body } = await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.25')
      .send({
        currentPassword: userOne.password,
        email: userOne.email,
      })
      .expect(400);

    expect(body).toEqual({
      message: 'New email is the same as current email',
    });

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });

  test('should NOT generate verification code if incorrect current password is given', async () => {
    const { body } = await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.26')
      .send({
        currentPassword: 'incorrectPassword',
        email: 'newemail@domain.com',
      })
      .expect(400);

    expect(body).toEqual({
      message: 'Current password is incorrect',
    });

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });

  test('should NOT generate verification code if current password is not given', async () => {
    const { body } = await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.27')
      .send({
        email: 'newemail@domain.com',
      })
      .expect(400);

    expect(body).toEqual({
      message: 'You must provide current password',
    });

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(0);
  });

  describe('User unauthenticated or with status pending', () => {
    test('should get 401 if user has status pending', async () => {
      const { body } = await request(app)
        .patch('/users/me/email')
        .set('Cookie', [`token=${userFour.tokens[0].token}`])
        .set('X-Forwarded-For', '192.168.2.28')
        .send({
          currentPassword: userFour.password,
          email: 'newemail@domain.com',
        })
        .expect(401);

      expect(body).toEqual({
        message: authMiddlewaresErrorMessage,
      });
    });

    test('should get 401 if user is unauthenticated', async () => {
      const { body } = await request(app)
        .patch('/users/me/email')
        .set('X-Forwarded-For', '192.168.2.29')
        .send({
          currentPassword: userOne.password,
          email: 'newemail@domain.com',
        })
        .expect(401);

      expect(body).toEqual({
        message: authMiddlewaresErrorMessage,
      });
    });
  });
});

describe('GET /users/:id/change-email/:code', () => {
  test('should change email', async () => {
    const newEmail = 'newemail@domain.com';
    await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.30')
      .send({
        currentPassword: userOne.password,
        email: newEmail,
      })
      .expect(200);

    const verificationCode = await VerificationCode.findOne({ email: userOne.email }).lean();

    await request(app)
      .get(`/users/${userOne._id}/change-email/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.30')
      .expect(302)
      .expect('Location', process.env.FRONTEND_URL);

    const userAfter = await User.findById(userOne._id).lean();
    expect(userAfter.email).toEqual(newEmail);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });

  test('should NOT change email if verification code is incorrect', async () => {
    await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.31')
      .send({
        currentPassword: userOne.password,
        email: 'newemail@domain.com',
      })
      .expect(200);

    const { body } = await request(app)
      .get(`/users/${userOne._id}/change-email/incorrectCode`)
      .set('X-Forwarded-For', '192.168.2.31')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or account does not exist',
    });

    const userAfter = await User.findById(userOne._id).lean();
    expect(userAfter.email).toEqual(userOne.email);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(1);
  });

  test('should NOT change email if type of verification code is incorrect', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.32')
      .send(newUserData)
      .expect(201);

    await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.2.32')
      .send({ email: user.email })
      .expect(200);

    const verificationCode = await VerificationCode.find({ email: user.email }).lean();

    await request(app)
      .get(`/users/${user._id}/change-email/${verificationCode[0].code}`)
      .set('X-Forwarded-For', '192.168.2.32')
      .expect(400);

    const newUser = await User.findById(user._id).lean();
    expect(newUser.email).toEqual(user.email);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(2);
  });

  test(`should NOT change email if passed user id does not match to user's id whose email is in verification code record`, async () => {
    await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.33')
      .send({
        currentPassword: userOne.password,
        email: 'newemail@domain.com',
      })
      .expect(200);

    const verificationCode = await VerificationCode.findOne({ email: userOne.email }).lean();

    const { body } = await request(app)
      .get(`/users/${new mongoose.Types.ObjectId()}/reset-password/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.33')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or account does not exist',
    });

    const userAfter = await User.findById(userOne).lean();
    expect(userAfter.email).toEqual(userOne.email);

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(1);
  });

  test('should NOT change email if user does not exist', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.34')
      .send(newUserData)
      .expect(201);

    const newUserBefore = await User.findById(user._id).lean();

    const verificationCode = await VerificationCode.findOne({ email: user.email }).lean();

    await request(app)
      .delete('/users/me')
      .set('Cookie', [`token=${newUserBefore.tokens[0].token}`])
      .send({ currentPassword: newUserData.password })
      .expect(200);

    await request(app)
      .patch('/users/me/email')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.2.34')
      .send({
        currentPassword: userOne.password,
        email: 'newemail@domain.com',
      })
      .expect(200);

    const { body } = await request(app)
      .get(`/users/${user._id}/change-email/${verificationCode.code}`)
      .set('X-Forwarded-For', '192.168.2.34')
      .expect(400);

    expect(body).toEqual({
      message:
        'Verification link has been expired or you are not allowed to perform this action or account does not exist',
    });

    const userAfter = await User.findById(user._id).lean();
    expect(userAfter).toBeNull();
  });
});

describe('PATCH /users/add-admin', () => {
  test('should admin make other user admin', async () => {
    await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(200);

    const user = await User.findById(userOne._id).lean();
    expect(user.isAdmin).toEqual(true);
  });

  test('should NOT non admin make other user admin', async () => {
    const { body } = await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(403);

    const user = await User.findById(userOne._id).lean();
    expect(user.isAdmin).toBeUndefined();

    expect(body).toEqual({
      message: 'You are not allowed to do that',
    });
  });

  test('should get 404 if user with given email does not exist', async () => {
    const { body } = await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: 'nonexisting@email.com' })
      .expect(404);

    expect(body).toEqual({
      message: 'User with given email does not exist',
    });
  });

  test('should get 400 if user is trying to make himself an admin', async () => {
    const { body } = await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userThree.email })
      .expect(400);

    expect(body).toEqual({
      message: 'You are already an admin',
    });
  });

  test('should get 400 when trying to make user with status pending an admin', async () => {
    const { body } = await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userFour.email })
      .expect(400);

    expect(body).toEqual({
      message: 'This user has not activated the account yet',
    });
  });

  test('should get 400 if user with given email is already an admin', async () => {
    await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userTwo.email })
      .expect(200);

    const { body } = await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .send({ email: userThree.email })
      .expect(400);

    expect(body).toEqual({
      message: 'This user is already an admin',
    });
  });

  test('should get 401 if user has status pending', async () => {
    const { body } = await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .expect(401);

    expect(body).toEqual({
      message: authMiddlewaresErrorMessage,
    });
  });

  test('should get 401 if user is unauthenticated', async () => {
    const { body } = await request(app).patch('/users/add-admin').expect(401);
    expect(body).toEqual({
      message: authMiddlewaresErrorMessage,
    });
  });
});

describe('PATCH /users/remove-admin', () => {
  test('should admin remove other admin', async () => {
    await request(app)
      .patch('/users/add-admin')
      .set('X-Forwarded-For', '192.168.2.100')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(200);

    await request(app)
      .patch('/users/remove-admin')
      .set('X-Forwarded-For', '192.168.2.100')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(200);

    const user = await User.findById(userOne._id).lean();
    expect(user.isAdmin).toBeUndefined();
  });

  test('should NOT non admin remove other admin', async () => {
    const { body } = await request(app)
      .patch('/users/remove-admin')
      .set('X-Forwarded-For', '192.168.2.101')
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .send({ email: userThree.email })
      .expect(403);

    const user = await User.findById(userThree._id).lean();
    expect(user.isAdmin).toEqual(true);

    expect(body).toEqual({
      message: 'You are not allowed to do that',
    });
  });

  test('should get 404 if user with given email does not exist', async () => {
    const { body } = await request(app)
      .patch('/users/remove-admin')
      .set('X-Forwarded-For', '192.168.2.102')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: 'nonexisting@email.com' })
      .expect(404);

    expect(body).toEqual({
      message: 'User with given email does not exist',
    });
  });

  test('should get 400 if user with given email is already not an admin', async () => {
    const { body } = await request(app)
      .patch('/users/remove-admin')
      .set('X-Forwarded-For', '192.168.2.103')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(400);

    expect(body).toEqual({
      message: 'This user is not an admin so the action is not needed',
    });
  });

  test('should get 401 if user has status pending', async () => {
    const { body } = await request(app)
      .patch('/users/add-admin')
      .set('X-Forwarded-For', '192.168.2.104')
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .expect(401);

    expect(body).toEqual({
      message: authMiddlewaresErrorMessage,
    });
  });

  test('should get 401 if user is unauthenticated', async () => {
    const { body } = await request(app)
      .patch('/users/remove-admin')
      .set('X-Forwarded-For', '192.168.2.105')
      .expect(401);
    expect(body).toEqual({
      message: authMiddlewaresErrorMessage,
    });
  });
});

describe('DELETE /users/me', () => {
  test('should delete user profile and its products', async () => {
    await request(app)
      .delete('/users/me')
      .set('X-Forwarded-For', '192.168.2.120')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ currentPassword: userOne.password })
      .expect(200);

    const user = await User.findById(userOne._id).lean();
    const prodOne = await Product.findById(productOne._id).lean();
    const products = await Product.find().lean();

    expect(user).toBeNull();
    expect(prodOne).toBeNull();
    expect(products).toHaveLength(3);
  });

  test('should delete user profile and its verification code if user is freshly created', async () => {
    const {
      body: { user },
    } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.35')
      .send(newUserData)
      .expect(201);

    const newUserBefore = await User.findById(user._id).lean();

    const verificationCodesBefore = await VerificationCode.find().lean();
    expect(verificationCodesBefore).toHaveLength(1);

    await request(app)
      .delete('/users/me')
      .set('X-Forwarded-For', '192.168.2.121')
      .set('Cookie', [`token=${newUserBefore.tokens[0].token}`])
      .send({ currentPassword: newUserData.password })
      .expect(200);

    const newUserAfter = await User.findById(newUserBefore._id).lean();
    expect(newUserAfter).toBeNull();

    const verificationCodesAfter = await VerificationCode.find().lean();
    expect(verificationCodesAfter).toHaveLength(0);
  });

  test('should NOT delete user profile if currentPassword is incorrect', async () => {
    const { body } = await request(app)
      .delete('/users/me')
      .set('X-Forwarded-For', '192.168.2.122')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ currentPassword: 'incorrectPassword' })
      .expect(400);

    const user = await User.findById(userOne._id).lean();
    expect(user).not.toBeNull();

    expect(body).toEqual({
      message: 'Current password is incorrect',
    });
  });

  test('should NOT delete user profile without currentPassword', async () => {
    const { body } = await request(app)
      .delete('/users/me')
      .set('X-Forwarded-For', '192.168.2.123')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(400);

    const user = await User.findById(userOne._id).lean();
    expect(user).not.toBeNull();

    expect(body).toEqual({
      message: 'You must provide current password',
    });
  });

  test('should get 401 if user is unauthenticated', async () => {
    const { body } = await request(app)
      .delete('/users/me')
      .set('X-Forwarded-For', '192.168.2.124')
      .expect(401);
    expect(body).toEqual({
      message: authMiddlewaresErrorMessage,
    });
  });
});

describe('generateVerificationCode()', () => {
  test('should create correct verification code return correct verification link (type ACCOUNT_ACTIVATION)', async () => {
    const user = await User.findById(userOne._id);
    const verificationLink = await user.generateVerificationCode(
      verificationCodeTypes.ACCOUNT_ACTIVATION,
    );

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(1);
    expect(verificationCodes).toEqual([
      {
        _id: verificationCodes[0]._id,
        email: userOne.email,
        code: verificationCodes[0].code,
        type: verificationCodeTypes.ACCOUNT_ACTIVATION,
        expireAt: verificationCodes[0].expireAt,
      },
    ]);
    expect(validateUUID(verificationCodes[0].code, 4)).toEqual(true);

    expect(verificationLink).toEqual(
      `${process.env.API_URL}/users/${user._id}/verify-account/${verificationCodes[0].code}`,
    );
  });

  test('should create correct verification code return correct verification link (type RESET_PASSWORD)', async () => {
    const user = await User.findById(userOne._id);
    const verificationLink = await user.generateVerificationCode(
      verificationCodeTypes.RESET_PASSWORD,
    );

    const verificationCodes = await VerificationCode.find().lean();
    expect(verificationCodes).toHaveLength(1);
    expect(verificationCodes).toEqual([
      {
        _id: verificationCodes[0]._id,
        email: userOne.email,
        code: verificationCodes[0].code,
        type: verificationCodeTypes.RESET_PASSWORD,
        expireAt: verificationCodes[0].expireAt,
      },
    ]);
    expect(validateUUID(verificationCodes[0].code, 4)).toEqual(true);

    expect(verificationLink).toEqual(
      `${process.env.API_URL}/users/${user._id}/reset-password/${verificationCodes[0].code}`,
    );
  });
});

describe('Agenda - remove expired users', () => {
  test('should delete users with status pending and createdAt at least 1 hour earlier', async () => {
    const response1 = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.36')
      .send({
        ...newUserData,
        username: 'jsmith1',
        email: 'jsmith1@domain.com',
      })
      .expect(201);

    const response2 = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.2.36')
      .send({
        ...newUserData,
        username: 'jsmith2',
        email: 'jsmith2@domain.com',
      })
      .expect(201);

    const hourAgoDate = moment().subtract(1, 'hour').toDate();
    await User.findOneAndUpdate({ _id: response1.body.user._id }, { createdAt: hourAgoDate });
    await User.findOneAndUpdate({ _id: response2.body.user._id }, { createdAt: hourAgoDate });

    await agendaRemoveExpiredUser();

    const users = await User.find().lean();
    expect(users).toHaveLength(4);

    const user1 = await User.findById(response1.body.user._id).lean();
    const user2 = await User.findById(response2.body.user._id).lean();

    expect(user1).toBeNull();
    expect(user2).toBeNull();
  });
});
