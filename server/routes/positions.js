const express = require('express');
const router = express.Router();
const alpaca = require('../services/alpaca');

router.get('/', async (req, res) => {
  try {
    const positions = await alpaca.getPositions();
    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
