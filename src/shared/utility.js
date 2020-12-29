const Product = require('../models/productModel');

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

const checkCartDifference = (cart1, cart2) => JSON.stringify(cart1) !== JSON.stringify(cart2);

const verifyCart = async (cart) => {
  const parsedCart = JSON.parse(JSON.stringify(cart));
  const verifiedCart = [];
  for (const item of parsedCart) {
    const productDetails = await Product.findById(item.product);
    if (productDetails) {
      if (productDetails.quantity < item.quantity) {
        verifiedCart.push({
          ...item,
          quantity: productDetails.quantity,
        });
      } else {
        verifiedCart.push(item);
      }
    }
  }
  return verifiedCart;
};

const updateUserCart = async (user, cart) => {
  const verifiedCart = await verifyCart(cart);
  // eslint-disable-next-line no-param-reassign
  user.cart = verifiedCart;
  await user.save();
  const isCartDifferent = checkCartDifference(cart, verifiedCart);
  return isCartDifferent;
};

module.exports = {
  createSortObject,
  updateUserCart,
};
