const validator = require('validator');

const PRODUCT_SELLER_POPULATE = {
  path: 'seller',
  select: 'username',
};

const CART_POPULATE = {
  path: 'cart.product',
  populate: PRODUCT_SELLER_POPULATE,
};

const pages = {
  ALL_PRODUCTS: 'ALL_PRODUCTS',
  MY_PRODUCTS: 'MY_PRODUCTS',
  USER_PRODUCTS: 'USER_PRODUCTS',
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
};

module.exports = {
  PRODUCT_SELLER_POPULATE,
  CART_POPULATE,
  pages,
  MyError,
  updateCartActions,
  MAX_CART_ITEMS_NUMBER,
  DELIVERY_ADDRESS,
};
