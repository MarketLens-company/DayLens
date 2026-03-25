const express = require('express');
const router = express.Router();
const db = require('../services/database');
const autoTrader = require('../services/autoTrader');

const ALLOWED_KEYS = [
  'auto_trade_enabled',
  'confidence_threshold',
  'max_position_pct',
  'max_open_positions',
  'daily_loss_limit_pct',
  'analysis_interval_min',
];

router.get('/', (req, res) => {
  res.json(db.getRawConfig());
});

router.post('/', (req, res) => {
  const updates = {};
  for (const key of ALLOWED_KEYS) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid config keys provided' });
  }

  db.setConfigBulk(updates);

  // If auto_trade_enabled changed, start/stop trader
  if (updates.auto_trade_enabled !== undefined) {
    const enabled = String(updates.auto_trade_enabled) === 'true';
    if (enabled && !autoTrader.isRunning()) {
      autoTrader.start();
    } else if (!enabled && autoTrader.isRunning()) {
      autoTrader.stop();
    }
  }

  res.json({ ok: true, config: db.getRawConfig() });
});

module.exports = router;
