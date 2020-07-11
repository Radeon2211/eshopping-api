const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Product = require('./productModel');
const Order = require('./orderModel');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Enter valid email address');
      }
    }
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
    trim: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
    validate(value) {
      if (!validator.isPostalCode(value, 'any')) {
        throw new Error("Enter valid zip code");
      }
    }
  },
  country: {
    type: String,
    required: true,
    maxlength: 60,
  },
  city: {
    type: String,
    required: true,
    maxlength: 100,
  },
  phone: {
    type: String,
    required: true,
  },
  tokens: [{
    token: {
      type: String,
      required: true,
    },
  }],
}, {
  timestamps: true,
});

userSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.tokens;
  return userObject;
};

userSchema.methods.getPublicProfile = function() {
  const { email, username } = this;
  const publicProfile = {
    email,
    username,
  };
  return publicProfile;
};

userSchema.methods.generateAuthToken = async function() {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Incorrect credentials');
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Incorrect credentials');
  }
  return user;
};

userSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

userSchema.pre('remove', async function (next) {
  const user = this;
  await Product.deleteMany({ seller: user._id });
  await Order.updateMany({ seller: user._id });
  await Order.updateMany({ buyer: user._id });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;