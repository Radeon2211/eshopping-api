const request = require('supertest');
const app = require('../src/app');
const { userOne, userFour, productOne, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

describe('loginLimiter', () => {
  it('Should get 429 after more than 8 unsuccessful requests', async () => {
    for (let i = 0; i < 8; i += 1) {
      await request(app)
        .post('/users/login')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({
          email: userOne.email,
          password: 'incorrectPassword',
        })
        .expect(400);
    }
    const { body } = await request(app)
      .post('/users/login')
      .set('X-Forwarded-For', '192.168.1.1')
      .send({
        email: userOne.email,
        password: 'incorrectPassword',
      })
      .expect(429);

    expect(body).toEqual({
      message: 'Too many failed login attemps, please wait up to 30 minutes',
    });
  });

  it('Should NOT get 429 after more than 8 successful requests', async () => {
    for (let i = 0; i < 10; i += 1) {
      await request(app)
        .post('/users/login')
        .set('X-Forwarded-For', '192.168.1.2')
        .send({
          email: userOne.email,
          password: userOne.password,
        })
        .expect(200);
    }
  });

  it('Should NOT get 429 after 7 unsuccessful and 2 successful request', async () => {
    for (let i = 0; i < 7; i += 1) {
      await request(app)
        .post('/users/login')
        .set('X-Forwarded-For', '192.168.1.3')
        .send({
          email: userOne.email,
          password: 'incorrectPassword',
        })
        .expect(400);
    }
    for (let i = 0; i < 2; i += 1) {
      await request(app)
        .post('/users/login')
        .set('X-Forwarded-For', '192.168.1.3')
        .send({
          email: userOne.email,
          password: userOne.password,
        })
        .expect(200);
    }
  });
});

describe('photoLimiter', () => {
  it('Should get 429 after more than 150 requests', async () => {
    await request(app)
      .post(`/products/${productOne._id}/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .attach('photo', 'tests/fixtures/mushrooms.jpg');

    for (let i = 0; i < 150; i += 1) {
      await request(app)
        .get(`/products/${productOne._id}/photo`)
        .set('X-Forwarded-For', '192.168.1.4')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);
    }
    const { body } = await request(app)
      .get(`/products/${productOne._id}/photo`)
      .set('X-Forwarded-For', '192.168.1.4')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(429);

    expect(body).toEqual({
      message: 'Too many requests, please wait up to 30 seconds',
    });
  });
});

describe('signupLimiter', () => {
  it('Should get 429 after more than 4 successful requests', async () => {
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

    for (let i = 0; i < 4; i += 1) {
      await request(app)
        .post('/users')
        .set('X-Forwarded-For', '192.168.1.5')
        .send({ ...data, username: `${data.username}${i}`, email: `${i}${data.email}` })
        .expect(201);
    }

    const { body } = await request(app)
      .post('/users')
      .set('X-Forwarded-For', '192.168.1.5')
      .send({ ...data, username: `${data.username}10`, email: `10${data.email}` })
      .expect(429);

    expect(body).toEqual({
      message: 'Too many signup attemps, please wait up to 40 minutes',
    });
  });

  it('Should NOT get 429 after more than 4 failed requests', async () => {
    const data = {
      firstName: 'John',
      lastName: 'Smith',
      username: 'jsmith',
      email: 'invalidEmail',
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

    for (let i = 0; i < 10; i += 1) {
      await request(app)
        .post('/users')
        .set('X-Forwarded-For', '192.168.1.6')
        .send(data)
        .expect(400);
    }
  });
});

describe('accountVerificationEmailLimiter', () => {
  it('Should get 429 after more than 3 successful requests', async () => {
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post('/users/send-account-verification-email')
        .set('Cookie', [`token=${userFour.tokens[0].token}`])
        .set('X-Forwarded-For', '192.168.1.7')
        .expect(200);
    }

    const { body } = await request(app)
      .post('/users/send-account-verification-email')
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .set('X-Forwarded-For', '192.168.1.7')
      .expect(429);

    expect(body).toEqual({
      message: 'Too many requests for sending verification email, please wait up to 15 minutes',
    });
  });

  it('Should NOT get 429 after more than 3 failed requests', async () => {
    for (let i = 0; i < 10; i += 1) {
      const { body } = await request(app)
        .post('/users/send-account-verification-email')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .set('X-Forwarded-For', '192.168.1.8')
        .expect(400);

      expect(body).toEqual({
        message: 'Your account is already active',
      });
    }
  });
});

describe('verificationLinkLimiter', () => {
  it('Should get 429 after more than 4 requests', async () => {
    for (let i = 0; i < 4; i += 1) {
      const { body } = await request(app)
        .get(`/users/${userOne._id}/verify-account/uuid`)
        .set('X-Forwarded-For', '192.168.1.9')
        .expect(400);

      expect(body).toEqual({
        message:
          'Verification link has been expired or you are not allowed to perform this action or your account already does not exist',
      });
    }

    const { body } = await request(app)
      .get(`/users/${userOne._id}/verify-account/uuid`)
      .set('X-Forwarded-For', '192.168.1.9')
      .expect(429);

    expect(body).toEqual({
      message: 'Too many requests for account verification, please wait up to 10 minutes',
    });
  });
});

describe('resetPasswordRequestLimiter', () => {
  it('Should get 429 after more than 4 successful requests', async () => {
    for (let i = 0; i < 4; i += 1) {
      await request(app)
        .post('/users/request-for-reset-password')
        .set('X-Forwarded-For', '192.168.1.10')
        .send({ email: userOne.email })
        .expect(200);
    }

    const { body } = await request(app)
      .post('/users/request-for-reset-password')
      .set('X-Forwarded-For', '192.168.1.10')
      .send({ email: userOne.email })
      .expect(429);

    expect(body).toEqual({
      message: 'Too many requests for password reset, please wait up to 25 minutes',
    });
  });

  it('Should NOT get 429 after more than 4 failed requests', async () => {
    for (let i = 0; i < 10; i += 1) {
      const { body } = await request(app)
        .post('/users/request-for-reset-password')
        .set('X-Forwarded-For', '192.168.1.11')
        .send({ email: 'notfound@domain.com' })
        .expect(404);

      expect(body).toEqual({
        message: `We can't find any user with this email`,
      });
    }
  });
});
