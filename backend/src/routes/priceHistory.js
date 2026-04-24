const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/:plu', (req, res, next) => {
  try {
    const plu = parseInt(req.params.plu);
    const product = db.prepare('SELECT plu FROM products WHERE plu = ?').get(plu);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const history = db.prepare(
      'SELECT * FROM price_history WHERE plu = ? ORDER BY changed_at DESC LIMIT 100'
    ).all(plu);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
