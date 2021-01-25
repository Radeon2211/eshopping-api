const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const getCurrentUser = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id, 'tokens.token': token });
    req.user = user;
    next();
  } catch (err) {
    req.user = undefined;
    next();
  }
};

module.exports = getCurrentUser;
