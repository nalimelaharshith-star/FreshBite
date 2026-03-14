// ─────────────────────────────────────────────
//  models/Review.js
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name:     String,   // cached from user at time of review
  stars: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  text: {
    type: String,
    required: true,
    trim: true,
    minlength: 5
  },
  verified: {
    type: Boolean,
    default: false   // true if userId placed an order for this product
  },
  approved: {
    type: Boolean,
    default: true    // set to false to hide a review (soft moderation)
  }
}, {
  timestamps: true
});

// One review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
