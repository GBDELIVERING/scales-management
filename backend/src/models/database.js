require('dotenv').config();
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs-extra');

const dbPath = process.env.DATABASE_PATH || './database/scales.db';
const resolvedPath = path.resolve(dbPath);

fs.ensureDirSync(path.dirname(resolvedPath));

// The underlying sql.js Database instance (set during initDatabase)
let sqlDb = null;
// Track whether we are inside a transaction so saveToFile() is deferred
let inTransaction = false;

// Persist the in-memory database to disk after every write outside a transaction
function saveToFile() {
  if (!inTransaction && sqlDb) {
    const data = sqlDb.export();
    fs.writeFileSync(resolvedPath, Buffer.from(data));
  }
}

// Convert sql.js QueryExecResult[] to an array of plain objects
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// better-sqlite3-compatible Statement wrapper
class Statement {
  constructor(sql) {
    this._sql = sql;
  }

  // Returns all rows as plain objects
  all(...params) {
    const args = params.length > 0 ? params : undefined;
    const result = sqlDb.exec(this._sql, args);
    return rowsToObjects(result);
  }

  // Returns the first row or undefined
  get(...params) {
    const rows = this.all(...params);
    return rows.length > 0 ? rows[0] : undefined;
  }

  // Executes a write statement and returns { lastInsertRowid, changes }
  run(...params) {
    const args = params.length > 0 ? params : undefined;
    sqlDb.run(this._sql, args);

    const lastIdResult = sqlDb.exec('SELECT last_insert_rowid()');
    const lastInsertRowid = lastIdResult.length > 0 ? lastIdResult[0].values[0][0] : 0;

    const changesResult = sqlDb.exec('SELECT changes()');
    const changes = changesResult.length > 0 ? changesResult[0].values[0][0] : 0;

    saveToFile();
    return { lastInsertRowid, changes };
  }
}

// better-sqlite3-compatible Database wrapper exported to all controllers/services
const db = {
  // Execute one or more SQL statements (no parameters; used for DDL)
  exec(sql) {
    sqlDb.exec(sql);
    saveToFile();
  },

  // Set a PRAGMA (best-effort; WAL mode is silently ignored for in-memory db)
  pragma(setting) {
    try {
      sqlDb.run(`PRAGMA ${setting}`);
    } catch (_e) {
      // ignore unsupported pragma errors
    }
  },

  // Return a Statement wrapper for the given SQL
  prepare(sql) {
    return new Statement(sql);
  },

  // Return a callable that wraps fn in a BEGIN/COMMIT transaction
  transaction(fn) {
    return (...args) => {
      sqlDb.run('BEGIN');
      inTransaction = true;
      try {
        const result = fn(...args);
        sqlDb.run('COMMIT');
        inTransaction = false;
        saveToFile();
        return result;
      } catch (err) {
        sqlDb.run('ROLLBACK');
        inTransaction = false;
        throw err;
      }
    };
  },
};

// ── Schema & seed helpers ──────────────────────────────────────────────────

