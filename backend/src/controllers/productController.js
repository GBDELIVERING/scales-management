const db = require('../models/database');
const csvService = require('../services/csvService');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

function list(req, res, next) {
  try {
    const { search, item_group, weight_or_piece } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (description LIKE ? OR CAST(plu AS TEXT) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (item_group) {
      query += ' AND item_group = ?';
      params.push(parseInt(item_group));
    }
    if (weight_or_piece) {
      query += ' AND weight_or_piece = ?';
      params.push(weight_or_piece);
    }

    query += ' ORDER BY plu ASC';
    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    next(err);
  }
}

function get(req, res, next) {
  try {
    const product = db.prepare('SELECT * FROM products WHERE plu = ?').get(req.params.plu);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { plu, description, price, weight_or_piece, item_group, sell_by_days, ingredients, allergenes, barcode } = req.body;
    const existing = db.prepare('SELECT plu FROM products WHERE plu = ?').get(plu);
    if (existing) return res.status(409).json({ error: 'Product with this PLU already exists' });

    db.prepare(
      'INSERT INTO products (plu, description, price, weight_or_piece, item_group, sell_by_days, ingredients, allergenes, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(plu, description, price, weight_or_piece, item_group || null, sell_by_days || null, ingredients || null, allergenes || null, barcode || null);

    const product = db.prepare('SELECT * FROM products WHERE plu = ?').get(plu);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const plu = parseInt(req.params.plu);
    const existing = db.prepare('SELECT * FROM products WHERE plu = ?').get(plu);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { description, price, weight_or_piece, item_group, sell_by_days, ingredients, allergenes, barcode } = req.body;

    // Record price change if price changed
    if (price !== undefined && price !== existing.price) {
      db.prepare(
        'INSERT INTO price_history (plu, old_price, new_price, changed_by) VALUES (?, ?, ?, ?)'
      ).run(plu, existing.price, price, req.body.changed_by || 'system');
    }

    db.prepare(`
      UPDATE products SET
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        weight_or_piece = COALESCE(?, weight_or_piece),
        item_group = COALESCE(?, item_group),
        sell_by_days = COALESCE(?, sell_by_days),
        ingredients = COALESCE(?, ingredients),
        allergenes = COALESCE(?, allergenes),
        barcode = COALESCE(?, barcode),
        updated_at = CURRENT_TIMESTAMP
      WHERE plu = ?
    `).run(
      description || null,
      price !== undefined ? price : null,
      weight_or_piece || null,
      item_group !== undefined ? item_group : null,
      sell_by_days !== undefined ? sell_by_days : null,
      ingredients !== undefined ? ingredients : null,
      allergenes !== undefined ? allergenes : null,
      barcode !== undefined ? barcode : null,
      plu
    );

    const updated = db.prepare('SELECT * FROM products WHERE plu = ?').get(plu);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const plu = parseInt(req.params.plu);
    const existing = db.prepare('SELECT plu FROM products WHERE plu = ?').get(plu);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db.prepare('DELETE FROM price_history WHERE plu = ?').run(plu);
    db.prepare('DELETE FROM products WHERE plu = ?').run(plu);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

function exportCSV(req, res, next) {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY plu ASC').all();
    const csv = csvService.generateBizerbaCSV(products);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

async function importCSV(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = req.file.buffer.toString('utf-8');
    const products = await csvService.parseCSV(content);

    const upsert = db.prepare(`
      INSERT INTO products (plu, description, price, weight_or_piece, item_group, sell_by_days, ingredients, allergenes, barcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(plu) DO UPDATE SET
        description = excluded.description,
        price = excluded.price,
        weight_or_piece = excluded.weight_or_piece,
        item_group = excluded.item_group,
        sell_by_days = excluded.sell_by_days,
        ingredients = excluded.ingredients,
        allergenes = excluded.allergenes,
        barcode = excluded.barcode,
        updated_at = CURRENT_TIMESTAMP
    `);

    const importMany = db.transaction((rows) => {
      for (const p of rows) {
        upsert.run(p.plu, p.description, p.price, p.weight_or_piece, p.item_group || null, p.sell_by_days || null, p.ingredients || null, p.allergenes || null, p.barcode || null);
      }
    });

    importMany(products);
    res.json({ message: `Imported ${products.length} products`, count: products.length });
  } catch (err) {
    next(err);
  }
}

function bulkUpdate(req, res, next) {
  try {
    const { updates, plus, percentage } = req.body;

    const updatePrice = db.prepare('UPDATE products SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE plu = ?');
    const insertHistory = db.prepare('INSERT INTO price_history (plu, old_price, new_price, changed_by) VALUES (?, ?, ?, ?)');

    const doUpdate = db.transaction(() => {
      const results = [];

      if (updates && Array.isArray(updates)) {
        // Direct price updates: [{plu, newPrice}]
        for (const { plu, newPrice } of updates) {
          const product = db.prepare('SELECT * FROM products WHERE plu = ?').get(plu);
          if (product && newPrice !== product.price) {
            insertHistory.run(plu, product.price, newPrice, 'bulk-update');
            updatePrice.run(newPrice, plu);
            results.push({ plu, oldPrice: product.price, newPrice });
          }
        }
      } else if (plus && Array.isArray(plus) && percentage !== undefined) {
        // Percentage updates
        for (const plu of plus) {
          const product = db.prepare('SELECT * FROM products WHERE plu = ?').get(plu);
          if (product) {
            const newPrice = Math.round(product.price * (1 + percentage / 100));
            if (newPrice !== product.price) {
              insertHistory.run(plu, product.price, newPrice, 'bulk-percentage-update');
              updatePrice.run(newPrice, plu);
              results.push({ plu, oldPrice: product.price, newPrice });
            }
          }
        }
      }

      return results;
    });

    const results = doUpdate();
    res.json({ message: `Updated ${results.length} products`, updates: results });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  delete: remove,
  exportCSV,
  importCSV: [upload.single('file'), importCSV],
  bulkUpdate,
};
