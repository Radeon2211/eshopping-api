const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { userStatuses, authMiddlewaresErrorMessage, envModes } = require('../shared/constants');

const authPending = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id, 'tokens.token': token });
    if (!user) {
      throw new Error();
    }
    req.token = token;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).send({ message: authMiddlewaresErrorMessage });
  }
};

const authActive = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id, 'tokens.token': token });
    if (user?.status !== userStatuses.ACTIVE) {
      throw new Error();
    }
    req.token = token;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).send({ message: authMiddlewaresErrorMessage });
  }
};

const e2eAuth = async (_, res, next) => {
  try {
    if (process.env.MODE !== envModes.E2E_TESTING) {
      throw new Error();
    }
    next();
  } catch (err) {
    res.status(401).send({ message: authMiddlewaresErrorMessage });
  }
};

module.exports = {
  authPending,
  authActive,
  e2eAuth,
};
