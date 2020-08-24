const express = require('express');
const cors = require('cors');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
require('./db/mongoose');
const userRouter = require('./routers/userRouter');
const productRouter = require('./routers/productRouter');
const orderRouter = require('./routers/orderRouter');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.109:3000', 'https://radeon2211.github.io'],
  credentials: true,
}));

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