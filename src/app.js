const express = require('express');
const cors = require('cors');
require('./db/mongoose');
const userRouter = require('./routers/userRouter');
const productRouter = require('./routers/productRouter');
const orderRouter = require('./routers/orderRouter');

const app = express();

const corsOptions = {
  origin: ['http://localhost'],
  allowedHeaders: [`Content-Type`, `Authorization`, `Access-Control-Allow-Methods`, `Access-Control-Request-Headers`],
  credentials: true,
  enablePreflight: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(userRouter);
app.use(productRouter);
app.use(orderRouter);

module.exports = app;