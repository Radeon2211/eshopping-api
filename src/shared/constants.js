const validator = require('validator');

const SELLER_USERNAME_POPULATE = {
  path: 'seller',
  select: 'username -_id',
};

const BUYER_USERNAME_POPULATE = {
  path: 'buyer',
  select: 'username -_id',
};

const ORDER_SELLER_POPULATE = {
  path: 'seller',
  select: 'username email phone -_id',
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

const productConditions = {
  NEW: 'new',
  USED: 'used',
  NOT_APPLICABLE: 'not_applicable',
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

const verificationCodeTypes = {
  ACCOUNT_ACTIVATION: 'ACCOUNT_ACTIVATION',
  RESET_PASSWORD: 'RESET_PASSWORD',
  CHANGE_EMAIL: 'CHANGE_EMAIL',
};

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
    trim: true,
    minlength: 8,
    maxlength: 21,
    validate(value) {
      const pattern = /^\+[0-9]{1,4} [\d-]{5,15}$/;
      const isValid = value.match(pattern);
      if (!isValid) {
        throw new Error('Enter valid phone number');
      }
    },
  },
};

module.exports = {
  SELLER_USERNAME_POPULATE,
  BUYER_USERNAME_POPULATE,
  ORDER_SELLER_POPULATE,
  CART_POPULATE,
  pages,
  productConditions,
  orderTypes,
  updateCartActions,
  MAX_CART_ITEMS_NUMBER,
  verificationCodeTypes,
  MyError,
  DELIVERY_ADDRESS,
};
