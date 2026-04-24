const db = require('../models/database');
const csvService = require('./csvService');
const networkService = require('./networkService');

/**
 * Sync products to a single scale, log the result.
 */
async function syncToScale(scale, products) {
  const logEntry = db.prepare(
    'INSERT INTO sync_log (scale_id, status, products_synced, error_message) VALUES (?, ?, ?, ?)'
  );

  try {
    const csvContent = csvService.generateBizerbaCSV(products);
    const filename = `products_${Date.now()}.csv`;

    let writePath = null;
    if (scale.network_drive) {
      writePath = await networkService.copyToNetworkDrive(csvContent, scale.network_drive, filename);
    }

    const result = logEntry.run(scale.id, 'success', products.length, null);
    db.prepare('UPDATE scales SET last_sync = CURRENT_TIMESTAMP, status = ? WHERE id = ?').run('online', scale.id);

    return {
      scale_id: scale.id,
      scale_name: scale.name,
      status: 'success',
      products_synced: products.length,
      file_path: writePath,
      log_id: result.lastInsertRowid,
    };
  } catch (err) {
    const result = logEntry.run(scale.id, 'failed', 0, err.message);
    db.prepare('UPDATE scales SET status = ? WHERE id = ?').run('error', scale.id);

    return {
      scale_id: scale.id,
      scale_name: scale.name,
      status: 'failed',
      error: err.message,
      log_id: result.lastInsertRowid,
    };
  }
}

/**
 * Sync products to all scales, return array of results.
 */
async function syncToAllScales(products) {
  const scales = db.prepare('SELECT * FROM scales').all();
  const results = await Promise.all(scales.map((scale) => syncToScale(scale, products)));
  return results;
}

module.exports = { syncToScale, syncToAllScales };
