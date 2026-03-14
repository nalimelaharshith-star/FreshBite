// ─────────────────────────────────────────────
//  models/Product.js
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  desc: {
    type: String,
    required: [true, 'Description is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be at least 1']
  },
  orig: {
    type: Number,  // Original price before discount (optional)
    default: null
  },
  cat: {
    type: String,
    enum: ['cookies', 'vegetables'],
    required: [true, 'Category is required']
  },
  emoji: {
    type: String,
    default: '🛍️'
  },
  img: {
    type: String,  // Image URL
    default: ''
  },
  unit: {
    type: String,
    required: [true, 'Unit description is required']
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  feat: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true   // soft delete — set to false instead of deleting
  }
}, {
  timestamps: true
});

// ── Index for fast searching ─────────────────
productSchema.index({ name: 'text', desc: 'text' });
productSchema.index({ cat: 1, feat: -1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
