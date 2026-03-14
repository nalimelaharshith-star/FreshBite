// ─────────────────────────────────────────────
//  models/User.js
// ─────────────────────────────────────────────
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  name:   String,
  phone:  String,
  street: String,
  city:   String,
  pin:    String,
  state:  String
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  password: {
    type: String,
    minlength: 6,
    select: false   // never returned in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  provider: {
    type: String,
    enum: ['email', 'google', 'facebook'],
    default: 'email'
  },
  avatar: String,         // 2-letter initials
  phone: String,
  banned: {
    type: Boolean,
    default: false
  },
  savedAddress: addressSchema,
  notifications: {
    email:  { type: Boolean, default: true  },
    wa:     { type: Boolean, default: true  },
    promo:  { type: Boolean, default: false },
    push:   { type: Boolean, default: false }
  }
}, {
  timestamps: true   // adds createdAt and updatedAt automatically
});

// ── Hash password before saving ─────────────
userSchema.pre('save', async function (next) {
  // Only hash if password was actually modified
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Method: check password ──────────────────
userSchema.methods.checkPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ── Virtual: order count ────────────────────
// (resolved from orders collection, not stored here)

module.exports = mongoose.model('User', userSchema);
