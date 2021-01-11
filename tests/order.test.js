const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Order = require('../src/models/orderModel');
const Product = require('../src/models/productModel');
const {
  userOne,
  userTwo,
  userThree,
  orderOne,
  orderTwo,
  orderThree,
  setupDatabase,
  productOne,
  productTwo,
  productFour,
} = require('./fixtures/db');
const { orderTypes } = require('../src/shared/constants');
const { getCorrectProduct } = require('../src/shared/utility');

beforeEach(setupDatabase);

const userOneDeliveryAddress = {
  firstName: userOne.firstName,
  lastName: userOne.lastName,
  street: userOne.street,
  zipCode: userOne.zipCode,
  city: userOne.city,
  country: userOne.country,
  phone: userOne.phone,
};

// * POST /orders *//
test('Should create order with productTwo and update its quantity and get transaction undefined and updated cart', async () => {
  const { body } = await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      transaction: [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 2,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
      clearCart: false,
    })
    .expect(201);

  const productTwoDetails = await Product.findById(productTwo._id);
  const orders = await Order.find().lean();

  expect(productTwoDetails.quantity).toEqual(1);
  expect(productTwoDetails.quantitySold).toEqual(2);
  expect(productTwoDetails.buyerQuantity).toEqual(1);
  expect(body.transaction).toBeUndefined();
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({
    seller: userTwo._id,
    buyer: userOne._id,
    overallPrice: productTwo.price * 2,
    products: [
      {
        _id: productTwo._id,
        name: productTwo.name,
        price: productTwo.price,
        quantity: 2,
      },
    ],
    deliveryAddress: userOneDeliveryAddress,
  });
  expect(body.cart[0].quantity).toEqual(1);
});

test('Should create two orders with productTwo and productFour and clear cart', async () => {
  const { body } = await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      transaction: [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 2,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 2,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
      clearCart: true,
    })
    .expect(201);

  const orders = await Order.find().lean();
  expect(orders).toHaveLength(2);
  expect(orders[0]).toMatchObject({
    seller: userTwo._id,
    buyer: userOne._id,
    overallPrice: productTwo.price * 2,
    products: [
      {
        _id: productTwo._id,
        name: productTwo.name,
        price: productTwo.price,
        quantity: 2,
      },
    ],
    deliveryAddress: userOneDeliveryAddress,
  });
  expect(orders[1]).toMatchObject({
    seller: userThree._id,
    buyer: userOne._id,
    overallPrice: productFour.price * 2,
    products: [
      {
        _id: productFour._id,
        name: productFour.name,
        price: productFour.price,
        quantity: 2,
      },
    ],
    deliveryAddress: userOneDeliveryAddress,
  });
  expect(body.cart).toHaveLength(0);
});

test('Should create three orders with productTwo and productFour and update its quantity correctly', async () => {
  await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      transaction: [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 10,
          photo: false,
          seller: {
            username: userThree.username,
          },
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
      clearCart: false,
    })
    .expect(201);

  await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      transaction: [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 1,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
      clearCart: false,
    })
    .expect(201);

  const productTwoDetails = await Product.findById(productTwo._id);
  const productFourDetails = await Product.findById(productFour._id);
  const orders = await Order.find().lean();

  expect(productTwoDetails.quantity).toEqual(1);
  expect(productTwoDetails.quantitySold).toEqual(2);
  expect(productTwoDetails.buyerQuantity).toEqual(1);
  expect(productFourDetails.quantity).toEqual(40);
  expect(productFourDetails.quantitySold).toEqual(10);
  expect(productFourDetails.buyerQuantity).toEqual(1);
  expect(orders).toHaveLength(3);
});

test('Should create order with productTwo and delete it and get transaction undefined and updated cart with only 1 item', async () => {
  const { body } = await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      transaction: [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 3,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
      clearCart: false,
    })
    .expect(201);

  const productTwoDetails = await Product.findById(productTwo._id);
  const orders = await Order.find().lean();

  expect(productTwoDetails).toBeNull();
  expect(body.transaction).toBeUndefined();
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({
    seller: userTwo._id,
    buyer: userOne._id,
    overallPrice: productTwo.price * 3,
    products: [
      {
        _id: productTwo._id,
        name: productTwo.name,
        price: productTwo.price,
        quantity: 3,
      },
    ],
    deliveryAddress: userOneDeliveryAddress,
  });
  expect(body.cart).toHaveLength(1);
  expect(body.cart[0].product._id).toEqual(productFour._id.toJSON());
});

test('Should NOT create order and get transaction with updated item', async () => {
  await request(app)
    .patch(`/products/${productTwo._id}/seller`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send({
      quantity: 1,
    });

  const { body } = await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      transaction: [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 3,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
      clearCart: false,
    })
    .expect(200);

  const productTwoDetails = await Product.findById(productTwo._id);
  const orders = await Order.find().lean();

  expect(productTwoDetails.quantity).toEqual(1);
  expect(productTwoDetails.quantitySold).toEqual(0);
  expect(productTwoDetails.buyerQuantity).toEqual(0);
  expect(body.transaction).toEqual([
    {
      _id: productTwo._id.toJSON(),
      name: productTwo.name,
      price: productTwo.price,
      quantity: 1,
      photo: false,
      seller: {
        username: userTwo.username,
      },
    },
  ]);
  expect(orders).toHaveLength(0);
});

