const express = require('express');
const Agenda = require('agenda');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const parameterPollution = require('hpp');
const cors = require('cors');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
require('./db/mongoose');
const userRouter = require('./routers/userRouter');
const productRouter = require('./routers/productRouter');
const orderRouter = require('./routers/orderRouter');
const { unlessPhotoLimiter } = require('./middlewares/limiters');
const { agendaRemoveExpiredUser } = require('./shared/utility');
const { envModes } = require('./shared/constants');

const app = express();

app.enable('trust proxy');

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://192.168.1.109:3000', 'https://radeon2211.github.io'],
    credentials: true,
  }),
);

app.use(xss());

app.use(parameterPollution());

if (process.env.MODE !== envModes.TESTING) {
  app.use(unlessPhotoLimiter);
}

app.use(helmet());
app.use(helmet.hidePoweredBy());

app.use(cookieParser());

const csrfProtection = csrf({ cookie: true });

app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use(express.json());

app.use(
  mongoSanitize({
    replaceWith: '_',
  }),
);

app.use(userRouter);
app.use(productRouter);
app.use(orderRouter);

const agenda = new Agenda({
  db: {
    address: process.env.MONGODB_URL,
    options: {
      useUnifiedTopology: true,
    },
  },
});

agenda.define('remove expired users', async () => {
  await agendaRemoveExpiredUser();
});

(async function () {
  await agenda.start();
  await agenda.every('1 minute', 'remove expired users');
})();

module.exports = app;
