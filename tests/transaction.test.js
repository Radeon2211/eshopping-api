const request = require('supertest');
const app = require('../src/app');
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

beforeEach(setupDatabase);

describe('PATCH /transaction', () => {
  describe('Items from cart', () => {
    test('Should get transaction products the same as in cart, isDifferent false, cart null if single item is not passed', async () => {
      const {
        body: { transaction, cart, isDifferent },
      } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);

      expect(isDifferent).toEqual(false);
      expect(cart).toBeNull();
      expect(transaction).toEqual([
        {
          _id: productTwo._id.toJSON(),
          name: productTwo.name,
          price: productTwo.price,
          quantity: 2,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
        {
          _id: productFour._id.toJSON(),
          name: productFour.name,
          price: productFour.price,
          quantity: 48,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ]);
    });

    test('Should get transaction products with edited second item, isDifferent true, edited cart if product of second item changed quantity to lower value than it is in cart', async () => {
      await request(app)
        .patch(`/products/${productFour._id}`)
        .set('Cookie', [`token=${userThree.tokens[0].token}`])
        .send({
          quantity: 40,
        })
        .expect(200);

      const {
        body: { transaction, cart, isDifferent },
      } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);

      const {
        body: { cart: updatedCart },
      } = await request(app)
        .get('/cart')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);

      expect(isDifferent).toEqual(true);
      expect(cart).toEqual(updatedCart);
      expect(transaction).toEqual([
        {
          _id: productTwo._id.toJSON(),
          name: productTwo.name,
          price: productTwo.price,
          quantity: 2,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
        {
          _id: productFour._id.toJSON(),
          name: productFour.name,
          price: productFour.price,
          quantity: 40,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ]);
    });

    test('Should get empty transaction, isDifferent true, empty cart if product of cart item is deleted before', async () => {
      await request(app)
        .delete(`/products/${productOne._id}`)
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);

      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userTwo.tokens[0].token}`])
        .expect(200);

      expect(body.isDifferent).toEqual(true);
      expect(body.cart).toEqual([]);
      expect(body.transaction).toEqual([]);
    });
  });

  describe('Single item', () => {
    test('Should get transaction with passed product, isDifferent false, cart null', async () => {
      const singleItem = {
        product: productFour._id,
        quantity: 1,
      };

      const {
        body: { transaction, isDifferent, cart },
      } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(200);

      expect(isDifferent).toEqual(false);
      expect(cart).toBeNull();
      expect(transaction).toEqual([
        {
          _id: productFour._id.toJSON(),
          name: productFour.name,
          price: productFour.price,
          quantity: 1,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ]);
    });

    test('Should get transaction with edited product, isDifferent true, cart null if product quantity changed before', async () => {
      await request(app)
        .patch(`/products/${productFour._id}`)
        .set('Cookie', [`token=${userThree.tokens[0].token}`])
        .send({
          quantity: 40,
        })
        .expect(200);

      const singleItem = {
        product: productFour._id,
        quantity: 50,
      };

      const {
        body: { transaction, isDifferent, cart },
      } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(200);

      expect(isDifferent).toEqual(true);
      expect(cart).toBeNull();
      expect(transaction).toEqual([
        {
          _id: productFour._id.toJSON(),
          name: productFour.name,
          price: productFour.price,
          quantity: 40,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ]);
    });

    test('Should get empty transaction, isDifferent true, cart null if passed product is deleted before', async () => {
      await request(app)
        .delete(`/products/${productFour._id}`)
        .set('Cookie', [`token=${userThree.tokens[0].token}`])
        .expect(200);

      const singleItem = {
        product: productFour._id,
        quantity: 50,
      };

      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(200);

      expect(body.cart).toBeNull();
      expect(body.isDifferent).toEqual(true);
      expect(body.transaction).toEqual([]);
    });

    test('Should get 400 if passed quantity is lower than 1', async () => {
      const singleItem = {
        product: productFour._id,
        quantity: 0,
      };

      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(400);

      expect(body).toEqual({
        message: '"Quantity" must be greater than or equal to 1',
      });
    });

    test('Should get 400 if passed product is not valid ObjectId', async () => {
      const singleItem = {
        product: 'invalidId',
        quantity: 1,
      };

      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(400);

      expect(body).toEqual({
        message: 'It must have a valid ObjectId.',
      });
    });

    test('Should get 400 if passed item is an array', async () => {
      const singleItem = ['array'];

      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(400);

      expect(body).toEqual({
        message: '"Item" must be of type object',
      });
    });

    test('Should get 400 if passed item is a string', async () => {
      const singleItem = 'string';

      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(400);

      expect(body).toEqual({
        message: '"Item" must be of type object',
      });
    });

    test('Should get 400 if no quantity is given', async () => {
      const singleItem = {
        product: 'invalidId',
      };

      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(400);

      expect(body).toEqual({
        message: '"Quantity" is required',
      });
    });

    test('Should get 400 if no product is given', async () => {
      const singleItem = {
        quantity: 1,
      };

      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ singleItem })
        .expect(400);

      expect(body).toEqual({
        message: '"Product" is required',
      });
    });
  });

  describe('User is unauthenticated or has status pending', () => {
    test('Should get 401 if user has status pending', async () => {
      const { body } = await request(app)
        .patch('/transaction')
        .set('Cookie', [`token=${userFour.tokens[0].token}`])
        .expect(401);

      expect(body).toEqual({
        message: 'This route is blocked for you',
      });
    });

    test('Should get 401 if user is unauthenticated', async () => {
      const { body } = await request(app).patch('/transaction').expect(401);
      expect(body).toEqual({
        message: 'This route is blocked for you',
      });
    });
  });
});
