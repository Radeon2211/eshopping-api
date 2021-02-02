const request = require('supertest');
const app = require('../src/app');
const { userOne, productOne, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

describe('LOGIN', () => {
  it('Should get 429 after more than 7 unsuccessful requests', async () => {
    for (let i = 0; i < 7; i += 1) {
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

  it('Should NOT get 429 after more than 7 successful requests', async () => {
    for (let i = 0; i < 8; i += 1) {
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

  it('Should NOT get 429 after 6 unsuccessful and 2 successful request', async () => {
    for (let i = 0; i < 6; i += 1) {
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

describe('PHOTO', () => {
  it('Should get 429 after more than 100 requests', async () => {
    await request(app)
      .post(`/products/${productOne._id}/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .attach('photo', 'tests/fixtures/mushrooms.jpg');

    for (let i = 0; i < 100; i += 1) {
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
