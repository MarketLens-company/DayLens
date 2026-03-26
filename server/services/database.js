const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

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
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS user_api_keys (
    user_id INTEGER PRIMARY KEY,
    alpaca_api_key_enc TEXT,
    alpaca_secret_key_enc TEXT,
    alpaca_base_url TEXT DEFAULT 'https://paper-api.alpaca.markets',
    alpaca_data_url TEXT DEFAULT 'https://data.alpaca.markets',
    alpaca_ws_url TEXT DEFAULT 'wss://stream.data.alpaca.markets/v2/iex',
    anthropic_api_key_enc TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

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
    symbol TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
  CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
  CREATE INDEX IF NOT EXISTS idx_decisions_symbol ON ai_decisions(symbol);
  CREATE INDEX IF NOT EXISTS idx_decisions_created ON ai_decisions(created_at);
`);

// Migrate existing tables to add user_id columns (SQLite doesn't support IF NOT EXISTS for columns)
const migrations = [
  `ALTER TABLE trades ADD COLUMN user_id INTEGER DEFAULT 1`,
  `ALTER TABLE ai_decisions ADD COLUMN user_id INTEGER DEFAULT 1`,
  `ALTER TABLE config ADD COLUMN user_id INTEGER DEFAULT 1`,
  `ALTER TABLE watchlist ADD COLUMN user_id INTEGER DEFAULT 1`,
];

for (const migration of migrations) {
  try {
    db.exec(migration);
  } catch {
    // Column already exists — ignore
  }
}

// Fix watchlist primary key issue: old schema had symbol as PRIMARY KEY, new schema has user_id+symbol.
// Add a unique index instead for the new multi-user scheme.
try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_user_symbol ON watchlist(user_id, symbol)`);
} catch {}

// Add indexes for user_id filtering
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id)`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_decisions_user ON ai_decisions(user_id)`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_config_user ON config(user_id)`); } catch {}

// ---- Encryption helpers ----
function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || 'daylens-dev-secret-change-in-production';
  return crypto.scryptSync(secret, 'daylens-salt', 32);
}

function encrypt(text) {
  if (!text) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedStr) {
  if (!encryptedStr) return null;
  try {
    const key = getEncryptionKey();
    const [ivHex, encHex] = encryptedStr.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

// ---- User helpers ----
function createUser(username, email, passwordHash) {
  const stmt = db.prepare(
    `INSERT INTO users(username, email, password_hash) VALUES(?, ?, ?)`
  );
  const result = stmt.run(username, email, passwordHash);
  return getUserById(result.lastInsertRowid);
}

function getUserByUsername(username) {
  return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
}

function getUserById(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

function updateLastLogin(userId) {
  db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).run(userId);
}

function deleteUser(userId) {
  db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
}

// ---- API Keys helpers ----
function getApiKeys(userId) {
  const row = db.prepare(`SELECT * FROM user_api_keys WHERE user_id = ?`).get(userId);
  if (!row) return null;

  const alpacaApiKey = decrypt(row.alpaca_api_key_enc);
  const alpacaSecretKey = decrypt(row.alpaca_secret_key_enc);
  const anthropicApiKey = decrypt(row.anthropic_api_key_enc);

  if (!alpacaApiKey && !anthropicApiKey) return null;

  return {
    alpacaApiKey: alpacaApiKey || null,
    alpacaSecretKey: alpacaSecretKey || null,
    alpacaBaseUrl: row.alpaca_base_url || 'https://paper-api.alpaca.markets',
    alpacaDataUrl: row.alpaca_data_url || 'https://data.alpaca.markets',
    alpacaWsUrl: row.alpaca_ws_url || 'wss://stream.data.alpaca.markets/v2/iex',
    anthropicApiKey: anthropicApiKey || null,
  };
}

function saveApiKeys(userId, keysObj) {
  const {
    alpacaApiKey,
    alpacaSecretKey,
    alpacaBaseUrl = 'https://paper-api.alpaca.markets',
    alpacaDataUrl = 'https://data.alpaca.markets',
    alpacaWsUrl = 'wss://stream.data.alpaca.markets/v2/iex',
    anthropicApiKey,
  } = keysObj;

  // Only encrypt non-empty values; preserve existing encrypted values if not provided
  const existing = db.prepare(`SELECT * FROM user_api_keys WHERE user_id = ?`).get(userId);

  const encAlpacaKey = alpacaApiKey ? encrypt(alpacaApiKey) : (existing?.alpaca_api_key_enc || null);
  const encAlpacaSecret = alpacaSecretKey ? encrypt(alpacaSecretKey) : (existing?.alpaca_secret_key_enc || null);
  const encAnthropicKey = anthropicApiKey ? encrypt(anthropicApiKey) : (existing?.anthropic_api_key_enc || null);

  db.prepare(`
    INSERT INTO user_api_keys(user_id, alpaca_api_key_enc, alpaca_secret_key_enc, alpaca_base_url, alpaca_data_url, alpaca_ws_url, anthropic_api_key_enc, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      alpaca_api_key_enc = excluded.alpaca_api_key_enc,
      alpaca_secret_key_enc = excluded.alpaca_secret_key_enc,
      alpaca_base_url = excluded.alpaca_base_url,
      alpaca_data_url = excluded.alpaca_data_url,
      alpaca_ws_url = excluded.alpaca_ws_url,
      anthropic_api_key_enc = excluded.anthropic_api_key_enc,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, encAlpacaKey, encAlpacaSecret, alpacaBaseUrl, alpacaDataUrl, alpacaWsUrl, encAnthropicKey);
}

