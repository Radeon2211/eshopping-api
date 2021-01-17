const rateLimit = require('express-rate-limit');

const photoLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 100,
  message: {
    message: 'Too many requests, please wait 30 seconds',
  },
});

module.exports = photoLimiter;
