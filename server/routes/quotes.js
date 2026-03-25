const express = require('express');
const router = express.Router();
const marketData = require('../services/marketData');
const { getDecisions } = require('../services/database');

router.get('/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const quote = marketData.getQuote(symbol);
  const indicators = marketData.getIndicators(symbol);

  // Get latest AI signal
  const decisions = getDecisions({ symbol, limit: 1 });
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
