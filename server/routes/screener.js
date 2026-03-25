const express = require('express');
const router = express.Router();
const screener = require('../services/screener');
const db = require('../services/database');

// GET /api/screener — return last scan result
router.get('/', (req, res) => {
  const last = screener.getLastScan();
  if (!last) {
    return res.json({
      scannedAt: null,
      totalScanned: 0,
      universeSize: screener.UNIVERSE.length,
      candidates: [],
      aiPicks: [],
    });
  }
  res.json(last);
});

// POST /api/screener/run — trigger immediate scan
router.post('/run', async (req, res) => {
  try {
    const result = await screener.runScan();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/screener/universe — return the full universe array with sector info
router.get('/universe', (req, res) => {
  const universe = screener.UNIVERSE.map(sym => ({
    symbol: sym,
    sector: screener.SECTOR_MAP[sym] || 'Unknown',
  }));
  res.json({ universe, total: universe.length });
});

// POST /api/screener/config — update screener config
router.post('/config', (req, res) => {
  const { interval_min, auto_add_picks, max_dynamic_symbols } = req.body;
  const updates = {};

  if (interval_min !== undefined) {
    updates.screener_interval_min = String(interval_min);
  }
  if (auto_add_picks !== undefined) {
    updates.screener_auto_add = String(auto_add_picks);
  }
  if (max_dynamic_symbols !== undefined) {
    updates.screener_max_dynamic = String(max_dynamic_symbols);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid config keys provided' });
  }

  db.setConfigBulk(updates);
  res.json({ ok: true, updated: updates });
});

module.exports = router;
