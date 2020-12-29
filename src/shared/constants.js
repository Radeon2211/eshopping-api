const CART_POPULATE = {
  path: 'cart.product',
  populate: {
    path: 'seller',
    select: 'username',
  },
};

const PRODUCT_SELLER_POPULATE = {
  path: 'seller',
  select: 'username',
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

module.exports = {
  CART_POPULATE,
  PRODUCT_SELLER_POPULATE,
  pages,
  MyError,
  updateCartActions,
  MAX_CART_ITEMS_NUMBER,
};
