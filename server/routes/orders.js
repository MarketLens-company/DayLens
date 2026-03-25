const express = require('express');
const router = express.Router();
const alpaca = require('../services/alpaca');
const db = require('../services/database');

router.get('/', async (req, res) => {
  try {
    const orders = await alpaca.getOrders(req.query);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const order = await alpaca.placeOrder(req.body);

    // Log manual trade
    if (req.body.symbol) {
      db.insertTrade({
        symbol: req.body.symbol.toUpperCase(),
        side: req.body.side,
        qty: parseFloat(req.body.qty) || parseFloat(req.body.notional) || 0,
        entry_price: null,
        ai_confidence: null,
        ai_reasoning: 'Manual order',
        alpaca_order_id: order.id,
        status: 'open',
      });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await alpaca.cancelOrder(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
