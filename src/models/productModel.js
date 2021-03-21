const mongoose = require('mongoose');
const { productConditions } = require('../shared/constants');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 150,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 800,
    },
    price: {
      type: Number,
      required: true,
      min: 0.01,
      max: 1000000,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    condition: {
      type: String,
      required: true,
      trim: true,
      enum: [productConditions.NEW, productConditions.USED, productConditions.NOT_APPLICABLE],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    photo: {
      type: Buffer,
    },
    quantitySold: {
      type: Number,
      min: 0,
      default: 0,
    },
    buyerQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
