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

    // Validate the symbol actually has market data (catches delisted / unsupported tickers)
    const bars = marketData.getBars(sym, '5Min');
    if (bars.length === 0) {
      db.removeFromWatchlist(sym);
      marketData.removeSymbol(sym);
      return res.status(400).json({
        error: `No market data found for ${sym}. It may be delisted, misspelled, or not supported on the IEX feed.`,
      });
    }

    autoTrader.addSymbol(sym);
  }

  res.json({ symbols: db.getWatchlist() });
});

module.exports = router;
