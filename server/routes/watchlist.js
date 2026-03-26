const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const userId = req.userId || 1;
  const session = req.userSession;

  if (session) {
    // Return symbols from user's session market data (may be more up-to-date)
    const symbols = db.getWatchlistForUser(userId);
    return res.json(symbols);
  }

  const symbols = db.getWatchlistForUser(userId);
  res.json(symbols);
});

router.post('/', async (req, res) => {
  const { symbol, action = 'add' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const userId = req.userId || 1;
  const sym = symbol.toUpperCase().trim();
  const session = req.userSession;

  if (action === 'remove') {
    db.removeFromWatchlistForUser(userId, sym);
    if (session) {
      session.marketDataService.removeSymbol(sym);
      session.autoTraderService.removeSymbol(sym);
    }
  } else {
    db.addToWatchlistForUser(userId, sym);

    if (session) {
      await session.marketDataService.addSymbol(sym);

      // Validate the symbol actually has market data
      const bars = session.marketDataService.getBars(sym, '5Min');
      if (bars.length === 0) {
        db.removeFromWatchlistForUser(userId, sym);
        session.marketDataService.removeSymbol(sym);
        return res.status(400).json({
          error: `No market data found for ${sym}. It may be delisted, misspelled, or not supported on the IEX feed.`,
        });
      }

      session.autoTraderService.addSymbol(sym);
    }
  }

  res.json({ symbols: db.getWatchlistForUser(userId) });
});

module.exports = router;
