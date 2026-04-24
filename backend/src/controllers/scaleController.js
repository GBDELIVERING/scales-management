const db = require('../models/database');
const syncService = require('../services/syncService');
const networkService = require('../services/networkService');

function list(req, res, next) {
  try {
    const scales = db.prepare('SELECT * FROM scales ORDER BY id ASC').all();
    res.json(scales);
  } catch (err) {
    next(err);
  }
}

function get(req, res, next) {
  try {
    const scale = db.prepare('SELECT * FROM scales WHERE id = ?').get(req.params.id);
    if (!scale) return res.status(404).json({ error: 'Scale not found' });
    res.json(scale);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { name, location, ip_address, network_drive, model, device_number } = req.body;
    const result = db.prepare(
      'INSERT INTO scales (name, location, ip_address, network_drive, model, device_number) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, location, ip_address, network_drive || null, model || 'KHII 800', device_number || null);

    const scale = db.prepare('SELECT * FROM scales WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(scale);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'A scale with this IP address already exists' });
    }
    next(err);
  }
}

function update(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const existing = db.prepare('SELECT * FROM scales WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Scale not found' });

    const { name, location, ip_address, network_drive, model, device_number, status } = req.body;

    db.prepare(`
      UPDATE scales SET
        name = COALESCE(?, name),
        location = COALESCE(?, location),
        ip_address = COALESCE(?, ip_address),
        network_drive = CASE WHEN ? IS NOT NULL THEN ? ELSE network_drive END,
        model = COALESCE(?, model),
        device_number = CASE WHEN ? IS NOT NULL THEN ? ELSE device_number END,
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      name || null,
      location || null,
      ip_address || null,
      network_drive !== undefined ? network_drive : null,
      network_drive !== undefined ? network_drive : null,
      model || null,
      device_number !== undefined ? device_number : null,
      device_number !== undefined ? device_number : null,
      status || null,
      id
    );

    const updated = db.prepare('SELECT * FROM scales WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'A scale with this IP address already exists' });
    }
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const existing = db.prepare('SELECT id FROM scales WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Scale not found' });

    db.prepare('DELETE FROM sync_log WHERE scale_id = ?').run(id);
    db.prepare('DELETE FROM scales WHERE id = ?').run(id);
    res.json({ message: 'Scale deleted' });
  } catch (err) {
    next(err);
  }
}

async function sync(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const scale = db.prepare('SELECT * FROM scales WHERE id = ?').get(id);
    if (!scale) return res.status(404).json({ error: 'Scale not found' });

    const products = db.prepare('SELECT * FROM products ORDER BY plu ASC').all();
    const result = await syncService.syncToScale(scale, products);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function status(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const scale = db.prepare('SELECT * FROM scales WHERE id = ?').get(id);
    if (!scale) return res.status(404).json({ error: 'Scale not found' });

    const scaleStatus = await networkService.checkScaleStatus(scale.ip_address);

    db.prepare('UPDATE scales SET status = ? WHERE id = ?').run(scaleStatus, id);

    res.json({ id, ip_address: scale.ip_address, status: scaleStatus });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, delete: remove, sync, status };
