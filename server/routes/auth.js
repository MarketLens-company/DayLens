const express = require('express');
const router = express.Router();
const db = require('../services/database');
const { hashPassword, comparePassword, signToken, requireAuth } = require('../services/auth');
const userSessionManager = require('../services/userSessionManager');

// ---- Validation helpers ----
function isValidUsername(u) {
  return typeof u === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(u);
}

function isValidEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidPassword(p) {
  return typeof p === 'string' && p.length >= 8;
}

function maskKey(key) {
  if (!key || key.length < 6) return key ? '***' : null;
  return key.slice(0, 2) + '***' + key.slice(-3);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores only)' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check for existing username/email
    const existingUser = db.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check email uniqueness
    const existingEmail = db.db.prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE`).get(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const user = db.createUser(username, email, passwordHash);

    // Seed default config and watchlist for new user
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
    db.setConfigBulkForUser(user.id, DEFAULTS);

    const defaultTickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];
    for (const t of defaultTickers) {
      db.addToWatchlistForUser(user.id, t);
    }

    const token = signToken({ userId: user.id, username: user.username });

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    db.updateLastLogin(user.id);

    const token = signToken({ userId: user.id, username: user.username });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hasApiKeys = db.hasApiKeys(req.userId);

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      last_login: user.last_login,
      hasApiKeys,
    });
  } catch (err) {
    console.error('[Auth] /me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// GET /api/auth/keys — return masked API keys
router.get('/keys', requireAuth, (req, res) => {
  try {
    const keys = db.getApiKeys(req.userId);
    const row = db.db.prepare(`SELECT * FROM user_api_keys WHERE user_id = ?`).get(req.userId);

    if (!keys && !row) {
      return res.json({
        configured: false,
        alpacaApiKey: null,
        alpacaSecretKey: null,
        alpacaBaseUrl: 'https://paper-api.alpaca.markets',
        alpacaDataUrl: 'https://data.alpaca.markets',
        alpacaWsUrl: 'wss://stream.data.alpaca.markets/v2/iex',
        anthropicApiKey: null,
      });
    }

    res.json({
      configured: !!(keys && keys.alpacaApiKey),
      alpacaApiKey: maskKey(keys?.alpacaApiKey),
      alpacaSecretKey: keys?.alpacaSecretKey ? '***' : null,
      alpacaBaseUrl: keys?.alpacaBaseUrl || row?.alpaca_base_url || 'https://paper-api.alpaca.markets',
      alpacaDataUrl: keys?.alpacaDataUrl || row?.alpaca_data_url || 'https://data.alpaca.markets',
      alpacaWsUrl: keys?.alpacaWsUrl || row?.alpaca_ws_url || 'wss://stream.data.alpaca.markets/v2/iex',
      anthropicApiKey: keys?.anthropicApiKey ? maskKey(keys.anthropicApiKey) : null,
    });
  } catch (err) {
    console.error('[Auth] /keys GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /api/auth/keys — save encrypted API keys
router.post('/keys', requireAuth, async (req, res) => {
  try {
    const {
      alpacaApiKey,
      alpacaSecretKey,
      alpacaBaseUrl,
      alpacaDataUrl,
      alpacaWsUrl,
      anthropicApiKey,
    } = req.body || {};

    db.saveApiKeys(req.userId, {
      alpacaApiKey: alpacaApiKey || undefined,
      alpacaSecretKey: alpacaSecretKey || undefined,
      alpacaBaseUrl: alpacaBaseUrl || 'https://paper-api.alpaca.markets',
      alpacaDataUrl: alpacaDataUrl || 'https://data.alpaca.markets',
      alpacaWsUrl: alpacaWsUrl || 'wss://stream.data.alpaca.markets/v2/iex',
      anthropicApiKey: anthropicApiKey || undefined,
    });

    // Restart the user's session with new keys
    try {
      await userSessionManager.restart(req.userId);
    } catch (sessionErr) {
      console.warn(`[Auth] Session restart error for user ${req.userId}:`, sessionErr.message);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Auth] /keys POST error:', err.message);
    res.status(500).json({ error: 'Failed to save API keys' });
  }
});

// DELETE /api/auth/account — delete user and all data
router.delete('/account', requireAuth, (req, res) => {
  try {
    // Destroy the session first
    userSessionManager.destroySession(req.userId);

    // Delete user (cascade deletes api_keys, and we manually clean up other tables)
    db.db.prepare(`DELETE FROM trades WHERE user_id = ?`).run(req.userId);
    db.db.prepare(`DELETE FROM ai_decisions WHERE user_id = ?`).run(req.userId);
    db.db.prepare(`DELETE FROM config WHERE user_id = ?`).run(req.userId);
    db.db.prepare(`DELETE FROM watchlist WHERE user_id = ?`).run(req.userId);
    db.deleteUser(req.userId);

    res.json({ ok: true });
  } catch (err) {
    console.error('[Auth] /account DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
