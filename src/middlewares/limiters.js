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
  windowMs: 30 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 7,
  message: {
    message: 'Too many failed login attemps, please wait up to 30 minutes',
  },
  skipSuccessfulRequests: true,
});

const signupLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 2,
  message: {
    message: 'Too many signup attemps, please wait up to 30 minutes',
  },
  skipFailedRequests: true,
});

const accountVerificationEmailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 2,
  message: {
    message: 'Too many requests for sending verification email, please wait up to 10 minutes',
  },
  skipFailedRequests: true,
});

const verificationLinkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 5,
  message: {
    message: 'Too many requests for account verification, please wait up to 10 minutes',
  },
});

const resetPasswordRequestLimiter = rateLimit({
  windowMs: 20 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 2,
  message: {
    message: 'Too many requests for password reset, please wait up to 20 minutes',
  },
  skipFailedRequests: true,
});

module.exports = {
  unlessGetPhoto,
  unlessPhotoLimiter,
  photoLimiter,
  loginLimiter,
  signupLimiter,
  accountVerificationEmailLimiter,
  verificationLinkLimiter,
  resetPasswordRequestLimiter,
};
