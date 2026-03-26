const express = require('express');
const router = express.Router();
const alpacaGlobal = require('../services/alpaca');

function getAlpaca(req) {
  return req.userSession ? req.userSession.alpacaClient : alpacaGlobal;
}

router.get('/', async (req, res) => {
  const alpaca = getAlpaca(req);
  try {
    const positions = await alpaca.getPositions();
    res.json(positions);
  } catch (err) {
    if (!req.userSession) {
      return res.status(402).json({ error: 'API keys not configured', code: 'NO_API_KEYS' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
