const express = require('express');
const router = express.Router();
const autoTraderGlobal = require('../services/autoTrader');
const db = require('../services/database');

function getAutoTrader(req) {
  return req.userSession ? req.userSession.autoTraderService : autoTraderGlobal;
}

router.post('/start', (req, res) => {
  const userId = req.userId || 1;
  db.setConfigForUser(userId, 'auto_trade_enabled', 'true');
  const autoTrader = getAutoTrader(req);
  autoTrader.start();
  res.json({ running: true });
});

router.post('/stop', (req, res) => {
  const userId = req.userId || 1;
  db.setConfigForUser(userId, 'auto_trade_enabled', 'false');
  const autoTrader = getAutoTrader(req);
  autoTrader.stop();
  res.json({ running: false });
});

router.get('/status', (req, res) => {
  const autoTrader = getAutoTrader(req);
  res.json({ running: autoTrader.isRunning() });
});

router.post('/analyze/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const autoTrader = getAutoTrader(req);
  autoTrader.analyzeSymbol(symbol).catch(() => {});
  res.json({ triggered: true, symbol });
});

module.exports = router;
