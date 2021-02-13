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
  max: 40,
  message: {
    message: 'Too many requests, please wait up to 30 seconds',
  },
});

const unlessPhotoLimiter = unlessGetPhoto(unlessPhotoConfig);

const photoLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 150,
  message: {
    message: 'Too many requests, please wait up to 30 seconds',
  },
});

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 8,
  message: {
    message: 'Too many failed login attemps, please wait up to 30 minutes',
  },
  skipSuccessfulRequests: true,
});

const signupLimiter = rateLimit({
  windowMs: 40 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 4,
  message: {
    message: 'Too many signup attemps, please wait up to 40 minutes',
  },
  skipFailedRequests: true,
});

const accountVerificationEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 3,
  message: {
    message: 'Too many requests for sending verification email, please wait up to 15 minutes',
  },
  skipFailedRequests: true,
});

const verificationLinkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 4,
  message: {
    message: 'Too many requests for account verification, please wait up to 10 minutes',
  },
});

const resetPasswordRequestLimiter = rateLimit({
  windowMs: 25 * 60 * 1000,
  max: process.env.MODE === 'development' ? 100 : 4,
  message: {
    message: 'Too many requests for password reset, please wait up to 25 minutes',
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
