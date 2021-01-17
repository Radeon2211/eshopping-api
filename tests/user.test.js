const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const User = require('../src/models/userModel');
const { userOne, userTwo, userThree, productFour, setupDatabase } = require('./fixtures/db');
const { getFullUser } = require('../src/shared/utility');

beforeEach(setupDatabase);

describe('POST /users', () => {
  test('Should signup a new user', async () => {
    const newUserData = {
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
    };

    const {
      body: { user },
    } = await request(app).post('/users').send({ data: newUserData }).expect(201);

    const newUser = await User.findById(user._id).lean();
    expect(newUser).not.toBeNull();

    const isPasswordCorrect = await bcrypt.compare(newUserData.password, newUser.password);
    expect(isPasswordCorrect).toEqual(true);
    expect(user.password).not.toEqual('Pa$$w0rd');

    expect(user).toEqual({
      ...newUserData,
      password: undefined,
      _id: newUser._id.toJSON(),
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
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
});

describe('POST /users/login', () => {
  test('Should get isDifferent false and full user', async () => {
    const {
      body: { user, isDifferent },
    } = await request(app)
      .post('/users/login')
      .send({
        data: {
          email: 'user1@wp.pl',
          password: 'Pa$$w0rd',
        },
      })
      .expect(200);

    const {
      body: { user: fullUser },
    } = await request(app)
      .get(`/users/me`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const leanUser = await User.findById(userOne._id).lean();
    expect(leanUser.tokens).toHaveLength(userOne.tokens.length + 1);

    expect(isDifferent).toEqual(false);
    expect(user.cart).toEqual(fullUser.cart);
  });

  test('Should get isDifferent true and user with cart length 1 if product of second cart item is deleted before', async () => {
    await request(app)
      .delete(`/products/${productFour._id}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    const {
      body: { user, isDifferent },
    } = await request(app)
      .post('/users/login')
      .send({
        data: {
          email: 'user1@wp.pl',
          password: 'Pa$$w0rd',
        },
      })
      .expect(200);

    const {
      body: { user: fullUser },
    } = await request(app)
      .get(`/users/me`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(true);
    expect(user.cart).toEqual([fullUser.cart[0]]);
  });

  test('Should NOT login with non existing email', async () => {
    const { body } = await request(app)
      .post('/users/login')
      .send({
        data: {
          email: 'nonexistinguser@wp.pl',
          password: 'Pa$$w0rd',
        },
      })
      .expect(400);

    expect(body).toEqual({
      message: 'You entered incorrect credentials',
    });
  });

  test('Should NOT login with incorrect password', async () => {
    const { body } = await request(app)
      .post('/users/login')
      .send({
        data: {
          email: 'user1@wp.pl',
          password: 'incorrect',
        },
      })
      .expect(400);

    expect(body).toEqual({
      message: 'You entered incorrect credentials',
    });
  });
});

describe('GET /users/me', () => {
  test('Should get full user and isDifferent false', async () => {
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
      updatedAt: user.updatedAt,
    });
  });

  test('Should get full user with cart length 1, isDifferent true if product of second cart item is deleted before', async () => {
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
      updatedAt: user.updatedAt,
    });
  });

  test('Should get 401 if user is unauthenticated', async () => {
    await request(app).get('/users/me').expect(401);
  });
});

describe('GET /users/:username', () => {
  test('Should get only username of the user', async () => {
    const {
      body: { profile },
    } = await request(app).get(`/users/${userTwo.username}`).expect(200);

    expect(profile).toEqual({
      username: userTwo.username,
    });
  });

  test('Should get username, email and phone of the user if user has set contacts to [email, phone]', async () => {
    const {
      body: { profile },
    } = await request(app).get(`/users/${userOne.username}`).expect(200);

    expect(profile).toEqual({
      username: userOne.username,
      email: userOne.email,
      phone: userOne.phone,
    });
  });

  test('Should get 404 if user with passed username does not exist', async () => {
    const { body } = await request(app).get('/users/notexist').expect(404);

    expect(body).toEqual({
      message: 'User with given username does not exist',
    });
  });
});

// ! REFACTOR ALL BELOW
describe('PATCH /users/me', () => {
  test('Should update valid user fields and get cart length 2', async () => {
    await request(app)
      .patch('/users/me')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({
        phone: '987612345',
      })
      .expect(200);
    const user = await User.findById(userOne._id).lean();
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
    const user = await User.findById(userOne._id).lean();
    expect(user.username).toEqual('Konon');
  });

  test('Should get 401 if user is unauthenticated', async () => {
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
});

describe('PATCH /users/add-admin', () => {
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
});

describe('PATCH /users/remove-admin', () => {
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
});

describe('DELETE /users/me', () => {
  test('Should delete user profile', async () => {
    await request(app)
      .delete(`/users/me`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ currentPassword: userOne.password })
      .expect(200);
    const user = await User.findById(userOne._id).lean();
    expect(user).toBeNull();
  });

  test('Should get 401 id user is unauthenticated', async () => {
    await request(app).delete('/users/me').expect(401);
  });
});