test('Should NOT create order and get empty transaction', async () => {
  await request(app)
    .delete(`/products/${productTwo._id}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`]);

  const { body } = await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      transaction: [
        {
          _id: productTwo._id,
          name: productTwo.name,
          price: productTwo.price,
          quantity: 3,
          photo: false,
          seller: {
            username: userTwo.username,
          },
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
    })
    .expect(200);

  const orders = await Order.find().lean();

  expect(orders).toHaveLength(0);
  expect(body.transaction).toHaveLength(0);
});

test('Should NOT create order and get 403 if product seller is the same as buyer', async () => {
  const { body } = await request(app)
    .post('/orders')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({
      transaction: [
        {
          _id: productOne._id,
          name: productOne.name,
          price: productOne.price,
          quantity: 1,
          photo: false,
          seller: {
            username: userOne.username,
          },
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
    })
    .expect(403);

  const orders = await Order.find().lean();

  expect(orders).toHaveLength(0);
  expect(body.message).toEqual(`You can't buy your own products`);
});

// * GET /orders * //
test('Should fetch one placed order with correct data and orderCount 1', async () => {
  await new Order(orderOne).save();

  const { body } = await request(app)
    .get(`/orders?type=${orderTypes.PLACED_ORDERS}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.orders).toHaveLength(1);
  expect(body.orderCount).toEqual(1);
  expect(body.orders[0]).toMatchObject({
    _id: orderOne._id.toJSON(),
    seller: {
      username: userTwo.username,
    },
    buyer: {
      username: userOne.username,
    },
    deliveryAddress: orderOne.deliveryAddress,
    overallPrice: orderOne.overallPrice,
    products: [
      {
        ...orderOne.products[0],
        _id: orderOne.products[0]._id.toJSON(),
      },
      {
        ...orderOne.products[1],
        _id: orderOne.products[1]._id.toJSON(),
      },
    ],
  });
});

test('Should fetch one order from sell history and orderCount 1', async () => {
  await new Order(orderOne).save();

  const { body } = await request(app)
    .get(`/orders?type=${orderTypes.SELL_HISTORY}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.orders).toHaveLength(1);
  expect(body.orderCount).toEqual(1);
});

test('Should fetch two placed orders and orderCount 2', async () => {
  await new Order(orderOne).save();
  await new Order(orderTwo).save();

  const { body } = await request(app)
    .get(`/orders?type=${orderTypes.PLACED_ORDERS}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.orders).toHaveLength(2);
  expect(body.orderCount).toEqual(2);
});

test('Should fetch two orders from sell history and orderCount 2', async () => {
  await new Order(orderOne).save();
  await new Order(orderTwo).save();

  const { body } = await request(app)
    .get(`/orders?type=${orderTypes.SELL_HISTORY}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.orders).toHaveLength(2);
  expect(body.orderCount).toEqual(2);
});

test('Should fetch two placed orders at second page and orderCount 8', async () => {
  await new Order(orderOne).save();
  await new Order(orderTwo).save();
  await new Order(orderThree).save();
  for (let i = 0; i < 5; i += 1) {
    await new Order({
      ...orderThree,
      _id: new mongoose.Types.ObjectId(),
    }).save();
  }

  const { body } = await request(app)
    .get(`/orders?type=${orderTypes.PLACED_ORDERS}&p=2`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.orders).toHaveLength(2);
  expect(body.orderCount).toEqual(8);
});

test('Should fetch two orders from sell history sorted ascending by price (saving higher to lower price)', async () => {
  await new Order(orderOne).save();
  await new Order(orderTwo).save();

  const {
    body: { orders, orderCount },
  } = await request(app)
    .get(`/orders?type=${orderTypes.SELL_HISTORY}&sortBy=overallPrice:asc`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(orders).toHaveLength(2);
  expect(orders[1].overallPrice).toBeGreaterThan(orders[0].overallPrice);
  expect(orderCount).toEqual(2);
});

test('Should fetch two orders from sell history sorted descending by price (saving lower to higher price)', async () => {
  await new Order(orderTwo).save();
  await new Order(orderOne).save();

  const {
    body: { orders, orderCount },
  } = await request(app)
    .get(`/orders?type=${orderTypes.SELL_HISTORY}&sortBy=overallPrice:desc`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(orders).toHaveLength(2);
  expect(orders[0].overallPrice).toBeGreaterThan(orders[1].overallPrice);
  expect(orderCount).toEqual(2);
});

test('Should fetch two orders from sell history sorted ascending by createdAt', async () => {
  await new Order(orderOne).save();
  await new Order(orderTwo).save();

  const {
    body: { orders, orderCount },
  } = await request(app)
    .get(`/orders?type=${orderTypes.SELL_HISTORY}&sortBy=createdAt:asc`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(orders).toHaveLength(2);
  expect(new Date(orders[0].createdAt) < new Date(orders[1].createdAt)).toEqual(true);
  expect(orderCount).toEqual(2);
});

test('Should fetch two orders from sell history sorted descending by createdAt', async () => {
  await new Order(orderOne).save();
  await new Order(orderTwo).save();

  const {
    body: { orders, orderCount },
  } = await request(app)
    .get(`/orders?type=${orderTypes.SELL_HISTORY}&sortBy=createdAt:desc`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(orders).toHaveLength(2);
  expect(new Date(orders[0].createdAt) > new Date(orders[1].createdAt)).toEqual(true);
  expect(orderCount).toEqual(2);
});

test('Should NOT fetch orders from sell history when in db is placed order of userOne', async () => {
  await new Order(orderOne).save();

  const { body } = await request(app)
    .get(`/orders?type=${orderTypes.SELL_HISTORY}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);
  expect(body.orders).toHaveLength(0);
  expect(body.orderCount).toEqual(0);
});

test('Should NOT fetch placed orders when in db is one placed order of userOne', async () => {
  await new Order(orderOne).save();

  const { body } = await request(app)
    .get(`/orders?type=${orderTypes.PLACED_ORDERS}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);
  expect(body.orders).toHaveLength(0);
  expect(body.orderCount).toEqual(0);
});

// * GET /orders/:id * //
test('Should fetch correct orderOne with complete seller and buyer', async () => {
  await new Order(orderOne).save();

  const {
    body: { order },
  } = await request(app)
    .get(`/orders/${orderOne._id}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);

  const correctProducts = order.products.map((product) => getCorrectProduct(product));
  expect(order).toEqual({
    ...orderOne,
    _id: orderOne._id.toJSON(),
    __v: 0,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    seller: {
      username: userTwo.username,
      email: userTwo.email,
      phone: userTwo.phone,
    },
    buyer: {
      username: userOne.username,
    },
    products: correctProducts,
  });
  expect(order.createdAt).toBeDefined();
  expect(order.updatedAt).toBeDefined();
});

test(`Should fetch correct orderOne with complete seller and buyer null if buyer's account has been deleted`, async () => {
  await new Order(orderOne).save();

  await request(app)
    .delete(`/users/me`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send({ currentPassword: 'Pa$$w0rd' })
    .expect(200);

  const {
    body: { order },
  } = await request(app)
    .get(`/orders/${orderOne._id}`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .expect(200);

  const correctProducts = order.products.map((product) => getCorrectProduct(product));
  expect(order).toEqual({
    ...orderOne,
    _id: orderOne._id.toJSON(),
    __v: 0,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    seller: {
      username: userTwo.username,
      email: userTwo.email,
      phone: userTwo.phone,
    },
    buyer: null,
    products: correctProducts,
  });
  expect(order.createdAt).toBeDefined();
  expect(order.updatedAt).toBeDefined();
});

test(`Should fetch correct orderOne with null seller and complete buyer if seller's account has been deleted`, async () => {
  await new Order(orderOne).save();

  await request(app)
    .delete(`/users/me`)
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send({ currentPassword: 'Pa$$w0rd' })
    .expect(200);

  const {
    body: { order },
  } = await request(app)
    .get(`/orders/${orderOne._id}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(200);

  const correctProducts = order.products.map((product) => getCorrectProduct(product));
  expect(order).toEqual({
    ...orderOne,
    _id: orderOne._id.toJSON(),
    __v: 0,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    seller: null,
    buyer: {
      username: userOne.username,
    },
    products: correctProducts,
  });
  expect(order.createdAt).toBeDefined();
  expect(order.updatedAt).toBeDefined();
});

test('Should get 404 when incorrect ObjectID is passed', async () => {
  await new Order(orderOne).save();
  const incorrectId = new mongoose.Types.ObjectId();

  const { body } = await request(app)
    .get(`/orders/${incorrectId}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(404);

  expect(body).toEqual({
    message: 'Such order does not exist',
  });
});

test('Should get 500 when incorrect id is passed (but not ObjectID)', async () => {
  const { body } = await request(app)
    .get('/orders/incorrectid')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .expect(500);

  expect(body.kind).toEqual('ObjectId');
});

test('Should get 403 when user is not a seller either a buyer', async () => {
  await new Order(orderOne).save();

  const { body } = await request(app)
    .get(`/orders/${orderOne._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .expect(403);

  expect(body).toEqual({
    message: 'You are not allowed to get this order details',
  });
});

test('Should get 403 when user is not a seller either a buyer', async () => {
  await new Order(orderOne).save();

  const { body } = await request(app)
    .get(`/orders/${orderOne._id}`)
    .set('Cookie', [`token=${userThree.tokens[0].token}`])
    .expect(403);

  expect(body).toEqual({
    message: 'You are not allowed to get this order details',
  });
});
