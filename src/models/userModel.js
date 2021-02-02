const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const uniqueValidator = require('mongoose-beautiful-unique-validation');
const Product = require('./productModel');
const { MyError, DELIVERY_ADDRESS } = require('../shared/constants');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: 'Email address is already taken',
      trim: true,
      uniqueCaseInsensitive: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Enter valid email address');
        }
      },
    },
    username: {
      type: String,
      required: true,
      unique: 'Username is already taken',
      minlength: 3,
      maxlength: 20,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 7,
      maxlength: 64,
      trim: true,
    },
    ...DELIVERY_ADDRESS,
    contacts: {
      email: {
        type: Boolean,
        required: true,
      },
      phone: {
        type: Boolean,
        required: true,
      },
    },
    cart: [
      {
        quantity: {
          type: Number,
          required: true,
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
      },
    ],
    isAdmin: {
      type: Boolean,
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

userSchema.plugin(uniqueValidator);

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.tokens;
  return userObject;
};

userSchema.methods.getPublicProfile = function () {
  const { email, username, phone, contacts } = this;
  const extraInfo = {};
  if (contacts.email) {
    extraInfo.email = email;
  }
  if (contacts.phone) {
    extraInfo.phone = phone;
  }
  const publicProfile = {
    username,
    ...extraInfo,
  };
  return publicProfile;
};

userSchema.methods.checkCurrentCredentials = async function (updates, data) {
  const user = this;
  if (!data.currentPassword) {
    throw new MyError('You must provide current password');
  }
  const isPasswordCorrect = await bcrypt.compare(data.currentPassword, user.password);
  if (!isPasswordCorrect) {
    throw new MyError('Current password is incorrect');
  }
  if (updates.includes('email')) {
    if (data.email === user.email) {
      throw new MyError('New email is the same as current email');
    }
  }
  if (updates.includes('password')) {
    const isPasswordTheSame = await bcrypt.compare(data.password, user.password);
    if (isPasswordTheSame) {
      throw new MyError('New password is the same as current password');
    }
  }
  const correctedUpdates = updates.filter((update) => update !== 'currentPassword');
  return correctedUpdates;
};

userSchema.methods.checkCurrentPassword = async function (data) {
  const user = this;
  if (!data.currentPassword) {
    throw new MyError('You must provide current password');
  }
  const isPasswordCorrect = await bcrypt.compare(data.currentPassword, user.password);
  if (!isPasswordCorrect) {
    throw new MyError('Current password is incorrect');
  }
};

userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  user.tokens = user.tokens.concat({ token });
  const tokensLength = user.tokens.length;
  if (tokensLength > 10) {
    user.tokens = user.tokens.slice(tokensLength - 10);
  }
  await user.save();
  return token;
};

userSchema.statics.findByCredentials = async (email, password) => {
  // eslint-disable-next-line no-use-before-define
  const user = await User.findOne({ email });
  let passwordToCompare = '';
  if (user) {
    passwordToCompare = user.password;
  }
  const isPasswordCorrect = await bcrypt.compare(password, passwordToCompare);
  if (user && isPasswordCorrect) {
    return user;
  }
  throw new MyError('You entered incorrect credentials');
};

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 12);
  }
  next();
});

userSchema.pre('remove', async function (next) {
  const user = this;
  await Product.deleteMany({ seller: user._id });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
