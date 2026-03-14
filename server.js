// ─────────────────────────────────────────────
//  FreshBite Backend — server.js
//  Main entry point
// ─────────────────────────────────────────────
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL || '*',
    'http://localhost:3000',
    'http://127.0.0.1:5500',  // Live Server (VS Code)
    /\.netlify\.app$/          // any Netlify subdomain
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev only) ───────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
    next();
  });
}

// ── Routes ──────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/reviews',  require('./routes/reviews'));

// ── Health check ────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'FreshBite API',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// ── 404 handler ─────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ── Connect to MongoDB then start server ────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`🚀  FreshBite API running on port ${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
