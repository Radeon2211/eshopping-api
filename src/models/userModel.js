const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const uniqueValidator = require('mongoose-beautiful-unique-validation');
const Product = require('./productModel');
const VerificationCode = require('./verificationCodeModel');
const {
  MyError,
  DELIVERY_ADDRESS,
  verificationCodeTypes,
  userStatuses,
} = require('../shared/constants');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
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
      unique: true,
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
    isAdmin: {
      type: Boolean,
    },
    status: {
      type: String,
      required: true,
      enum: [userStatuses.PENDING, userStatuses.ACTIVE],
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
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
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

userSchema.methods.generateVerificationCode = async function (type, newEmail) {
  const user = this;
  const randomCode = uuidv4();

  const verificationCode = new VerificationCode({
    email: user.email,
    code: randomCode,
    type,
    newEmail: newEmail || undefined,
  });
  await verificationCode.save();

  let verificationLink = '';
  switch (type) {
    case verificationCodeTypes.ACCOUNT_ACTIVATION:
      verificationLink = `${process.env.API_URL}/users/${user._id}/verify-account/${randomCode}`;
      break;
    case verificationCodeTypes.RESET_PASSWORD:
      verificationLink = `${process.env.API_URL}/users/${user._id}/reset-password/${randomCode}`;
      break;
    case verificationCodeTypes.CHANGE_EMAIL:
      verificationLink = `${process.env.API_URL}/users/${user._id}/change-email/${randomCode}`;
      break;
    default:
      return '';
  }
  return verificationLink;
};

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, +process.env.BCRYPT_ROUNDS);
  }
  next();
});

userSchema.pre('remove', async function (next) {
  const user = this;
  await Product.deleteMany({ seller: user._id });
  await VerificationCode.deleteMany({ email: user.email });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
