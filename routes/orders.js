// ─────────────────────────────────────────────
//  routes/orders.js
//  POST   /api/orders              → place order (auth)
//  GET    /api/orders/my           → my orders (auth)
//  GET    /api/orders/:id          → single order (auth)
//  GET    /api/orders              → all orders (admin)
//  PATCH  /api/orders/:id/status   → update status (admin)
//  POST   /api/orders/:id/refund   → refund order (admin)
//  GET    /api/orders/analytics    → sales summary (admin)
// ─────────────────────────────────────────────
const router  = require('express').Router();
const Order   = require('../models/Order');
const Product = require('../models/Product');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// ── Promo codes (same as frontend) ──────────
const PROMOS = {
  FRESH10:  { type: 'percent', val: 10 },
  FLAT50:   { type: 'flat',    val: 50 },
  VEGGIE:   { type: 'percent', val: 15 },
  COOKIE:   { type: 'percent', val: 15 },
  NEWUSER:  { type: 'flat',    val: 100 },
  FREESHIP: { type: 'ship',    val: 0 }
};

function calcDiscount(sub, code) {
  const promo = PROMOS[code?.toUpperCase()];
  if (!promo) return 0;
  if (promo.type === 'percent') return Math.round(sub * promo.val / 100);
  if (promo.type === 'flat')    return Math.min(promo.val, sub);
  return 0;
}

// ─────────────────────────────────────────────
//  PLACE ORDER
//  POST /api/orders
//  Body: { items:[{productId,qty}], promoCode, payment:{method,razorpayId}, address }
// ─────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { items, promoCode, payment, address } = req.body;

    if (!items || !items.length)
      return res.status(400).json({ error: 'Cart is empty.' });
    if (!payment?.method)
      return res.status(400).json({ error: 'Payment method is required.' });
    if (!address?.name || !address?.phone || !address?.street || !address?.city || !address?.pin)
      return res.status(400).json({ error: 'Complete delivery address is required.' });

    // Resolve each item from DB and check stock
    let subtotal = 0;
    const orderItems = [];

    for (const { productId, qty } of items) {
      const product = await Product.findById(productId);
      if (!product || !product.active)
        return res.status(400).json({ error: `Product not found: ${productId}` });
      if (product.stock < qty)
        return res.status(400).json({ error: `Not enough stock for ${product.name}. Available: ${product.stock}` });

      // Deduct stock
      product.stock -= qty;
      await product.save();

      subtotal += product.price * qty;
      orderItems.push({
        productId: product._id,
        name:  product.name,
        price: product.price,
        emoji: product.emoji,
        img:   product.img,
        unit:  product.unit,
        qty
      });
    }

    const discount = calcDiscount(subtotal, promoCode);
    const isFreeShip = PROMOS[promoCode?.toUpperCase()]?.type === 'ship';
    const delivery = isFreeShip ? 0 : subtotal >= 500 ? 0 : 49;
    const total = subtotal - discount + delivery;

    const order = await Order.create({
      userId:    req.user._id,
      items:     orderItems,
      subtotal,
      discount,
      promoCode: promoCode || null,
      delivery,
      total,
      payment: {
        method:      payment.method.toUpperCase(),
        razorpayId:  payment.razorpayId || null,
        status:      payment.method === 'COD' ? 'pending' : 'paid'
      },
      address,
      status: 'Confirmed',
      statusHistory: [{ status: 'Confirmed' }]
    });

    // Increment user order count
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'orders': 1 } });

    res.status(201).json(order);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  MY ORDERS (logged-in user)
//  GET /api/orders/my
// ─────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  ANALYTICS — sales summary (admin)
//  GET /api/orders/analytics
// ─────────────────────────────────────────────
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const [totals] = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalOrders:  { $sum: 1 },
        avgOrderVal:  { $avg: '$total' }
      }}
    ]);

    // Revenue per month (last 12 months)
    const monthly = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: {
        _id: {
          year:  { $year:  '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$total' },
        orders:  { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Payment breakdown
    const payments = await Order.aggregate([
      { $group: { _id: '$payment.method', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Top products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: {
        _id:      '$items.productId',
        name:     { $first: '$items.name' },
        unitsSold:{ $sum: '$items.qty' },
        revenue:  { $sum: { $multiply: ['$items.price', '$items.qty'] } }
      }},
      { $sort: { unitsSold: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      summary: totals || { totalRevenue: 0, totalOrders: 0, avgOrderVal: 0 },
      monthly,
      payments,
      topProducts
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  ALL ORDERS (admin)
//  GET /api/orders?status=Shipped&page=1&limit=20
// ─────────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  SINGLE ORDER
//  GET /api/orders/:id
// ─────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email');
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Users can only see their own orders; admins see all
    if (req.user.role !== 'admin' &&
        order.userId._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized.' });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  UPDATE ORDER STATUS (admin)
//  PATCH /api/orders/:id/status
//  Body: { status: 'Shipped', note: 'Dispatched via Bluedart' }
// ─────────────────────────────────────────────
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    const allowed = ['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    order.status = status;
    order.statusHistory.push({ status, note: note || '' });
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  REFUND ORDER (admin)
//  POST /api/orders/:id/refund
//  Body: { reason: 'Customer request' }
// ─────────────────────────────────────────────
router.post('/:id/refund', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status === 'Refunded')
      return res.status(400).json({ error: 'Order already refunded.' });

    order.status = 'Refunded';
    order.refundReason = req.body.reason || 'Admin initiated';
    order.payment.status = 'refunded';
    order.statusHistory.push({ status: 'Refunded', note: order.refundReason });
    await order.save();

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
    }

    res.json({ success: true, message: 'Order marked as refunded. Restore payment manually via Razorpay dashboard.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
