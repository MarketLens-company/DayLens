const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const userId = req.userId || 1;
  const { symbol, limit = '200', offset = '0' } = req.query;
  const trades = db.getTrades({
    symbol: symbol?.toUpperCase(),
    limit: parseInt(limit),
    offset: parseInt(offset),
    userId,
  });
  res.json(trades);
});

module.exports = router;
