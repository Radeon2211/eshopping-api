const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../src/models/userModel');
const Product = require('../../src/models/productModel');
const Order = require('../../src/models/orderModel');

const userOneId = new mongoose.Types.ObjectId();
const userOne = {
  _id: userOneId,
  firstName: 'Krzysztof',
  lastName: 'Kononwicz',
  username: 'Konon',
  email: 'user1@wp.pl',
  password: 'Pa$$w0rd',
  street: 'Szkolna 17',
  zipCode: '15-950',
  city: 'Białystok',
  country: 'Poland',
  phone: '123456789',
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
  tokens: [{
    token: jwt.sign({ _id: userTwoId }, process.env.JWT_SECRET),
  }],
};

const productOne = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Mushrooms',
  description: 'Healthy mushrooms',
  price: '0,50',
  quantity: 1000,
  seller: userOneId,
};

const productTwo = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Knife for cutting mushrooms',
  description: 'Thanks to this knife you will be able to collect mushroom super fastly',
  price: '12,00',
  condition: 'new',
  quantity: 1,
  seller: userOneId,
};

const setupDatabase = async () => {
  await User.deleteMany();
  await Product.deleteMany();
  await Order.deleteMany();
  await new User(userOne).save();
  await new User(userTwo).save();
  await new Product(productOne).save();
  await new Product(productTwo).save();
};

module.exports = {
  userOneId,
  userOne,
  userTwo,
  productOne,
  productTwo,
  setupDatabase,
};