const validator = require('validator');

const SELLER_USERNAME_POPULATE = {
  path: 'seller',
  select: 'username',
};

const BUYER_USERNAME_POPULATE = {
  path: 'buyer',
  select: 'username',
};

const CART_POPULATE = {
  path: 'cart.product',
  populate: SELLER_USERNAME_POPULATE,
};

const pages = {
  ALL_PRODUCTS: 'ALL_PRODUCTS',
  MY_PRODUCTS: 'MY_PRODUCTS',
  USER_PRODUCTS: 'USER_PRODUCTS',
};

const orderTypes = {
  PLACED_ORDERS: 'PLACED_ORDERS',
  SELL_HISTORY: 'SELL_HISTORY',
};

const updateCartActions = {
  INCREMENT: 'INCREMENT',
  DECREMENT: 'DECREMENT',
  NUMBER: 'NUMBER',
};

const MAX_CART_ITEMS_NUMBER = 50;

function MyError(message) {
  this.message = message;
}
MyError.prototype = new Error();

const DELIVERY_ADDRESS = {
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 12,
    validate(value) {
      if (!validator.isPostalCode(value, 'any')) {
        throw new Error('Enter valid zip code');
      }
    },
  },
  country: {
    type: String,
    required: true,
    maxlength: 60,
  },
  city: {
    type: String,
    required: true,
    maxlength: 100,
  },
  phone: {
    type: String,
    required: true,
  },
};

module.exports = {
  SELLER_USERNAME_POPULATE,
  BUYER_USERNAME_POPULATE,
  CART_POPULATE,
  pages,
  orderTypes,
  MyError,
  updateCartActions,
  MAX_CART_ITEMS_NUMBER,
  DELIVERY_ADDRESS,
};
