const rateLimit = require('express-rate-limit');

const unlessGetPhoto = (middleware) => async (req, res, next) => {
  try {
    if (req.path.includes('/photo') && req.method === 'GET') {
      return next();
    }
    return middleware(req, res, next);
  } catch (err) {
    res.status(500).send(err);
  }
};

const unlessPhotoConfig = rateLimit({
  windowMs: 30 * 1000,
  max: 30,
  message: {
    message: 'Too many requests, please wait up to 30 seconds',
  },
});

const unlessPhotoLimiter = unlessGetPhoto(unlessPhotoConfig);

const photoLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 100,
  message: {
    message: 'Too many requests, please wait up to 30 seconds',
  },
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    message: 'Too many login attemps, please wait up to 5 minutes',
  },
});

module.exports = {
  unlessGetPhoto,
  unlessPhotoLimiter,
  photoLimiter,
  loginLimiter,
};
