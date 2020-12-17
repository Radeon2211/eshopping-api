const createSortObject = (req) => {
  const sort = {};
  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(':');
    sort[parts[0]] = parts[1] === 'asc' ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }
  return sort;
};

const CART_POPULATE = {
  path: 'cart.product',
  populate: {
    path: 'seller',
    select: 'username',
  },
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
  createSortObject,
  CART_POPULATE,
  pages,
  MyError,
  updateCartActions,
  MAX_CART_ITEMS_NUMBER,
};
