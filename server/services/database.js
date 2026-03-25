const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'daylens.db');

// Ensure data dir exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    qty REAL NOT NULL,
    entry_price REAL,
    exit_price REAL,
    pnl REAL,
    ai_confidence REAL,
    ai_reasoning TEXT,
    alpaca_order_id TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS ai_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    action TEXT NOT NULL,
    quantity REAL,
    confidence REAL,
    reasoning TEXT,
    stop_loss REAL,
    take_profit REAL,
    executed INTEGER DEFAULT 0,
    skip_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    symbol TEXT PRIMARY KEY,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
  CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
  CREATE INDEX IF NOT EXISTS idx_decisions_symbol ON ai_decisions(symbol);
  CREATE INDEX IF NOT EXISTS idx_decisions_created ON ai_decisions(created_at);
`);

// Default config values
const DEFAULTS = {
  auto_trade_enabled: 'false',
  confidence_threshold: '0.75',
  max_position_pct: '0.10',
  max_open_positions: '5',
  daily_loss_limit_pct: '0.03',
  analysis_interval_min: '5',
  screener_interval_min: '15',
  screener_auto_add: 'false',
  screener_max_dynamic: '10',
};

// Seed defaults if not present
const insertDefault = db.prepare(
  `INSERT OR IGNORE INTO config(key, value) VALUES(?, ?)`
);
for (const [k, v] of Object.entries(DEFAULTS)) {
  insertDefault.run(k, v);
}

// Default watchlist
const defaultTickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];
const insertTicker = db.prepare(
  `INSERT OR IGNORE INTO watchlist(symbol) VALUES(?)`
);
for (const t of defaultTickers) insertTicker.run(t);

// ---- Config helpers ----
function getConfig() {
  const rows = db.prepare(`SELECT key, value FROM config`).all();
  const cfg = {};
  for (const r of rows) {
    if (r.key === 'auto_trade_enabled') {
      cfg[r.key] = r.value === 'true';
    } else if (!isNaN(r.value) && r.value !== '') {
      cfg[r.key] = Number(r.value);
    } else {
      cfg[r.key] = r.value;
    }
  }
  return cfg;
}

function getRawConfig() {
  const rows = db.prepare(`SELECT key, value FROM config`).all();
  const cfg = {};
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

function setConfig(key, value) {
  db.prepare(
    `INSERT OR REPLACE INTO config(key, value, updated_at) VALUES(?, ?, CURRENT_TIMESTAMP)`
  ).run(key, String(value));
}

function setConfigBulk(obj) {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO config(key, value, updated_at) VALUES(?, ?, CURRENT_TIMESTAMP)`
  );
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(obj)) stmt.run(k, String(v));
  });
  tx();
}

// ---- Watchlist helpers ----
function getWatchlist() {
  return db.prepare(`SELECT symbol FROM watchlist ORDER BY symbol`).all().map(r => r.symbol);
}

function addToWatchlist(symbol) {
  db.prepare(`INSERT OR IGNORE INTO watchlist(symbol) VALUES(?)`).run(symbol.toUpperCase());
}

function removeFromWatchlist(symbol) {
  db.prepare(`DELETE FROM watchlist WHERE symbol = ?`).run(symbol.toUpperCase());
}

// ---- Trade helpers ----
function insertTrade(trade) {
  return db.prepare(`
    INSERT INTO trades(symbol, side, qty, entry_price, ai_confidence, ai_reasoning, alpaca_order_id, status)
    VALUES(@symbol, @side, @qty, @entry_price, @ai_confidence, @ai_reasoning, @alpaca_order_id, @status)
  `).run(trade);
}

function updateTradeClose(id, exitPrice, pnl) {
  db.prepare(`
    UPDATE trades SET exit_price = ?, pnl = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(exitPrice, pnl, id);
}

function getTrades({ symbol, limit = 200, offset = 0 } = {}) {
  if (symbol) {
    return db.prepare(
      `SELECT * FROM trades WHERE symbol = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(symbol, limit, offset);
  }
  return db.prepare(
    `SELECT * FROM trades ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);
}

// ---- AI Decision helpers ----
function insertDecision(dec) {
  return db.prepare(`
    INSERT INTO ai_decisions(symbol, action, quantity, confidence, reasoning, stop_loss, take_profit, executed, skip_reason)
    VALUES(@symbol, @action, @quantity, @confidence, @reasoning, @stop_loss, @take_profit, @executed, @skip_reason)
  `).run(dec);
}

function getDecisions({ symbol, limit = 100, offset = 0 } = {}) {
  if (symbol) {
    return db.prepare(
      `SELECT * FROM ai_decisions WHERE symbol = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(symbol, limit, offset);
  }
  return db.prepare(
    `SELECT * FROM ai_decisions ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);
}

module.exports = {
  db,
  getConfig,
  getRawConfig,
  setConfig,
  setConfigBulk,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  insertTrade,
  updateTradeClose,
  getTrades,
  insertDecision,
  getDecisions,
};
