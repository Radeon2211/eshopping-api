// const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { productConditions, userStatuses } = require('../../src/shared/constants');

const userOneId = new mongoose.Types.ObjectId();
const productOneId = new mongoose.Types.ObjectId();

const userOne = {
  _id: userOneId,
  firstName: 'User',
  lastName: 'One',
  username: 'user1',
  email: 'user1@example.com',
  password: 'Pa$$w0rd',
  street: 'Szkolna 17',
  zipCode: '15-950',
  city: 'Białystok',
  country: 'Poland',
  phone: '+48 123456789',
  contacts: {
    email: true,
    phone: true,
  },
  status: userStatuses.ACTIVE,
  cart: [],
  tokens: [],
};

const productOne = {
  _id: productOneId,
  name: 'Product One',
  description: 'Cool product',
  price: 15.5,
  quantity: 10,
  seller: userOneId,
  condition: productConditions.NEW,
  buyerQuantity: 0,
  quantitySold: 0,
  __v: 0,
};

module.exports = {
  userOne,
  productOne,
};
