const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const userId = req.userId || 1;
  const { symbol, limit = '100', offset = '0' } = req.query;
  const decisions = db.getDecisions({
    symbol: symbol?.toUpperCase(),
    limit: parseInt(limit),
    offset: parseInt(offset),
    userId,
  });
  res.json(decisions);
});

module.exports = router;
