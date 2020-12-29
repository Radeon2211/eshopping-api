const mongoose = require('mongoose');
const validator = require('validator');

const orderSchema = new mongoose.Schema(
  {
    products: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        name: {
          type: String,
          required: true,
        },
        photo: {
          type: Buffer,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: String,
          required: true,
        },
      },
    ],
    overallPrice: {
      type: String,
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    deliveryAddress: {
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
            throw new Error('Enter valid zip code');
          }
        },
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
    },
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
