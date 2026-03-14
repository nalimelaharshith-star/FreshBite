// ─────────────────────────────────────────────
//  routes/auth.js
//  POST /api/auth/register
//  POST /api/auth/login
//  GET  /api/auth/me
//  PUT  /api/auth/address
//  PUT  /api/auth/notifications
//  POST /api/auth/social
// ─────────────────────────────────────────────
const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { protect } = require('../middleware/auth');

// ── Helper: generate token ───────────────────
const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ── Helper: safe user object ─────────────────
const safeUser = (u) => ({
  id:     u._id,
  name:   u.name,
  email:  u.email,
  role:   u.role,
  avatar: u.avatar,
  phone:  u.phone,
  savedAddress:  u.savedAddress,
  notifications: u.notifications,
  createdAt: u.createdAt
});

// ─────────────────────────────────────────────
//  REGISTER
//  POST /api/auth/register
//  Body: { name, email, password }
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ error: 'This email is already registered. Please log in.' });

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      avatar: name.trim().slice(0, 2).toUpperCase()
    });

    const token = makeToken(user._id);
    res.status(201).json({ token, user: safeUser(user) });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  LOGIN
//  POST /api/auth/login
//  Body: { email, password }
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    // Must explicitly select password (it's hidden by default in the model)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user)
      return res.status(400).json({ error: 'No account found with this email.' });

    if (user.banned)
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });

    const ok = await user.checkPassword(password);
    if (!ok)
      return res.status(400).json({ error: 'Incorrect password.' });

    const token = makeToken(user._id);
    res.json({ token, user: safeUser(user) });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  SOCIAL LOGIN (Google / Facebook — simulated)
//  POST /api/auth/social
//  Body: { name, email, provider }
//  In production: verify ID token from Google/Facebook SDK first
// ─────────────────────────────────────────────
router.post('/social', async (req, res) => {
  try {
    const { name, email, provider } = req.body;
    if (!name || !email || !provider)
      return res.status(400).json({ error: 'name, email and provider are required.' });

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        provider,
        avatar: name.slice(0, 2).toUpperCase()
      });
    }

    if (user.banned)
      return res.status(403).json({ error: 'Account suspended.' });

    const token = makeToken(user._id);
    res.json({ token, user: safeUser(user) });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET CURRENT USER
//  GET /api/auth/me
//  Requires: Bearer token
// ─────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  SAVE DELIVERY ADDRESS
//  PUT /api/auth/address
//  Requires: Bearer token
//  Body: { name, phone, street, city, pin, state }
// ─────────────────────────────────────────────
router.put('/address', protect, async (req, res) => {
  try {
    const { name, phone, street, city, pin, state, note } = req.body;
    if (!name || !phone || !street || !city || !pin)
      return res.status(400).json({ error: 'All address fields are required.' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { savedAddress: { name, phone, street, city, pin, state, note } },
      { new: true }
    );
    res.json({ success: true, address: user.savedAddress });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  UPDATE NOTIFICATION PREFERENCES
//  PUT /api/auth/notifications
//  Requires: Bearer token
//  Body: { email, wa, promo, push }  (booleans)
// ─────────────────────────────────────────────
router.put('/notifications', protect, async (req, res) => {
  try {
    const { email, wa, promo, push } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { notifications: { email, wa, promo, push } },
      { new: true }
    );
    res.json({ success: true, notifications: user.notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
