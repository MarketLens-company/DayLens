const express = require('express');
const router = express.Router();
const alpaca = require('../services/alpaca');

router.get('/', async (req, res) => {
  try {
    const account = await alpaca.getAccount();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/clock', async (req, res) => {
  try {
    const clock = await alpaca.getClock();
    res.json(clock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
