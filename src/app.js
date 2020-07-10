const express = require('express');
require('./db/mongoose');
const userRouter = require('./routers/userRouter');
const productRouter = require('./routers/productRouter');

const app = express();

app.use(express.json());
app.use(userRouter);
app.use(productRouter);

module.exports = app;