require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const productRoutes = require('./routes/products');
const scaleRoutes = require('./routes/scales');
const syncRoutes = require('./routes/sync');
const priceHistoryRoutes = require('./routes/priceHistory');
const errorHandler = require('./middleware/errorHandler');

// Initialize database
require('./models/database');

const app = express();
const PORT = process.env.PORT || 9999;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// API routes
app.use('/api/products', productRoutes);
app.use('/api/scales', scaleRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/price-history', priceHistoryRoutes);

// Serve frontend build if it exists
const frontendBuild = path.join(__dirname, '../../frontend/build');
const fs = require('fs');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
