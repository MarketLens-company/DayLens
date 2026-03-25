const express = require('express');
const router = express.Router();
const autoTrader = require('../services/autoTrader');
const db = require('../services/database');

router.post('/start', (req, res) => {
  db.setConfig('auto_trade_enabled', 'true');
  autoTrader.start();
  res.json({ running: true });
});

router.post('/stop', (req, res) => {
  db.setConfig('auto_trade_enabled', 'false');
  autoTrader.stop();
  res.json({ running: false });
});

router.get('/status', (req, res) => {
  res.json({ running: autoTrader.isRunning() });
});

// Trigger an immediate analysis for a symbol
router.post('/analyze/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  autoTrader.analyzeSymbol(symbol).catch(() => {});
  res.json({ triggered: true, symbol });
});

module.exports = router;