function hasApiKeys(userId) {
  const row = db.prepare(`SELECT user_id FROM user_api_keys WHERE user_id = ? AND alpaca_api_key_enc IS NOT NULL`).get(userId);
  return !!row;
}

// ---- Per-user watchlist helpers ----
function getWatchlistForUser(userId) {
  return db.prepare(`SELECT symbol FROM watchlist WHERE user_id = ? ORDER BY symbol`).all(userId).map(r => r.symbol);
}

function addToWatchlistForUser(userId, symbol) {
  try {
    db.prepare(`INSERT OR IGNORE INTO watchlist(symbol, user_id) VALUES(?, ?)`).run(symbol.toUpperCase(), userId);
  } catch {
    // ignore
  }
}

function removeFromWatchlistForUser(userId, symbol) {
  db.prepare(`DELETE FROM watchlist WHERE symbol = ? AND user_id = ?`).run(symbol.toUpperCase(), userId);
}

// ---- Per-user config helpers ----
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

function getConfigForUser(userId) {
  const rows = db.prepare(`SELECT key, value FROM config WHERE user_id = ?`).all(userId);
  const cfg = { ...DEFAULTS };
  for (const r of rows) cfg[r.key] = r.value;

  // Convert types
  const result = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (k === 'auto_trade_enabled') {
      result[k] = v === 'true';
    } else if (!isNaN(v) && v !== '') {
      result[k] = Number(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function getRawConfigForUser(userId) {
  const rows = db.prepare(`SELECT key, value FROM config WHERE user_id = ?`).all(userId);
  const cfg = { ...DEFAULTS };
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

function setConfigForUser(userId, key, value) {
  db.prepare(
    `INSERT OR REPLACE INTO config(key, value, user_id, updated_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(key, String(value), userId);
}

function setConfigBulkForUser(userId, obj) {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO config(key, value, user_id, updated_at) VALUES(?, ?, ?, CURRENT_TIMESTAMP)`
  );
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(obj)) stmt.run(k, String(v), userId);
  });
  tx();
}

// ---- Legacy global config helpers (for backward compat / screener) ----
// These operate on rows with user_id = 1 (default), or the old schema rows without user_id

function getConfig() {
  // Return defaults merged with any user 1 config
  const rows = db.prepare(`SELECT key, value FROM config WHERE user_id IS NULL OR user_id = 1`).all();
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
  const rows = db.prepare(`SELECT key, value FROM config WHERE user_id IS NULL OR user_id = 1`).all();
  const cfg = { ...DEFAULTS };
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

function setConfig(key, value) {
  db.prepare(
    `INSERT OR REPLACE INTO config(key, value, user_id, updated_at) VALUES(?, ?, 1, CURRENT_TIMESTAMP)`
  ).run(key, String(value));
}

function setConfigBulk(obj) {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO config(key, value, user_id, updated_at) VALUES(?, ?, 1, CURRENT_TIMESTAMP)`
  );
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(obj)) stmt.run(k, String(v));
  });
  tx();
}

// ---- Legacy global watchlist helpers (for backward compat / screener) ----
function getWatchlist() {
  // Return union of all watchlist symbols (used by screener for global usage)
  return db.prepare(`SELECT DISTINCT symbol FROM watchlist ORDER BY symbol`).all().map(r => r.symbol);
}

function addToWatchlist(symbol) {
  try {
    db.prepare(`INSERT OR IGNORE INTO watchlist(symbol, user_id) VALUES(?, 1)`).run(symbol.toUpperCase());
  } catch {
    // ignore
  }
}

function removeFromWatchlist(symbol) {
  db.prepare(`DELETE FROM watchlist WHERE symbol = ? AND user_id = 1`).run(symbol.toUpperCase());
}

// ---- Trade helpers ----
function insertTrade(trade) {
  const userId = trade.user_id || 1;
  return db.prepare(`
    INSERT INTO trades(symbol, side, qty, entry_price, exit_price, pnl, ai_confidence, ai_reasoning, alpaca_order_id, status, user_id)
    VALUES(@symbol, @side, @qty, @entry_price, @exit_price, @pnl, @ai_confidence, @ai_reasoning, @alpaca_order_id, @status, @user_id)
  `).run({ ...trade, user_id: userId });
}

function updateTradeClose(id, exitPrice, pnl) {
  db.prepare(`
    UPDATE trades SET exit_price = ?, pnl = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(exitPrice, pnl, id);
}

function getTrades({ symbol, limit = 200, offset = 0, userId } = {}) {
  const uid = userId || 1;
  if (symbol) {
    return db.prepare(
      `SELECT * FROM trades WHERE symbol = ? AND user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(symbol, uid, limit, offset);
  }
  return db.prepare(
    `SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(uid, limit, offset);
}

// ---- AI Decision helpers ----
function insertDecision(dec) {
  const userId = dec.user_id || 1;
  return db.prepare(`
    INSERT INTO ai_decisions(symbol, action, quantity, confidence, reasoning, stop_loss, take_profit, executed, skip_reason, user_id)
    VALUES(@symbol, @action, @quantity, @confidence, @reasoning, @stop_loss, @take_profit, @executed, @skip_reason, @user_id)
  `).run({ ...dec, user_id: userId });
}

function getDecisions({ symbol, limit = 100, offset = 0, userId } = {}) {
  const uid = userId || 1;
  if (symbol) {
    return db.prepare(
      `SELECT * FROM ai_decisions WHERE symbol = ? AND user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(symbol, uid, limit, offset);
  }
  return db.prepare(
    `SELECT * FROM ai_decisions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(uid, limit, offset);
}

// Seed defaults for user 1 if not present
const insertDefault = db.prepare(
  `INSERT OR IGNORE INTO config(key, value, user_id) VALUES(?, ?, 1)`
);
for (const [k, v] of Object.entries(DEFAULTS)) {
  insertDefault.run(k, v);
}

// Default watchlist for user 1
const defaultTickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];
for (const t of defaultTickers) {
  try {
    db.prepare(`INSERT OR IGNORE INTO watchlist(symbol, user_id) VALUES(?, 1)`).run(t);
  } catch {}
}

module.exports = {
  db,
  // User management
  createUser,
  getUserByUsername,
  getUserById,
  updateLastLogin,
  deleteUser,
  // API keys
  getApiKeys,
  saveApiKeys,
  hasApiKeys,
  // Per-user watchlist
  getWatchlistForUser,
  addToWatchlistForUser,
  removeFromWatchlistForUser,
  // Per-user config
  getConfigForUser,
  getRawConfigForUser,
  setConfigForUser,
  setConfigBulkForUser,
  // Legacy global config
  getConfig,
  getRawConfig,
  setConfig,
  setConfigBulk,
  // Legacy global watchlist
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  // Trades
  insertTrade,
  updateTradeClose,
  getTrades,
  // Decisions
  insertDecision,
  getDecisions,
};
