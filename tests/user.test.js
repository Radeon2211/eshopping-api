const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const User = require('../src/models/userModel');
const Product = require('../src/models/productModel');
const {
  userOne,
  userTwo,
  userThree,
  productOne,
  productTwo,
  productFour,
  setupDatabase,
} = require('./fixtures/db');
const { getFullUser } = require('../src/shared/utility');

beforeEach(setupDatabase);

describe('POST /users', () => {
  test('Should signup a new user', async () => {
    const data = {
      firstName: 'John',
      lastName: 'Smith',
      username: 'jsmith',
      email: 'jsmith@domain.com',
      password: 'Pa$$w0rd',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
      contacts: {
        email: true,
        phone: false,
      },
    };

    const {
      body: { user },
    } = await request(app).post('/users').send(data).expect(201);

    const newUser = await User.findById(user._id).lean();
    expect(newUser).not.toBeNull();

    const isPasswordCorrect = await bcrypt.compare(data.password, newUser.password);
    expect(isPasswordCorrect).toEqual(true);
    expect(user.password).not.toEqual('Pa$$w0rd');

    expect(user).toEqual({
      ...data,
      password: undefined,
      _id: newUser._id.toJSON(),
      firstName: 'John',
      lastName: 'Smith',
      username: 'jsmith',
      email: 'jsmith@domain.com',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
      cart: [],
      contacts: {
        email: true,
        phone: false,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  test('Should signup a new user without isAdmin, empty cart, 1 token, createdAt and updatedAt with current time', async () => {
    const data = {
      firstName: 'John',
      lastName: 'Smith',
      username: 'jsmith',
      email: 'jsmith@domain.com',
      password: 'Pa$$w0rd',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
      isAdmin: true,
      cart: userOne.cart,
      tokens: userOne.tokens,
      createdAt: '2020-11-11T11:11:11.911Z',
      updatedAt: '2020-11-11T11:11:11.911Z',
      contacts: {
        email: true,
        phone: false,
      },
    };

    const {
      body: { user },
    } = await request(app).post('/users').send(data).expect(201);

    const newUser = await User.findById(user._id).lean();

    expect(newUser.tokens).toHaveLength(1);

    expect(user).toEqual({
      ...data,
      password: undefined,
      _id: newUser._id.toJSON(),
      firstName: 'John',
      lastName: 'Smith',
      username: 'jsmith',
      email: 'jsmith@domain.com',
      street: 'Szkolna 17',
      zipCode: '15-950',
      city: 'Białystok',
      country: 'Poland',
      phone: '123459876',
      isAdmin: undefined,
      tokens: undefined,
      cart: [],
      contacts: {
        email: true,
        phone: false,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    expect(user.createdAt).not.toEqual('2020-11-11T11:11:11.911Z');
    expect(user.updatedAt).not.toEqual('2020-11-11T11:11:11.911Z');
  });

  test('Should NOT signup user with invalid username', async () => {
    await request(app)
      .post('/users')
      .send({
        firstName: 'John',
        lastName: 'Smith',
        username: 'j',
        email: 'jsmith@domain.com',
        password: 'Pa$$w0rd',
        street: 'Szkolna 17',
        zipCode: '15-950',
        city: 'Białystok',
        country: 'Poland',
        phone: '123459876',
        contacts: {
          email: true,
          phone: false,
        },
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
        contacts: {
          email: true,
          phone: false,
        },
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
        email: 'jsmith@domain.com',
        password: 'pass',
        street: 'Szkolna 17',
        zipCode: '15-950',
        city: 'Białystok',
        country: 'Poland',
        phone: '123459876',
        contacts: {
          email: true,
          phone: false,
        },
      })
      .expect(400);
  });

  test('Should NOT signup user without contacts', async () => {
    await request(app)
      .post('/users')
      .send({
        firstName: 'John',
        lastName: 'Smith',
        username: 'johnsmith',
        email: 'jsmith@domain.com',
        password: 'pass',
        street: 'Szkolna 17',
        zipCode: '15-950',
        city: 'Białystok',
        country: 'Poland',
        phone: '123459876',
      })
      .expect(400);
  });

  test('Should NOT signup user with incomplete contacts', async () => {
    await request(app)
      .post('/users')
      .send({
        firstName: 'John',
        lastName: 'Smith',
        username: 'johnsmith',
        email: 'jsmith@domain.com',
        password: 'pass',
        street: 'Szkolna 17',
        zipCode: '15-950',
        city: 'Białystok',
        country: 'Poland',
        phone: '123459876',
        contacts: {
          email: true,
        },
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

  test('Should NOT login with non existing email', async () => {
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

  test('Should NOT login with incorrect password', async () => {
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
  test('Should logout user and update tokens field', async () => {
    await request(app)
      .post('/users/logout')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const user = await User.findById(userOne._id).lean();
    expect(user.tokens).toEqual([]);
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

describe('PATCH /users/me', () => {
  describe('Everything expect password and email', () => {
    test('Should update everything what is possible and get full updated user', async () => {
      const updates = {
        firstName: 'firstName',
        lastName: 'lastName',
        phone: '987612345',
        street: 'street',
        zipCode: '77-777',
        city: 'city',
        country: 'country',
        contacts: {
          email: false,
          phone: true,
        },
        email: 'newemail@domain.com',
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
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send(updates)
        .expect(200);

      expect(user).toEqual({
        _id: userOne._id.toJSON(),
        username: userOne.username,
        ...updatesToCompare,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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
      expect(user.updatedAt).toBeDefined();
    });

    test('Should update phone field and get cart length 1 if product of second cart item is deleted before', async () => {
      await request(app)
        .delete(`/products/${productFour._id}`)
        .set('Cookie', [`token=${userThree.tokens[0].token}`])
        .expect(200);

      const newPhone = '987612345';

      const {
        body: { user },
      } = await request(app)
        .patch('/users/me')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          phone: newPhone,
        })
        .expect(200);

      expect(user.cart).toHaveLength(1);
      expect(user.cart[0].product._id).toEqual(productTwo._id.toJSON());
    });

    test('Should update phone field and get user with updated cart if product of second item changed quantity before', async () => {
      await request(app)
        .patch(`/products/${productFour._id}`)
        .set('Cookie', [`token=${userThree.tokens[0].token}`])
        .send({
          quantity: 40,
        })
        .expect(200);

      const newPhone = '987612345';

      const {
        body: { user },
      } = await request(app)
        .patch('/users/me')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          phone: newPhone,
        })
        .expect(200);

      expect(user.cart).toHaveLength(2);
      expect(user.cart[1].quantity).toEqual(40);
    });

    test('Should NOT update username', async () => {
      const { body } = await request(app)
        .patch('/users/me')
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

    test('Should NOT update createdAt', async () => {
      const newCreatedAt = '2020-11-11T11:11:11.911Z';

      const { body } = await request(app)
        .patch('/users/me')
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

    test('Should NOT update updatedAt', async () => {
      const newUpdatedAt = '2020-11-11T11:11:11.911Z';

      const { body } = await request(app)
        .patch('/users/me')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          updatedAt: newUpdatedAt,
        })
        .expect(400);

      const user = await User.findById(userOne._id).lean();
      expect(user.updatedAt).not.toEqual(newUpdatedAt);

      expect(body).toEqual({
        message: `You can't change these data`,
      });
    });

    test('Should NOT update isAdmin', async () => {
      const { body } = await request(app)
        .patch('/users/me')
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

    test('Should NOT update tokens', async () => {
      const { body } = await request(app)
        .patch('/users/me')
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

    test('Should NOT update cart', async () => {
      const { body } = await request(app)
        .patch('/users/me')
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

    test('Should get 401 if user is unauthenticated', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .send({
          country: 'Russia',
        })
        .expect(401);

      expect(body).toEqual({
        message: 'Please login',
      });
    });
  });

  describe('Password and email', () => {
    test('Should update password if currentPassword is correct and new password is different', async () => {
      const newPassword = 'newPassword';

      await request(app)
        .patch('/users/me')
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

    test('Should NOT update password without current password', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          password: 'newPassword',
        })
        .expect(400);

      expect(body).toEqual({
        message: 'You must provide current password',
      });
    });

    test('Should NOT update email without current password', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          email: 'newemail@domain.com',
        })
        .expect(400);

      expect(body).toEqual({
        message: 'You must provide current password',
      });
    });

    test('Should NOT update password if current password is invalid', async () => {
      const { body } = await request(app)
        .patch('/users/me')
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

    test('Should NOT update email if current password is invalid', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          currentPassword: 'incorrentPassword',
          email: 'newemail@domain.com',
        })
        .expect(400);

      expect(body).toEqual({
        message: 'Current password is incorrect',
      });
    });

    test('Should NOT update password if new password is the same as current password', async () => {
      const { body } = await request(app)
        .patch('/users/me')
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

    test('Should NOT update email if new email is the same as current email', async () => {
      const { body } = await request(app)
        .patch('/users/me')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({
          currentPassword: userOne.password,
          email: userOne.email,
        })
        .expect(400);

      expect(body).toEqual({
        message: 'New email is the same as current email',
      });
    });
  });
});

describe('PATCH /users/add-admin', () => {
  test('Should admin make other user admin', async () => {
    await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(200);

    const user = await User.findById(userOne._id).lean();
    expect(user.isAdmin).toEqual(true);
  });

  test('Should NOT non admin update other user to admin', async () => {
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

  test('Should get 401 if user is unauthenticated', async () => {
    await request(app).patch('/users/add-admin').expect(401);
  });
});

describe('PATCH /users/remove-admin', () => {
  test('Should admin remove other admin', async () => {
    await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(200);

    await request(app)
      .patch('/users/remove-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(200);

    const user = await User.findById(userOne._id).lean();
    expect(user.isAdmin).toBeUndefined();
  });

  test('Should NOT non admin remove other admin', async () => {
    await request(app)
      .patch('/users/add-admin')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(200);

    const { body } = await request(app)
      .patch('/users/remove-admin')
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .send({ email: userOne.email })
      .expect(403);

    const user = await User.findById(userOne._id).lean();
    expect(user.isAdmin).toEqual(true);

    expect(body).toEqual({
      message: 'You are not allowed to do that',
    });
  });

  test('Should get 401 if user is unauthenticated', async () => {
    await request(app).patch('/users/remove-admin').expect(401);
  });
});

describe('DELETE /users/me', () => {
  test('Should delete user profile and his products', async () => {
    await request(app)
      .delete('/users/me')
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

  test('Should NOT delete user profile if currentPassword is incorrect', async () => {
    const { body } = await request(app)
      .delete('/users/me')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ currentPassword: 'incorrectPassword' })
      .expect(400);

    const user = await User.findById(userOne._id).lean();
    expect(user).not.toBeNull();

    expect(body).toEqual({
      message: 'Current password is incorrect',
    });
  });

  test('Should NOT delete user profile without currentPassword', async () => {
    const { body } = await request(app)
      .delete('/users/me')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(400);

    const user = await User.findById(userOne._id).lean();
    expect(user).not.toBeNull();

    expect(body).toEqual({
      message: 'You must provide current password',
    });
  });

  test('Should get 401 if user is unauthenticated', async () => {
    await request(app).delete('/users/me').expect(401);
  });
});
