const request = require('supertest');
const Order = require('../src/models/orderModel');
const app = require('../src/app');
const {
  userOne,
  userTwo,
  userThree,
  orderOne,
  setupDatabase,
  productTwo,
  productFour,
} = require('./fixtures/db');
const Product = require('../src/models/productModel');

beforeEach(setupDatabase);
beforeEach(async () => {
  await new Order(orderOne).save();
});

const userOneDeliveryAddress = {
  firstName: userOne.firstName,
  lastName: userOne.lastName,
  street: userOne.street,
  zipCode: userOne.zipCode,
  city: userOne.city,
  country: userOne.country,
};

test('Should create order with productTwo and update its quantity and get transaction undefined and updated cart', async () => {
  await setupDatabase();

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
          seller: productTwo.seller,
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
  await setupDatabase();

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
          seller: productTwo.seller,
        },
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 2,
          photo: false,
          seller: productFour.seller,
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
  await setupDatabase();

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
          seller: productTwo.seller,
        },
        {
          _id: productFour._id,
          name: productFour.name,
          price: productFour.price,
          quantity: 10,
          photo: false,
          seller: productFour.seller,
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
          seller: productTwo.seller,
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
  await setupDatabase();

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
          seller: productTwo.seller,
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
  await setupDatabase();

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
          seller: productTwo.seller,
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
        _id: userTwo._id.toJSON(),
        username: userTwo.username,
      },
    },
  ]);
  expect(orders).toHaveLength(0);
});

test('Should NOT create order and get empty transaction', async () => {
  await setupDatabase();

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
          seller: productTwo.seller,
        },
      ],
      deliveryAddress: userOneDeliveryAddress,
    })
    .expect(200);

  const orders = await Order.find().lean();

  expect(orders).toHaveLength(0);
  expect(body.transaction).toHaveLength(0);
});

test('Should fetch one order (buy)', async () => {
  const { body } = await request(app)
    .get('/orders/buy')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(body.orders).toHaveLength(1);
});

test('Should fetch one order (sell)', async () => {
  const { body } = await request(app)
    .get('/orders/sell')
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send()
    .expect(200);
  expect(body.orders).toHaveLength(1);
});

test('Should not fetch orders (buy) by a user that does not have buy orders', async () => {
  const { body } = await request(app)
    .get('/orders/buy')
    .set('Cookie', [`token=${userTwo.tokens[0].token}`])
    .send()
    .expect(200);
  expect(body.orders).toHaveLength(0);
});

test('Should not fetch orders (sell) by a user that does not have sell orders', async () => {
  const { body } = await request(app)
    .get('/orders/sell')
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(body.orders).toHaveLength(0);
});

test('Should fetch order by id', async () => {
  const { body } = await request(app)
    .get(`/orders/${orderOne._id}`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .send()
    .expect(200);
  expect(body.order).not.toBeNull();
});
