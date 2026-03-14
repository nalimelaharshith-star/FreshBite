// ─────────────────────────────────────────────
//  middleware/auth.js
//  Protects routes — verifies JWT token
// ─────────────────────────────────────────────
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Require login ────────────────────────────
const protect = async (req, res, next) => {
  try {
    // Token comes in header: Authorization: Bearer <token>
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach full user to request (exclude password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    if (user.banned) return res.status(403).json({ error: 'Your account has been suspended.' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
};

// ── Require admin role ───────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

// ── Optional auth (attaches user if token present, doesn't fail if not) ──
const optionalAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch { /* ignore */ }
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
