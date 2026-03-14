// ─────────────────────────────────────────────
//  routes/reviews.js
//  GET    /api/reviews/:productId  → get reviews for product (public)
//  POST   /api/reviews/:productId  → add review (auth)
//  DELETE /api/reviews/:id         → delete review (admin or own)
//  PATCH  /api/reviews/:id/approve → approve/hide review (admin)
// ─────────────────────────────────────────────
const router  = require('express').Router();
const Review  = require('../models/Review');
const Product = require('../models/Product');
const Order   = require('../models/Order');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// ─────────────────────────────────────────────
//  GET REVIEWS FOR A PRODUCT
//  GET /api/reviews/:productId
// ─────────────────────────────────────────────
router.get('/:productId', optionalAuth, async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId,
      approved: true
    }).sort({ createdAt: -1 });

    // Star breakdown
    const breakdown = [5, 4, 3, 2, 1].map(s => ({
      stars: s,
      count: reviews.filter(r => r.stars === s).length
    }));

    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length
      : 0;

    res.json({ reviews, avg: +avg.toFixed(1), total: reviews.length, breakdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  ADD REVIEW
//  POST /api/reviews/:productId
//  Body: { stars, text }
// ─────────────────────────────────────────────
router.post('/:productId', protect, async (req, res) => {
  try {
    const { stars, text } = req.body;
    if (!stars || !text)
      return res.status(400).json({ error: 'Stars and review text are required.' });

    // Check if user already reviewed this product
    const existing = await Review.findOne({
      productId: req.params.productId,
      userId: req.user._id
    });
    if (existing)
      return res.status(400).json({ error: 'You have already reviewed this product.' });

    // Check if user actually bought this product (verified purchase)
    const hasBought = await Order.findOne({
      userId: req.user._id,
      'items.productId': req.params.productId,
      status: { $in: ['Delivered', 'Confirmed', 'Shipped'] }
    });

    const review = await Review.create({
      productId: req.params.productId,
      userId:    req.user._id,
      name:      req.user.name,
      stars,
      text,
      verified:  !!hasBought
    });

    // Update product average rating
    const allReviews = await Review.find({ productId: req.params.productId, approved: true });
    const avg = allReviews.reduce((s, r) => s + r.stars, 0) / allReviews.length;
    await Product.findByIdAndUpdate(req.params.productId, {
      rating: +avg.toFixed(1),
      reviewCount: allReviews.length
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) // duplicate key
      return res.status(400).json({ error: 'You have already reviewed this product.' });
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  HIDE / APPROVE REVIEW (admin moderation)
//  PATCH /api/reviews/:id/approve
//  Body: { approved: false }
// ─────────────────────────────────────────────
router.patch('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { approved: req.body.approved },
      { new: true }
    );
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  DELETE REVIEW
//  DELETE /api/reviews/:id
// ─────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    // Only the author or an admin can delete
    if (review.userId.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized.' });

    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
