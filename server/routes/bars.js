const express = require('express');
const router = express.Router();
const marketDataGlobal = require('../services/marketData');
const { computeSeries } = require('../services/indicators');

function getMarketData(req) {
  return req.userSession ? req.userSession.marketDataService : marketDataGlobal;
}

router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const timeframe = req.query.timeframe || '5Min';
  const marketData = getMarketData(req);

  let bars = marketData.getBars(symbol, timeframe);

  if (!bars.length) {
    bars = await marketData.fetchBars(symbol, timeframe, 100);
  }

  const series = computeSeries(bars);
  res.json(series);
});

module.exports = router;
