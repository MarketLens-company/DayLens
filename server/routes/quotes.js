const express = require('express');
const router = express.Router();
const marketDataGlobal = require('../services/marketData');
const db = require('../services/database');

function getMarketData(req) {
  return req.userSession ? req.userSession.marketDataService : marketDataGlobal;
}

router.get('/:symbol', (req, res) => {
  const userId = req.userId || 1;
  const symbol = req.params.symbol.toUpperCase();
  const marketData = getMarketData(req);

  const quote = marketData.getQuote(symbol);
  const indicators = marketData.getIndicators(symbol);

  // Get latest AI signal for this user
  const decisions = db.getDecisions({ symbol, limit: 1, userId });
  const latestSignal = decisions[0] || null;

  res.json({
    symbol,
    quote,
    indicators,
    latestSignal: latestSignal
      ? {
          action: latestSignal.action,
          confidence: latestSignal.confidence,
          timestamp: latestSignal.created_at,
        }
      : null,
  });
});

module.exports = router;
