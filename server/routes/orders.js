const express = require('express');
const router = express.Router();
const alpacaGlobal = require('../services/alpaca');
const db = require('../services/database');

function getAlpaca(req) {
  return req.userSession ? req.userSession.alpacaClient : alpacaGlobal;
}

router.get('/', async (req, res) => {
  const alpaca = getAlpaca(req);
  try {
    const orders = await alpaca.getOrders(req.query);
    res.json(orders);
  } catch (err) {
    if (!req.userSession) {
      return res.status(402).json({ error: 'API keys not configured', code: 'NO_API_KEYS' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const alpaca = getAlpaca(req);
  const userId = req.userId || 1;

  if (!req.userSession) {
    return res.status(402).json({ error: 'API keys not configured', code: 'NO_API_KEYS' });
  }

  try {
    const order = await alpaca.placeOrder(req.body);

    if (req.body.symbol) {
      db.insertTrade({
        symbol: req.body.symbol.toUpperCase(),
        side: req.body.side,
        qty: parseFloat(req.body.qty) || parseFloat(req.body.notional) || 0,
        entry_price: null,
        exit_price: null,
        pnl: null,
        ai_confidence: null,
        ai_reasoning: 'Manual order',
        alpaca_order_id: order.id,
        status: 'open',
        user_id: userId,
      });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const alpaca = getAlpaca(req);
  try {
    const result = await alpaca.cancelOrder(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
