const express = require('express');
const router = express.Router();
const marketData = require('../services/marketData');
const { computeSeries } = require('../services/indicators');

router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const timeframe = req.query.timeframe || '5Min';

  let bars = marketData.getBars(symbol, timeframe);

  // If not cached, try to fetch
  if (!bars.length) {
    bars = await marketData.fetchBars(symbol, timeframe, 100);
  }

  const series = computeSeries(bars);
  res.json(series);
});

module.exports = router;
