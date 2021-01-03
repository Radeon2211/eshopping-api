const User = require('../models/userModel');
const Product = require('../models/productModel');
const { PRODUCT_SELLER_POPULATE, CART_POPULATE } = require('./constants');

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

const getCorrectProduct = (product) => ({
  ...product,
  photo: Boolean(product.photo),
});

const getFullUser = async (userId) => {
  const user = await User.findById(userId).populate(CART_POPULATE).lean();
  const updatedCart = user.cart.map((item) => ({
    ...item,
    product: getCorrectProduct(item.product),
  }));
  user.cart = updatedCart;
  return user;
};

const checkCartDifference = (cart1, cart2) => JSON.stringify(cart1) !== JSON.stringify(cart2);

const verifyCart = async (cart) => {
  const parsedCart = JSON.parse(JSON.stringify(cart));
  const verifiedCart = [];
  for (const item of parsedCart) {
    const productDetails = await Product.findById(item.product).lean();
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

const getTransactionProduct = ({ _id, name, price, quantity, photo, seller }) => ({
  _id,
  name,
  price,
  quantity,
  photo: Boolean(photo),
  seller,
});

const verifyItemsToTransaction = async (items, updateCart, user) => {
  if (updateCart) {
    await updateUserCart(user, items);
  }
  const parsedItems = JSON.parse(JSON.stringify(items));
  const transaction = [];
  let isDifferent = false;
  for (const item of parsedItems) {
    const productDetails = await Product.findById(item.product)
      .populate(PRODUCT_SELLER_POPULATE)
      .lean();
    if (productDetails) {
      if (productDetails.quantity < item.quantity) {
        transaction.push(getTransactionProduct(productDetails));
        isDifferent = true;
      } else {
        transaction.push({
          ...getTransactionProduct(productDetails),
          quantity: item.quantity,
        });
      }
    } else {
      isDifferent = true;
    }
  }
  return { transaction, isDifferent };
};

module.exports = {
  createSortObject,
  getCorrectProduct,
  getFullUser,
  updateUserCart,
  verifyItemsToTransaction,
};
