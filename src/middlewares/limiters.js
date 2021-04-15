const rateLimit = require('express-rate-limit');
const { envModes } = require('../shared/constants');

const developmentMaxLimit = 100;

const unlessPhotoLimits = {
  maxLimit: 40,
  timeWindow: 30 * 1000,
  timeUnitNumber: '30',
};

const photoLimits = {
  maxLimit: 150,
  timeWindow: 30 * 1000,
  timeUnitNumber: '30',
};

const loginLimits = {
  maxLimit: 8,
  timeWindow: 30 * 60 * 1000,
  timeUnitNumber: '30',
};

const signupLimits = {
  maxLimit: 4,
  timeWindow: 40 * 60 * 1000,
  timeUnitNumber: '40',
};

const accountVerificationEmailLimits = {
  maxLimit: 3,
  timeWindow: 15 * 60 * 1000,
  timeUnitNumber: '15',
};

const verificationLinkLimits = {
  maxLimit: 4,
  timeWindow: 10 * 60 * 1000,
  timeUnitNumber: '10',
};

const resetPasswordLimits = {
  maxLimit: 4,
  timeWindow: 25 * 60 * 1000,
  timeUnitNumber: '25',
};

const changeEmailLimits = {
  maxLimit: 3,
  timeWindow: 30 * 60 * 1000,
  timeUnitNumber: '30',
};

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
  windowMs: unlessPhotoLimits.timeWindow,
  max: unlessPhotoLimits.maxLimit,
  message: {
    message: `Too many requests, please wait up to ${unlessPhotoLimits.timeUnitNumber} seconds`,
  },
});

const unlessPhotoLimiter = unlessGetPhoto(unlessPhotoConfig);

const photoLimiter = rateLimit({
  windowMs: photoLimits.timeWindow,
  max: photoLimits.maxLimit,
  message: {
    message: `Too many requests, please wait up to ${photoLimits.timeUnitNumber} seconds`,
  },
});

const loginLimiter = rateLimit({
  windowMs: loginLimits.timeWindow,
  max: process.env.MODE === envModes.DEVELOPMENT ? developmentMaxLimit : loginLimits.maxLimit,
  message: {
    message: `Too many failed login attemps, please wait up to ${loginLimits.timeUnitNumber} minutes`,
  },
  skipSuccessfulRequests: true,
});

const signupLimiter = rateLimit({
  windowMs: signupLimits.timeWindow,
  max: process.env.MODE === envModes.DEVELOPMENT ? developmentMaxLimit : signupLimits.maxLimit,
  message: {
    message: `Too many signup attemps, please wait up to ${signupLimits.timeUnitNumber} minutes`,
  },
  skipFailedRequests: true,
});

const accountVerificationEmailLimiter = rateLimit({
  windowMs: accountVerificationEmailLimits.timeWindow,
  max:
    process.env.MODE === envModes.DEVELOPMENT
      ? developmentMaxLimit
      : accountVerificationEmailLimits.maxLimit,
  message: {
    message: `Too many requests for sending verification email, please wait up to ${accountVerificationEmailLimits.timeUnitNumber} minutes`,
  },
  skipFailedRequests: true,
});

const verificationLinkLimiter = rateLimit({
  windowMs: verificationLinkLimits.timeWindow,
  max:
    process.env.MODE === envModes.DEVELOPMENT
      ? developmentMaxLimit
      : verificationLinkLimits.maxLimit,
  message: {
    message: `Too many requests for account verification, please wait up to ${verificationLinkLimits.timeUnitNumber} minutes`,
  },
});

const resetPasswordRequestLimiter = rateLimit({
  windowMs: resetPasswordLimits.timeWindow,
  max:
    process.env.MODE === envModes.DEVELOPMENT ? developmentMaxLimit : resetPasswordLimits.maxLimit,
  message: {
    message: `Too many requests for password reset, please wait up to ${resetPasswordLimits.timeUnitNumber} minutes`,
  },
  skipFailedRequests: true,
});

const changeEmailLimiter = rateLimit({
  windowMs: changeEmailLimits.timeWindow,
  max: process.env.MODE === envModes.DEVELOPMENT ? developmentMaxLimit : changeEmailLimits.maxLimit,
  message: {
    message: `Too many requests for email address change, please wait up to ${changeEmailLimits.timeUnitNumber} minutes`,
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
  changeEmailLimiter,
};
