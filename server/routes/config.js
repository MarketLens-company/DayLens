const express = require('express');
const router = express.Router();
const db = require('../services/database');

const ALLOWED_KEYS = [
  'auto_trade_enabled',
  'confidence_threshold',
  'max_position_pct',
  'max_open_positions',
  'daily_loss_limit_pct',
  'analysis_interval_min',
];

router.get('/', (req, res) => {
  const userId = req.userId || 1;
  res.json(db.getRawConfigForUser(userId));
});

router.post('/', (req, res) => {
  const userId = req.userId || 1;
  const session = req.userSession;

  const updates = {};
  for (const key of ALLOWED_KEYS) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid config keys provided' });
  }

  db.setConfigBulkForUser(userId, updates);

  // If auto_trade_enabled changed and user has a session, start/stop their auto-trader
  if (updates.auto_trade_enabled !== undefined && session) {
    const enabled = String(updates.auto_trade_enabled) === 'true';
    if (enabled && !session.autoTraderService.isRunning()) {
      session.autoTraderService.start();
    } else if (!enabled && session.autoTraderService.isRunning()) {
      session.autoTraderService.stop();
    }
  }

  res.json({ ok: true, config: db.getRawConfigForUser(userId) });
});

module.exports = router;
