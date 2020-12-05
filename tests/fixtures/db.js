const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../src/models/userModel');
const Product = require('../../src/models/productModel');
const Order = require('../../src/models/orderModel');

const userOneId = new mongoose.Types.ObjectId();
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
  tokens: [{
    token: jwt.sign({ _id: userOneId }, process.env.JWT_SECRET),
  }],
};

const userTwoId = new mongoose.Types.ObjectId();
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
  tokens: [{
    token: jwt.sign({ _id: userTwoId }, process.env.JWT_SECRET),
  }],
};

const userThreeId = new mongoose.Types.ObjectId();
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
  tokens: [{
    token: jwt.sign({ _id: userThreeId }, process.env.JWT_SECRET),
  }],
};

const productOneId = new mongoose.Types.ObjectId();
const productOne = {
  _id: productOneId,
  name: 'Mushrooms',
  description: 'Healthy mushrooms',
  price: 0.5,
  quantity: 1000,
  seller: userOneId,
  condition: 'not_applicable',
};

const productTwoId = new mongoose.Types.ObjectId();
const productTwo = {
  _id: productTwoId,
  name: 'Knife for cutting mushrooms',
  description: 'Thanks to this knife you will be able to collect mushrooms super fastly',
  price: 12,
  condition: 'new',
  quantity: 1,
  seller: userTwoId,
};

const productThreeId = new mongoose.Types.ObjectId();
const productThree = {
  _id: productThreeId,
  name: 'Wellingtons',
  description: 'Wellingtons that are waterproof and super cool for collecting mushrooms',
  price: 30,
  condition: 'new',
  quantity: 1,
  seller: userTwoId,
};

const orderOneId = new mongoose.Types.ObjectId();
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
  await new Order(orderOne).save();
};

module.exports = {
  userOneId,
  userOne,
  userTwo,
  userThree,
  productOne,
  productTwo,
  orderOne,
  setupDatabase,
};