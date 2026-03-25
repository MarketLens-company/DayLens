const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const { symbol, limit = '100', offset = '0' } = req.query;
  const decisions = db.getDecisions({
    symbol: symbol?.toUpperCase(),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json(decisions);
});

module.exports = router;
