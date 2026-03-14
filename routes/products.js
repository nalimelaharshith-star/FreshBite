// ─────────────────────────────────────────────
//  routes/products.js
//  GET    /api/products            → all products (public)
//  GET    /api/products/:id        → single product (public)
//  GET    /api/products/search     → search (public)
//  POST   /api/products            → create (admin)
//  PUT    /api/products/:id        → update (admin)
//  DELETE /api/products/:id        → soft delete (admin)
//  PATCH  /api/products/:id/stock  → update stock (admin)
//  PATCH  /api/products/:id/feat   → toggle featured (admin)
// ─────────────────────────────────────────────
const router  = require('express').Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// ─────────────────────────────────────────────
//  GET ALL PRODUCTS
//  GET /api/products?cat=cookies&sort=price-asc&search=choco&featured=true
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { cat, sort, search, featured } = req.query;

    // Build filter
    const filter = { active: true };
    if (cat && cat !== 'all') filter.cat = cat;
    if (featured === 'true') filter.feat = true;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { desc: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    let sortObj = { feat: -1, createdAt: -1 };
    if (sort === 'price-asc')  sortObj = { price: 1 };
    if (sort === 'price-desc') sortObj = { price: -1 };
    if (sort === 'rating')     sortObj = { rating: -1 };
    if (sort === 'newest')     sortObj = { createdAt: -1 };

    const products = await Product.find(filter).sort(sortObj);
    res.json(products);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  SEARCH AUTOCOMPLETE
//  GET /api/products/search?q=choco
// ─────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (q.length < 2) return res.json([]);

    const products = await Product.find({
      active: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { desc: { $regex: q, $options: 'i' } },
        { cat:  { $regex: q, $options: 'i' } }
      ]
    })
    .select('name cat price emoji img rating')
    .limit(6);

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET SINGLE PRODUCT
//  GET /api/products/:id
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.active)
      return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  CREATE PRODUCT (admin only)
//  POST /api/products
//  Body: { name, desc, price, cat, unit, stock, ... }
// ─────────────────────────────────────────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, desc, price, cat, unit, stock,
            orig, emoji, img, feat } = req.body;

    if (!name || !desc || !price || !cat || !unit)
      return res.status(400).json({ error: 'name, desc, price, cat and unit are required.' });

    const product = await Product.create({
      name, desc, price, cat, unit,
      orig:  orig  || null,
      emoji: emoji || '🛍️',
      img:   img   || '',
      stock: stock || 0,
      feat:  feat  || false
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  UPDATE PRODUCT (admin only)
//  PUT /api/products/:id
// ─────────────────────────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  UPDATE STOCK ONLY (admin only)
//  PATCH /api/products/:id/stock
//  Body: { stock: 50 }
// ─────────────────────────────────────────────
router.patch('/:id/stock', protect, adminOnly, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0)
      return res.status(400).json({ error: 'Valid stock value required.' });

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );
    res.json({ success: true, stock: product.stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  TOGGLE FEATURED (admin only)
//  PATCH /api/products/:id/feat
// ─────────────────────────────────────────────
router.patch('/:id/feat', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    product.feat = !product.feat;
    await product.save();
    res.json({ success: true, feat: product.feat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  SOFT DELETE PRODUCT (admin only)
//  DELETE /api/products/:id
// ─────────────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ success: true, message: `${product.name} removed from store.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
