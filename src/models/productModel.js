const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 150,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 600,
  },
  price: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10,
  },
  quantity: {
    type: Number,
    required: true,
    max: 100000,
  },
  condition: {
    type: String,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  photo: {
    type: Buffer,
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;