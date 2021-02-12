const request = require('supertest');
const mongoose = require('mongoose');
const { ObjectId } = require('mongoose').Types;
const app = require('../src/app');
const Product = require('../src/models/productModel');
const User = require('../src/models/userModel');
const {
  userOne,
  userTwo,
  userThree,
  userFour,
  productOne,
  productTwo,
  productThree,
  productFour,
  setupDatabase,
  cartItemOneId,
  cartItemTwoId,
  cartItemThreeId,
} = require('./fixtures/db');
const { updateCartActions } = require('../src/shared/constants');

beforeEach(setupDatabase);

describe('GET /cart', () => {
  test('Should get user cart with 2 products with boolean product photo and isDifferent false and 48 quantity of second product', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .get('/cart')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);
    expect(cart).toEqual([
      {
        _id: userOne.cart[0]._id.toJSON(),
        quantity: userOne.cart[0].quantity,
        product: {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userTwo.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
      {
        _id: userOne.cart[1]._id.toJSON(),
        quantity: userOne.cart[1].quantity,
        product: {
          ...productFour,
          _id: productFour._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userThree.username,
          },
          createdAt: cart[1].product.createdAt,
          updatedAt: cart[1].product.updatedAt,
        },
      },
    ]);
    expect(cart[0].product.createdAt).toBeDefined();
    expect(cart[0].product.updatedAt).toBeDefined();
    expect(cart[1].product.createdAt).toBeDefined();
    expect(cart[1].product.updatedAt).toBeDefined();
  });

  test('Should get user cart only with second product and isDifferent true when first product is deleted before', async () => {
    await request(app)
      .delete(`/products/${productTwo._id}`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(200);

    const {
      body: { cart, isDifferent },
    } = await request(app)
      .get('/cart')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(true);
    expect(cart).toEqual([
      {
        _id: userOne.cart[1]._id.toJSON(),
        quantity: userOne.cart[1].quantity,
        product: {
          ...productFour,
          _id: productFour._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userThree.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
    expect(cart[0].product.createdAt).toBeDefined();
    expect(cart[0].product.updatedAt).toBeDefined();
  });

  test('Should get isDifferent true and user cart with updated second product - 40 quantity when product is updated in db before ', async () => {
    await request(app)
      .patch(`/products/${productFour._id}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({
        quantity: 40,
      })
      .expect(200);

    const { body } = await request(app)
      .get('/cart')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    expect(body.cart).toHaveLength(2);
    expect(body.cart[1].quantity).toEqual(40);
    expect(body.isDifferent).toEqual(true);
  });

  test('Should get 401 if user has status pending', async () => {
    const { body } = await request(app)
      .get('/cart')
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .expect(401);

    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });

  test('Should get 401 if user is unauthenticated', async () => {
    const { body } = await request(app).get('/cart').expect(401);
    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });
});

describe('PATCH /cart/add', () => {
  test('Should add new item to cart and cart length should be 2 and should return correct products and isDifferent false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ quantity: 2, product: productTwo._id })
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userThree.cart[0]._id.toJSON(),
        quantity: userThree.cart[0].quantity,
        product: {
          ...productThree,
          _id: productThree._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userTwo.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
      {
        _id: cart[1]._id,
        quantity: 2,
        product: {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userTwo.username,
          },
          createdAt: cart[1].product.createdAt,
          updatedAt: cart[1].product.updatedAt,
        },
      },
    ]);

    expect(ObjectId.isValid(cart[1]._id)).toEqual(true);
    expect(cart[1].product.createdAt).toBeDefined();
    expect(cart[1].product.updatedAt).toBeDefined();
  });

  test('Should add new item to cart and cart length should be 1 and isDifferent true if product of first item is deleted', async () => {
    await request(app)
      .delete(`/products/${productThree._id}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .send({ quantity: 3, product: productTwo._id })
      .expect(200);

    expect(isDifferent).toEqual(true);

    expect(cart).toEqual([
      {
        _id: cart[0]._id,
        quantity: 3,
        product: {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userTwo.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);

    expect(ObjectId.isValid(cart[0]._id)).toEqual(true);
    expect(cart[0].product.createdAt).toBeDefined();
    expect(cart[0].product.updatedAt).toBeDefined();
  });

  test('Should add 1 quantity to existing item and quantity should equals 3 and get isDifferent false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ quantity: 1, product: productTwo._id })
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userOne.cart[0]._id.toJSON(),
        quantity: userOne.cart[0].quantity + 1,
        product: {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userTwo.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
      {
        _id: userOne.cart[1]._id.toJSON(),
        quantity: userOne.cart[1].quantity,
        product: {
          ...productFour,
          _id: productFour._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userThree.username,
          },
          createdAt: cart[1].product.createdAt,
          updatedAt: cart[1].product.updatedAt,
        },
      },
    ]);
  });

  test('Should add only 1 quantity to item in cart if total quantity of product in db is 3', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ quantity: 3, product: productTwo._id })
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userOne.cart[0]._id.toJSON(),
        quantity: productTwo.quantity,
        product: {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userTwo.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
      {
        _id: userOne.cart[1]._id.toJSON(),
        quantity: userOne.cart[1].quantity,
        product: {
          ...productFour,
          _id: productFour._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userThree.username,
          },
          createdAt: cart[1].product.createdAt,
          updatedAt: cart[1].product.updatedAt,
        },
      },
    ]);
  });

  test('Should get 403 if cart items number is 50 or higher', async () => {
    jest.setTimeout(15000);
    for (let i = 0; i < 48; i += 1) {
      const productId = new mongoose.Types.ObjectId();
      const product = {
        _id: productId,
        name: 'Product name',
        description: '',
        price: 10,
        condition: 'new',
        quantity: 1,
        seller: userTwo._id,
      };
      await new Product(product).save();
      await request(app)
        .patch('/cart/add')
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .send({ quantity: 1, product: productId })
        .expect(200);
    }

    const { body } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ quantity: 2, product: productThree._id })
      .expect(403);

    expect(body).toEqual({
      message: 'You can have up to 50 products in the cart',
    });
  });

  test(`Should get 403 if user is an owner`, async () => {
    const { body } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ quantity: 1, product: productOne._id })
      .expect(403);

    expect(body).toEqual({
      message: `You can't add your own product to the cart!`,
    });
  });

  test('Should get 404 if given productId does not exists in db', async () => {
    const { body } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ quantity: 1, product: new mongoose.Types.ObjectId() })
      .expect(404);

    expect(body).toEqual({
      message: 'This product probably has already been sold',
    });
  });

  test('Should get 400 if given quantity is lower than 1', async () => {
    const { body } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ quantity: 0, product: productTwo._id })
      .expect(400);

    expect(body).toEqual({
      message: '"Quantity" must be greater than or equal to 1',
    });
  });

  test('Should get 400 if given no quantity is given', async () => {
    const { body } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ product: productTwo._id })
      .expect(400);

    expect(body).toEqual({
      message: '"Quantity" is required',
    });
  });

  test('Should get 400 if no product is given', async () => {
    const { body } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({ quantity: 1 })
      .expect(400);

    expect(body).toEqual({
      message: '"Product" is required',
    });
  });

  test('Should get 400 if no data are given', async () => {
    const { body } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({})
      .expect(400);

    expect(body).toEqual({
      message: '"Quantity" is required',
    });
  });

  test('Should get 401 if user has status pending', async () => {
    const { body } = await request(app)
      .patch('/cart/add')
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .send({ quantity: 1, product: productOne._id })
      .expect(401);

    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });

  test('Should get 401 if user is unauthenticated', async () => {
    const { body } = await request(app)
      .patch('/cart/add')
      .send({ quantity: 1, product: productOne._id })
      .expect(401);

    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });
});

