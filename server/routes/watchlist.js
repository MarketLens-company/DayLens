const express = require('express');
const router = express.Router();
const db = require('../services/database');
const marketData = require('../services/marketData');
const autoTrader = require('../services/autoTrader');

router.get('/', (req, res) => {
  const symbols = db.getWatchlist();
  res.json(symbols);
});

router.post('/', async (req, res) => {
  const { symbol, action = 'add' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const sym = symbol.toUpperCase().trim();

  if (action === 'remove') {
    db.removeFromWatchlist(sym);
    marketData.removeSymbol(sym);
    autoTrader.removeSymbol(sym);
  } else {
    db.addToWatchlist(sym);
    await marketData.addSymbol(sym);
    autoTrader.addSymbol(sym);
  }

  res.json({ symbols: db.getWatchlist() });
});

module.exports = router;
