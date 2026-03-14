// ─────────────────────────────────────────────
//  models/Order.js
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  name:  String,
  price: Number,
  emoji: String,
  img:   String,
  unit:  String,
  qty:   { type: Number, min: 1 }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  name:   String,
  phone:  String,
  street: String,
  city:   String,
  pin:    String,
  state:  String,
  note:   String  // delivery instructions
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  subtotal: Number,
  discount: { type: Number, default: 0 },
  promoCode: String,
  delivery: { type: Number, default: 0 },
  total: {
    type: Number,
    required: true
  },
  payment: {
    method: {
      type: String,
      enum: ['CARD', 'UPI', 'NETBANK', 'WALLET', 'COD', 'RAZORPAY'],
      required: true
    },
    razorpayId: String,   // Razorpay payment ID if applicable
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'paid'
    }
  },
  address: addressSchema,
  status: {
    type: String,
    enum: ['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
    default: 'Confirmed'
  },
  statusHistory: [{
    status: String,
    time: { type: Date, default: Date.now },
    note: String
  }],
  refundReason: String
}, {
  timestamps: true
});

// ── Auto-push to status history on status change ──
orderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});

// ── Index ────────────────────────────────────
orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
