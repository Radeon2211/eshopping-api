const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../src/models/userModel');
const Product = require('../../src/models/productModel');
const Order = require('../../src/models/orderModel');

const cartItemOneId = new mongoose.Types.ObjectId();
const cartItemTwoId = new mongoose.Types.ObjectId();
const cartItemThreeId = new mongoose.Types.ObjectId();
const cartItemFourId = new mongoose.Types.ObjectId();
const productOneId = new mongoose.Types.ObjectId();
const productTwoId = new mongoose.Types.ObjectId();
const productThreeId = new mongoose.Types.ObjectId();
const productFourId = new mongoose.Types.ObjectId();
const userOneId = new mongoose.Types.ObjectId();
const userTwoId = new mongoose.Types.ObjectId();
const userThreeId = new mongoose.Types.ObjectId();
const orderOneId = new mongoose.Types.ObjectId();

const userOne = {
  _id: userOneId,
  firstName: 'Krzysztof',
  lastName: 'Kononowicz',
  username: 'Konon',
  email: 'user1@wp.pl',
  password: 'Pa$$w0rd',
  street: 'Szkolna 17',
  zipCode: '15-950',
  city: 'Białystok',
  country: 'Poland',
  phone: '123456789',
  contacts: ['email', 'phone'],
  cart: [
    {
      _id: cartItemTwoId,
      quantity: 2,
      product: productTwoId,
    },
    {
      _id: cartItemFourId,
      quantity: 48,
      product: productFourId,
    },
  ],
  tokens: [
    {
      token: jwt.sign({ _id: userOneId }, process.env.JWT_SECRET),
    },
  ],
};

const userTwo = {
  _id: userTwoId,
  firstName: 'Wojciech',
  lastName: 'Suchodolski',
  username: 'Major',
  email: 'user2@wp.pl',
  password: 'Pa$$w0rd',
  street: 'Szkolna 17',
  zipCode: '15-950',
  city: 'Białystok',
  country: 'Poland',
  phone: '987654321',
  contacts: [],
  cart: [
    {
      _id: cartItemOneId,
      quantity: 2,
      product: productOneId,
    },
  ],
  tokens: [
    {
      token: jwt.sign({ _id: userTwoId }, process.env.JWT_SECRET),
    },
  ],
};

const userThree = {
  _id: userThreeId,
  firstName: 'Jarosław',
  lastName: 'Andrzejewski',
  username: 'mexicano',
  email: 'user3@wp.pl',
  password: 'Pa$$w0rd',
  street: 'Szkolna 17',
  zipCode: '15-950',
  city: 'Białystok',
  country: 'Poland',
  phone: '123456789',
  contacts: ['email', 'phone'],
  isAdmin: true,
  cart: [
    {
      _id: cartItemThreeId,
      quantity: 1,
      product: productThreeId,
    },
  ],
  tokens: [
    {
      token: jwt.sign({ _id: userThreeId }, process.env.JWT_SECRET),
    },
  ],
};

const productOne = {
  _id: productOneId,
  name: 'Mushrooms',
  description: 'Healthy mushrooms',
  price: 0.5,
  quantity: 1000,
  seller: userOneId,
  condition: 'not_applicable',
};

const productTwo = {
  _id: productTwoId,
  name: 'Knife for cutting mushrooms',
  description: 'Thanks to this knife you will be able to collect mushrooms super fastly',
  price: 12,
  condition: 'new',
  quantity: 3,
  seller: userTwoId,
};

const productThree = {
  _id: productThreeId,
  name: 'Wellingtons',
  description: 'Wellingtons that are waterproof and super cool for collecting mushrooms',
  price: 30,
  condition: 'new',
  quantity: 1,
  seller: userTwoId,
};

const productFour = {
  _id: productFourId,
  name: 'Bucket',
  description: 'Big bucket for collecting mushrooms',
  price: 20,
  condition: 'used',
  quantity: 50,
  seller: userThreeId,
};

const orderOne = {
  _id: orderOneId,
  seller: userTwoId,
  buyer: userOneId,
  overallPrice: 42,
  products: [
    {
      _id: productTwoId,
      name: 'Knife for cutting mushrooms',
      price: 12,
      quantity: 1,
      totalPrice: 12,
    },
    {
      _id: productThreeId,
      name: 'Wellingtons',
      price: 30,
      quantity: 1,
      totalPrice: 30,
    },
  ],
  deliveryAddress: {
    firstName: 'Krzysztof',
    lastName: 'Kononwicz',
    street: 'Szkolna 17',
    zipCode: '15-950',
    city: 'Białystok',
    country: 'Poland',
  },
};

const setupDatabase = async () => {
  await User.deleteMany();
  await Product.deleteMany();
  await Order.deleteMany();
  await new User(userOne).save();
  await new User(userTwo).save();
  await new User(userThree).save();
  await new Product(productOne).save();
  await new Product(productTwo).save();
  await new Product(productThree).save();
  await new Product(productFour).save();
  await new Order(orderOne).save();
};

module.exports = {
  userOneId,
  userOne,
  userTwo,
  userThree,
  cartItemOneId,
  cartItemTwoId,
  cartItemThreeId,
  cartItemFourId,
  productOneId,
  productTwoId,
  productThreeId,
  productFourId,
  productOne,
  orderOne,
  setupDatabase,
};