describe('PATCH /cart/:itemId/update', () => {
  test('Should increment quantity of first cart item and get correct cart and get isDifferent false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.INCREMENT}`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userTwo.cart[0]._id.toJSON(),
        quantity: userTwo.cart[0].quantity + 1,
        product: {
          ...productOne,
          _id: productOne._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userOne.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
    expect(cart[0].product.createdAt).toBeDefined();
    expect(cart[0].product.updatedAt).toBeDefined();
  });

  test('Should decrement quantity of first cart item and get isDifferent false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.DECREMENT}`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userTwo.cart[0]._id.toJSON(),
        quantity: userTwo.cart[0].quantity - 1,
        product: {
          ...productOne,
          _id: productOne._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userOne.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
    expect(cart[0].product.createdAt).toBeDefined();
    expect(cart[0].product.updatedAt).toBeDefined();
  });

  test('Should update quantity of first cart item to 20 and get isDifferent false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=20`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userTwo.cart[0]._id.toJSON(),
        quantity: 20,
        product: {
          ...productOne,
          _id: productOne._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userOne.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
    expect(cart[0].product.createdAt).toBeDefined();
    expect(cart[0].product.updatedAt).toBeDefined();
  });

  test('Should update quantity of first cart item to product quantity if passed quantity is greater than product quantity in db', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=2000`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userTwo.cart[0]._id.toJSON(),
        quantity: productOne.quantity,
        product: {
          ...productOne,
          _id: productOne._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userOne.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
  });

  test('Should NOT update quantity of cart item if given quantity is lower than 1 and get isDifferent false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=-1`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userTwo.cart[0]._id.toJSON(),
        quantity: userTwo.cart[0].quantity,
        product: {
          ...productOne,
          _id: productOne._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userOne.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
  });

  test('Should return the same quantity of cart item if passed quantity equals to cart item quantity and get isDifferen false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=2`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userTwo.cart[0]._id.toJSON(),
        quantity: userTwo.cart[0].quantity,
        product: {
          ...productOne,
          _id: productOne._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userOne.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
  });

  test('Should NOT increment quantity of cart item if product quantity in db equals to cart item quantity and get isDifferent false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemThreeId}/update?action=${updateCartActions.INCREMENT}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userThree.cart[0]._id.toJSON(),
        quantity: userThree.cart[0].quantity,
        product: {
          ...productThree,
          _id: productThree._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userTwo.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
  });

  test('Should NOT decrement quantity of cart item if cart item quantity equals to 1', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemThreeId}/update?action=${updateCartActions.DECREMENT}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userThree.cart[0]._id.toJSON(),
        quantity: userThree.cart[0].quantity,
        product: {
          ...productThree,
          _id: productThree._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userTwo.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);
  });

  test('Should NOT update quantity of cart item if given quantity is passed value is falsy after parsing to int', async () => {
    const { body } = await request(app)
      .patch(`/cart/${cartItemOneId}/update?action=${updateCartActions.NUMBER}&quantity=0`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(400);

    expect(body).toEqual({
      message: 'Cart update action to perform is not provided or is not valid',
    });
  });

  test('Should NOT update cart item quantity if no action is given', async () => {
    const { body } = await request(app)
      .patch(`/cart/${cartItemTwoId}/update`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(400);

    expect(body).toEqual({
      message: 'Cart update action to perform is not provided or is not valid',
    });
  });

  test('Should NOT update cart item quantity if no action is not correct', async () => {
    const { body } = await request(app)
      .patch(`/cart/${cartItemTwoId}/update?action=incorrectAction`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(400);

    expect(body).toEqual({
      message: 'Cart update action to perform is not provided or is not valid',
    });
  });

  test('Should get 401 if user has status pending', async () => {
    const { body } = await request(app)
      .patch(`/cart/${cartItemTwoId}/update?action=${updateCartActions.INCREMENT}`)
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .expect(401);

    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });

  test('Should get 401 if user in unauthenticated', async () => {
    const { body } = await request(app)
      .patch(`/cart/${cartItemTwoId}/update?action=${updateCartActions.INCREMENT}`)
      .expect(401);

    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });
});

describe('PATCH /cart/:itemId/remove', () => {
  test('Should remove first item from cart and get only second item from initial cart and isDifferent false', async () => {
    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemTwoId}/remove`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(false);

    expect(cart).toEqual([
      {
        _id: userOne.cart[1]._id.toJSON(),
        quantity: userOne.cart[1].quantity,
        product: {
          ...productFour,
          _id: productFour._id.toJSON(),
          __v: 0,
          quantitySold: 0,
          buyerQuantity: 0,
          photo: false,
          seller: {
            username: userThree.username,
          },
          createdAt: cart[0].product.createdAt,
          updatedAt: cart[0].product.updatedAt,
        },
      },
    ]);

    expect(cart[0].product.createdAt).toBeDefined();
    expect(cart[0].product.updatedAt).toBeDefined();
  });

  test('Should remove first item from cart and get empty cart and isDifferent true if product of second item is deleted before', async () => {
    await request(app)
      .delete(`/products/${productFour._id}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    const {
      body: { cart, isDifferent },
    } = await request(app)
      .patch(`/cart/${cartItemTwoId}/remove`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    expect(isDifferent).toEqual(true);
    expect(cart).toEqual([]);
  });

  test('Should get 401 if user has status pending', async () => {
    const { body } = await request(app)
      .patch(`/cart/${cartItemTwoId}/remove`)
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .expect(401);

    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });

  test('Should get 401 if user in unauthenticated', async () => {
    const { body } = await request(app).patch(`/cart/${cartItemTwoId}/remove`).expect(401);
    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });
});

describe('PATCH /cart/clear', () => {
  test('Should clear user cart', async () => {
    await request(app)
      .patch('/cart/clear')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const { cart } = await User.findById(userOne._id);
    expect(cart).toHaveLength(0);
  });

  test('Should get 401 if user has status pending', async () => {
    const { body } = await request(app)
      .patch('/cart/clear')
      .set('Cookie', [`token=${userFour.tokens[0].token}`])
      .expect(401);

    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });

  test('Should get 401 if user in unauthenticated', async () => {
    const { body } = await request(app).patch('/cart/clear').expect(401);
    expect(body).toEqual({
      message: 'This route is blocked for you',
    });
  });
});