// Creates database tables if they do not already exist (DDL only, no data)
function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      plu INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      weight_or_piece TEXT CHECK(weight_or_piece IN ('W', 'P')),
      item_group INTEGER,
      sell_by_days INTEGER,
      ingredients TEXT,
      allergenes TEXT,
      barcode TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      ip_address TEXT NOT NULL UNIQUE,
      network_drive TEXT,
      model TEXT DEFAULT 'KHII 800',
      device_number TEXT,
      status TEXT DEFAULT 'inactive',
      last_sync DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plu INTEGER NOT NULL,
      old_price INTEGER,
      new_price INTEGER NOT NULL,
      changed_by TEXT,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plu) REFERENCES products(plu)
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scale_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('success', 'failed', 'pending')),
      products_synced INTEGER,
      error_message TEXT,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scale_id) REFERENCES scales(id)
    );
  `);
}

function seedScales() {
  // No-op if scales already exist (safe to call on every startup)
  const count = db.prepare('SELECT COUNT(*) as cnt FROM scales').get();
  if (count.cnt > 0) return;

  const insert = db.prepare(
    'INSERT INTO scales (name, location, ip_address, network_drive) VALUES (?, ?, ?, ?)'
  );

  const scalesData = [
    ['KINAMBA', 'KINAMBA', '10.191.10.2', 'W:'],
    ['REBERO', 'REBERO', '10.191.10.3', 'U:'],
    ['NYARUTARAMA', 'NYARUTARAMA', '10.191.10.4', 'Z:'],
    ['KICUKIRO', 'KICUKIRO', '10.191.10.5', 'V:'],
    ['KAGUGU', 'KAGUGU', '10.191.10.6', 'Y:'],
    ['BRANCH', 'BRANCH', '10.191.10.7', null],
    ['HEADQUARTERS-1', 'HEADQUARTERS', '192.168.1.70', 'X:'],
    ['HEADQUARTERS-2', 'HEADQUARTERS', '192.168.1.71', null],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  insertMany(scalesData);
}

function seedProducts() {
  // No-op if products already exist (safe to call on every startup)
  const count = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
  if (count.cnt > 0) return;

  const insert = db.prepare(
    'INSERT INTO products (plu, description, price, weight_or_piece, item_group) VALUES (?, ?, ?, ?, ?)'
  );

  const products = [
    [1, 'GB001 Beef Fillet', 21000, 'W', 1],
    [2, 'GB002 CARBONADE DE VEAU', 13000, 'W', 1],
    [3, 'GB003 BOUILLIE DE VEAU', 10600, 'W', 1],
    [4, 'GB004 ROTIS DE VEAU', 13500, 'W', 1],
    [5, 'GB005 COTE DE VEAU', 12000, 'W', 1],
    [6, 'GB006 JARRET', 12800, 'W', 1],
    [7, 'GB007 EPAULE DE VEAU', 10500, 'W', 1],
    [8, 'GB008 VIANDE HACHEE', 11000, 'W', 1],
    [9, 'GB009 FOIE-ROGNON', 10000, 'W', 1],
    [10, 'GB010 BLANQUETTE DE VEAU', 11100, 'W', 1],
    [11, 'GB011 ESCALOPE DE VEAU', 15800, 'W', 1],
    [12, 'GB012 EMINCEE DE POULET', 15000, 'W', 1],
    [13, 'GB013 HACHEE AMERCAIN', 15500, 'W', 1],
    [14, 'GB014 EMINCEE DE VEAU', 14800, 'W', 1],
    [15, 'GB015 ROTIS DE PORC', 14500, 'W', 1],
    [16, 'GB016 COTE DE PORC', 16000, 'W', 1],
    [17, 'GB017 HACHEE DE PORC', 10800, 'W', 1],
    [18, 'GB018 STEAK DE PORC', 16500, 'W', 1],
    [19, 'GB019 ESCALOPE DE PORC', 16400, 'W', 1],
    [20, 'GB020 SAUCISSON CHICKEN FRANKFURTER', 20200, 'W', 1],
    [21, 'GB021 SAUCISSON CHASSE', 12200, 'W', 1],
    [22, 'GB022 SAUCISSON JAMBON', 14500, 'W', 1],
    [23, 'GB023 SAUCISSON MORTADELLA', 13800, 'W', 1],
    [24, 'GB024 SAUCISSON DE PARIS', 14800, 'W', 1],
    [25, "GB025 SAUCISSON A L'AIL", 13600, 'W', 1],
    [26, 'GB026 SAUCISSON PILIPILI', 9000, 'W', 1],
    [27, 'GB027 SAUCISSON FRANKFURTER', 17500, 'W', 1],
    [28, 'GB028 SAUCISSON BEEF', 14600, 'W', 1],
    [29, 'GB029 SAUCISSON FRAICHE DE PORC', 14300, 'W', 1],
    [30, 'GB030 SAUCISSON FRAICHE DE VEAU', 14300, 'W', 1],
    [31, 'GB031 SAUCISSON CHICKEN MORTADELLA', 19900, 'W', 1],
    [32, 'GB032 SALAMI', 21500, 'W', 1],
    [33, 'GB033 SALAMI AU POIVRE', 21800, 'W', 1],
    [34, 'GB034 JAMBON CUIT', 19500, 'W', 1],
    [35, 'GB035 FROMAGE ALLEMAND', 13500, 'W', 1],
    [36, "GB036 WING'S AILE DE POULET", 9000, 'W', 1],
    [37, 'GB037 CUISSE DE POULET', 11500, 'W', 1],
    [38, 'GB038 BLANC DE POULET', 11500, 'W', 1],
    [39, 'GB039 CHICKEN DRUMSTICKS', 12500, 'W', 1],
    [40, 'GB040 CHICKEN FRANKFURTER VACC.', 8500, 'P', 1],
    [41, 'GB041 SAUCISSON CHASSEVACC.', 5400, 'P', 1],
    [42, 'GB042 SAUCISSON COCKTAILVACC.', 6900, 'P', 1],
    [43, 'GB043 SAUCISSON JAMBONVACC.', 5800, 'P', 1],
    [44, 'GB044 SAUCISSON MORTADELLAVACC.', 5500, 'P', 1],
    [45, 'GB045 SAUCISSON DE PARISVACC.', 5500, 'P', 1],
    [46, "GB046 SAUCISSON A L'AILVACC.", 5500, 'P', 1],
    [47, 'GB047 SAUCISSON FRANKFURTER PORCVACC.', 7900, 'P', 1],
    [48, 'GB048 SAUCISSON BEEF', 5500, 'P', 1],
    [49, 'GB049 SAUCISSON CHICKENVACC.', 6000, 'P', 1],
    [50, 'GB050 SALAMIVACC.', 7000, 'P', 1],
    [51, 'GB051 SALAMI AU POIVREVACC.', 7200, 'P', 1],
    [52, 'GB052 JAMBON CUIT VACC.', 6800, 'P', 1],
    [53, 'GB053 BOUDIN BLANC VACC.', 6800, 'P', 1],
    [54, 'GB054 LIVER PATE SMALL GLASS', 6500, 'P', 1],
    [55, 'GB055 LIVER PATE BIG GLASS', 7000, 'P', 1],
    [56, 'GB056 SMOKED BACON', 5900, 'P', 1],
    [57, 'GB057 SMOKED PORK NECKVACC.', 5800, 'P', 1],
    [58, 'GB058 SMOKED BEEFVACC.', 5300, 'P', 1],
    [59, 'GB059 SMOKED TILAPIAVACC.', 12900, 'P', 1],
    [60, 'GB060 SMOKED HALF CHICKEN SMALLVACC.', 14000, 'P', 1],
    [61, 'GB061 SMOKED HALF CHICKEN BIGVACC.', 18000, 'P', 1],
    [62, 'GB062 SMOKED PORK NECK', 17200, 'W', 1],
    [63, 'GB063 SMOKED BACON', 18300, 'W', 1],
    [64, 'GB064 SAUSAGE PEPPERON', 12800, 'W', 1],
    [65, 'GB065 LIVER PATE', 12500, 'W', 1],
    [66, 'GB066 PICKLED CABBAGE VACC.', 4200, 'W', 1],
    [67, 'GB067 RED CABBAGE VACC.', 4400, 'P', 1],
    [68, 'GB068 BOULETTE', 9000, 'W', 1],
    [69, 'GB069 CHICKEN HAM', 22000, 'W', 1],
    [70, 'GB070 CHICEKN HAM VACC.', 6500, 'P', 1],
    [71, 'GB071 AMDSFNDKF', 1000, 'W', 1],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  insertMany(products);
}

// ── Async initialiser called from app.js before the server starts ──────────

async function initDatabase() {
  // Resolve path to the sql.js WASM file shipped inside the npm package
  const sqlJsDistDir = path.dirname(require.resolve('sql.js'));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsDistDir, file),
  });

  if (fs.existsSync(resolvedPath)) {
    const fileBuffer = fs.readFileSync(resolvedPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  // Enable foreign-key enforcement (WAL is skipped – sql.js persists via export())
  db.pragma('foreign_keys = ON');

  createSchema();
  seedScales();
  seedProducts();
}

// Attach the async initialiser as a property so app.js can call db.initDatabase()
db.initDatabase = initDatabase;

module.exports = db;
