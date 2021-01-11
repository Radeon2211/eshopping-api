const User = require('../models/userModel');
const Product = require('../models/productModel');
const { SELLER_USERNAME_POPULATE, CART_POPULATE } = require('./constants');

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

const getCorrectProduct = (product, getSeller = false) => {
  let seller = {};
  if (getSeller) {
    seller = {
      username: product.seller.username,
    };
  }
  return {
    ...product,
    photo: Boolean(product.photo),
    ...seller,
  };
};

const getCorrectOrders = (orders) => {
  const correctOrders = orders.map((order) => {
    const correctProducts = order.products.map((product) => getCorrectProduct(product));
    return {
      ...order,
      products: correctProducts,
    };
  });
  return correctOrders;
};

const getFullUser = async (userId) => {
  const user = await User.findById(userId).populate(CART_POPULATE).lean();

  const updatedCart = user.cart.map((item) => ({
    ...item,
    product: getCorrectProduct(item.product, true),
  }));

  user.cart = updatedCart;

  delete user.password;
  delete user.tokens;

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
  seller: {
    username: seller.username,
  },
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
      .populate(SELLER_USERNAME_POPULATE)
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

const getOrderProduct = ({ _id, name, price, quantity, photo, seller }) => ({
  _id,
  name,
  price,
  quantity,
  photo,
  seller: seller._id,
});

const verifyItemsToBuy = async (items, currentUserId) => {
  const transaction = [];
  const orderProducts = [];
  let isDifferent = false;
  let isBuyingOwnProducts = false;

  for (const item of items) {
    const productDetails = await Product.findById(item._id).populate('seller').lean();
    if (productDetails) {
      if (productDetails.seller._id.equals(currentUserId)) {
        isBuyingOwnProducts = true;
      }

      if (productDetails.quantity < item.quantity) {
        transaction.push(getTransactionProduct(productDetails));
        orderProducts.push(getOrderProduct(productDetails));
        isDifferent = true;
      } else {
        transaction.push({
          ...getTransactionProduct(productDetails),
          quantity: item.quantity,
        });
        orderProducts.push({
          ...getOrderProduct(productDetails),
          quantity: item.quantity,
        });
      }
    } else {
      isDifferent = true;
    }
  }

  return { transaction, orderProducts, isDifferent, isBuyingOwnProducts };
};

const splitOrderProducts = (products) => {
  const sellersObject = products.reduce((acc, item) => {
    if (!acc[item.seller]) {
      acc[item.seller] = {
        products: [],
        seller: item.seller,
      };
    }
    acc[item.seller].products.push({
      ...item,
      seller: undefined,
    });
    return acc;
  }, {});

  const sellersArray = Object.entries(sellersObject).map(([seller, rest]) => ({
    seller,
    ...rest,
  }));

  return sellersArray;
};

module.exports = {
  createSortObject,
  getCorrectProduct,
  getCorrectOrders,
  getFullUser,
  updateUserCart,
  verifyItemsToTransaction,
  verifyItemsToBuy,
  splitOrderProducts,
};
