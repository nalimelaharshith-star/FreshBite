// ─────────────────────────────────────────────
//  routes/users.js  (admin only)
//  GET    /api/users               → all users
//  GET    /api/users/:id           → single user
//  PATCH  /api/users/:id/role      → change role
//  PATCH  /api/users/:id/ban       → ban/unban
//  DELETE /api/users/:id           → delete user
// ─────────────────────────────────────────────
const router = require('express').Router();
const User   = require('../models/User');
const Order  = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

// All routes here require admin
router.use(protect, adminOnly);

// ─────────────────────────────────────────────
//  ALL USERS
//  GET /api/users?page=1&limit=20&role=user
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      User.countDocuments(filter)
    ]);

    // Attach order count per user
    const userIds = users.map(u => u._id);
    const orderCounts = await Order.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 }, spent: { $sum: '$total' } } }
    ]);
    const countMap = {};
    orderCounts.forEach(o => { countMap[o._id.toString()] = o; });

    const enriched = users.map(u => ({
      ...u.toObject(),
      orderCount: countMap[u._id.toString()]?.count || 0,
      totalSpent: countMap[u._id.toString()]?.spent || 0
    }));

    res.json({ users: enriched, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  SINGLE USER WITH ORDER HISTORY
//  GET /api/users/:id
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const orders = await Order.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ user, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  CHANGE USER ROLE
//  PATCH /api/users/:id/role
//  Body: { role: 'admin' }
// ─────────────────────────────────────────────
router.patch('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ error: 'Role must be "user" or "admin".' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  BAN / UNBAN USER
//  PATCH /api/users/:id/ban
//  Body: { banned: true }
// ─────────────────────────────────────────────
router.patch('/:id/ban', async (req, res) => {
  try {
    const { banned } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { banned: !!banned },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      success: true,
      message: `User ${user.name} has been ${banned ? 'banned' : 'unbanned'}.`,
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  DELETE USER (permanent)
//  DELETE /api/users/:id
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ error: 'You cannot delete your own account.' });

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ success: true, message: `${user.name} deleted permanently.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
