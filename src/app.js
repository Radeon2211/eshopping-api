const express = require('express');
require('./db/mongoose');
const userRouter = require('./routers/userRouter');
const productRouter = require('./routers/productRouter');
const orderRouter = require('./routers/orderRouter');

const app = express();

app.use(express.json());
app.use(userRouter);
app.use(productRouter);
app.use(orderRouter);

module.exports = app;