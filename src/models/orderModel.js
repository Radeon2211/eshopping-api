const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  products: [{
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
    totalPrice: {
      type: String,
      required: true,
    },
  }],
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
}, {
  timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;