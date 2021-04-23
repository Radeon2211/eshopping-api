const mongoose = require('mongoose');
const { productConditions, userStatuses } = require('../../src/shared/constants');

const adminUserId = new mongoose.Types.ObjectId();
const activeUserId = new mongoose.Types.ObjectId();
const pendingUserId = new mongoose.Types.ObjectId();
const productOneId = new mongoose.Types.ObjectId();
const productTwoId = new mongoose.Types.ObjectId();
const productThreeId = new mongoose.Types.ObjectId();

const adminUser = {
  _id: adminUserId,
  firstName: 'User',
  lastName: 'Admin',
  username: 'userAdmin',
  email: 'user-admin@example.com',
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
  isAdmin: true,
  status: userStatuses.ACTIVE,
  cart: [],
  tokens: [],
};

const activeUser = {
  _id: activeUserId,
  firstName: 'User',
  lastName: 'Active',
  username: 'userActive',
  email: 'user-active@example.com',
  password: 'Pa$$w0rd',
  street: 'Kolejowa 111',
  zipCode: '00-051',
  city: 'Warsaw',
  country: 'Poland',
  phone: '+48 999-998-997',
  contacts: {
    email: false,
    phone: false,
  },
  status: userStatuses.ACTIVE,
  cart: [],
  tokens: [],
};

const pendingUser = {
  _id: pendingUserId,
  firstName: 'User',
  lastName: 'Pending',
  username: 'userPending',
  email: 'user-pending@example.com',
  password: 'Pa$$w0rd',
  street: 'Square St. 66',
  zipCode: '35004',
  city: 'Leeds',
  country: 'United Kingdom',
  phone: '+44 111-222-3333',
  contacts: {
    email: true,
    phone: false,
  },
  status: userStatuses.PENDING,
  cart: [],
  tokens: [],
};

const productOne = {
  _id: productOneId,
  name: 'Product One',
  description: 'Cool product',
  price: 120,
  quantity: 10,
  seller: adminUserId,
  condition: productConditions.NEW,
  buyerQuantity: 0,
  quantitySold: 0,
  __v: 0,
};

const productTwo = {
  _id: productTwoId,
  name: 'Product Two',
  description: 'Another awesome product',
  price: 15.5,
  quantity: 50,
  seller: activeUserId,
  condition: productConditions.USED,
  buyerQuantity: 0,
  quantitySold: 0,
  __v: 0,
};

const productThree = {
  _id: productThreeId,
  name: 'Product Three',
  description: 'Other super cool product',
  price: 179.49,
  quantity: 100,
  seller: activeUserId,
  condition: productConditions.NOT_APPLICABLE,
  buyerQuantity: 0,
  quantitySold: 0,
  __v: 0,
};

const users = [adminUser, activeUser, pendingUser];
const products = [productOne, productTwo, productThree];

module.exports = {
  adminUser,
  activeUser,
  pendingUser,
  productOne,
  productTwo,
  productThree,
  users,
  products,
};
