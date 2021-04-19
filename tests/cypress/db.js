// const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { productConditions, userStatuses } = require('../../src/shared/constants');

const userOneId = new mongoose.Types.ObjectId();
// const userTwoId = new mongoose.Types.ObjectId();
// const userThreeId = new mongoose.Types.ObjectId();
// const userFourId = new mongoose.Types.ObjectId();
// const userOneTokenId = new mongoose.Types.ObjectId();
// const userTwoTokenId = new mongoose.Types.ObjectId();
// const userThreeTokenId = new mongoose.Types.ObjectId();
// const userFourTokenId = new mongoose.Types.ObjectId();
// const cartItemOneId = new mongoose.Types.ObjectId();
// const cartItemTwoId = new mongoose.Types.ObjectId();
// const cartItemThreeId = new mongoose.Types.ObjectId();
// const cartItemFourId = new mongoose.Types.ObjectId();
const productOneId = new mongoose.Types.ObjectId();
// const productTwoId = new mongoose.Types.ObjectId();
// const productThreeId = new mongoose.Types.ObjectId();
// const productFourId = new mongoose.Types.ObjectId();
// const orderOneId = new mongoose.Types.ObjectId();
// const orderTwoId = new mongoose.Types.ObjectId();
// const orderThreeId = new mongoose.Types.ObjectId();

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
};

const productOne = {
  _id: productOneId,
  name: 'Product One',
  description: 'Cool product',
  price: 15.5,
  quantity: 10,
  seller: userOneId,
  condition: productConditions.NEW,
};

module.exports = {
  userOne,
  productOne,
};
