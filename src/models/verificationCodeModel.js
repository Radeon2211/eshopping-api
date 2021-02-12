const mongoose = require('mongoose');
const validator = require('validator');
const { verificationCodeTypes } = require('../shared/constants');

const verificationCodeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      unique: false,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error(`Secret code's email is invalid`);
        }
      },
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [verificationCodeTypes.ACCOUNT_VERIFICATION, verificationCodeTypes.RESET_PASSWORD],
    },
    expireAt: {
      type: Date,
      default: Date.now,
      expires: 10 * 60,
    },
  },
  {
    versionKey: false,
  },
);

const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);

module.exports = VerificationCode;
