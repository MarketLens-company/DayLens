const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const { symbol, limit = '200', offset = '0' } = req.query;
  const trades = db.getTrades({
    symbol: symbol?.toUpperCase(),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json(trades);
});

module.exports = router;
