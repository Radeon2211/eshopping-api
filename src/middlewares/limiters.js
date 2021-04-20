const rateLimit = require('express-rate-limit');
const { isDevOrE2EMode } = require('../shared/utility');

const devAndE2EMaxLimit = 500;
const yieldMaxLimit = (limit) => (!isDevOrE2EMode() ? limit : devAndE2EMaxLimit);

const unlessPhotoLimits = {
  maxLimit: yieldMaxLimit(50),
  timeWindow: 30 * 1000,
  timeUnitNumber: '30',
};

const photoLimits = {
  maxLimit: yieldMaxLimit(150),
  timeWindow: 30 * 1000,
  timeUnitNumber: '30',
};

const loginLimits = {
  maxLimit: yieldMaxLimit(8),
  timeWindow: 30 * 60 * 1000,
  timeUnitNumber: '30',
};

const signupLimits = {
  maxLimit: yieldMaxLimit(4),
  timeWindow: 40 * 60 * 1000,
  timeUnitNumber: '40',
};

const accountVerificationEmailLimits = {
  maxLimit: yieldMaxLimit(3),
  timeWindow: 15 * 60 * 1000,
  timeUnitNumber: '15',
};

const verificationLinkLimits = {
  maxLimit: yieldMaxLimit(4),
  timeWindow: 10 * 60 * 1000,
  timeUnitNumber: '10',
};

const resetPasswordLimits = {
  maxLimit: yieldMaxLimit(4),
  timeWindow: 25 * 60 * 1000,
  timeUnitNumber: '25',
};

const changeEmailLimits = {
  maxLimit: yieldMaxLimit(3),
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
  max: loginLimits.maxLimit,
  message: {
    message: `Too many failed login attemps, please wait up to ${loginLimits.timeUnitNumber} minutes`,
  },
  skipSuccessfulRequests: true,
});

const signupLimiter = rateLimit({
  windowMs: signupLimits.timeWindow,
  max: signupLimits.maxLimit,
  message: {
    message: `Too many signup attemps, please wait up to ${signupLimits.timeUnitNumber} minutes`,
  },
  skipFailedRequests: true,
});

const accountVerificationEmailLimiter = rateLimit({
  windowMs: accountVerificationEmailLimits.timeWindow,
  max: accountVerificationEmailLimits.maxLimit,
  message: {
    message: `Too many requests for sending verification email, please wait up to ${accountVerificationEmailLimits.timeUnitNumber} minutes`,
  },
  skipFailedRequests: true,
});

const verificationLinkLimiter = rateLimit({
  windowMs: verificationLinkLimits.timeWindow,
  max: verificationLinkLimits.maxLimit,
  message: {
    message: `Too many requests for account verification, please wait up to ${verificationLinkLimits.timeUnitNumber} minutes`,
  },
});

const resetPasswordRequestLimiter = rateLimit({
  windowMs: resetPasswordLimits.timeWindow,
  max: resetPasswordLimits.maxLimit,
  message: {
    message: `Too many requests for password reset, please wait up to ${resetPasswordLimits.timeUnitNumber} minutes`,
  },
  skipFailedRequests: true,
});

const changeEmailLimiter = rateLimit({
  windowMs: changeEmailLimits.timeWindow,
  max: changeEmailLimits.maxLimit,
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
