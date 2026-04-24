const db = require('../models/database');
const syncService = require('../services/syncService');

async function syncAll(req, res, next) {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY plu ASC').all();
    const results = await syncService.syncToAllScales(products);
    res.json({ message: 'Sync completed', results });
  } catch (err) {
    next(err);
  }
}

function getLogs(req, res, next) {
  try {
    const logs = db.prepare(`
      SELECT sl.*, s.name as scale_name, s.location, s.ip_address
      FROM sync_log sl
      JOIN scales s ON sl.scale_id = s.id
      ORDER BY sl.synced_at DESC
      LIMIT 200
    `).all();
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

function getScaleLogs(req, res, next) {
  try {
    const scaleId = parseInt(req.params.scaleId);
    const scale = db.prepare('SELECT id FROM scales WHERE id = ?').get(scaleId);
    if (!scale) return res.status(404).json({ error: 'Scale not found' });

    const logs = db.prepare(`
      SELECT sl.*, s.name as scale_name, s.location, s.ip_address
      FROM sync_log sl
      JOIN scales s ON sl.scale_id = s.id
      WHERE sl.scale_id = ?
      ORDER BY sl.synced_at DESC
      LIMIT 100
    `).all(scaleId);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

module.exports = { syncAll, getLogs, getScaleLogs };
