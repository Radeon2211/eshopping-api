const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const parameterPollution = require('hpp');
const cors = require('cors');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
require('./db/mongoose');
const userRouter = require('./routers/userRouter');
const productRouter = require('./routers/productRouter');
const orderRouter = require('./routers/orderRouter');

const app = express();

app.enable('trust proxy');

app.use(
  cors({
    origin: ['http://192.168.1.109:3000', 'https://radeon2211.github.io'],
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: 30 * 1000,
  max: 30,
  message: {
    message: 'Too many requests, please wait 30 seconds',
  },
});

app.use(parameterPollution());

const unlessPhoto = (middleware) => (req, res, next) => {
  if (req.path.includes('/photo')) {
    return next();
  }
  return middleware(req, res, next);
};

app.use(unlessPhoto(limiter));

app.use(helmet());
app.use(helmet.hidePoweredBy());

app.use(cookieParser());

const csrfProtection = csrf({
  cookie: true,
});

app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use(express.json());
app.use(userRouter);
app.use(productRouter);
app.use(orderRouter);

module.exports = app;
