require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const { createWsServer, broadcast } = require('./wsServer');
const alpaca = require('./services/alpaca');
const marketData = require('./services/marketData');
const autoTrader = require('./services/autoTrader');
const screener = require('./services/screener');
const db = require('./services/database');

const app = express();
const server = http.createServer(app);

// ---- Middleware ----
app.use(cors({ origin: '*' }));
app.use(express.json());

// ---- Routes ----
app.use('/api/account', require('./routes/account'));
app.use('/api/positions', require('./routes/positions'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/bars', require('./routes/bars'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/decisions', require('./routes/decisions'));
app.use('/api/config', require('./routes/config'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/screener', require('./routes/screener'));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- Serve React build in production ----
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  // All non-API routes serve the React app (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ---- WebSocket Server ----
const wss = createWsServer(server);

// Wire autotrader broadcast
autoTrader.setBroadcast(broadcast);

// Wire screener broadcast so scan results go to frontend via WS
screener.setBroadcast(broadcast);

// ---- Alpaca Stream -> Frontend broadcast + marketData handler ----
alpaca.onQuote(msg => {
  marketData.handleStreamMessage(msg);

  // Forward live price updates to frontend
  if (msg.T === 'q' || msg.T === 't') {
    const sym = msg.S;
    const quote = marketData.getQuote(sym);
    if (quote) {
      broadcast({ type: 'quote_update', payload: quote });
    }
  }
});

// ---- Startup sequence ----
const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`\n🚀 DayLens server running on http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);

  // Init market data (fetch initial bars, seed quote cache)
  try {
    await marketData.initWatchlist();
    console.log('[Startup] Market data initialized');
  } catch (err) {
    console.warn('[Startup] Market data init error:', err.message);
  }

  // Purge watchlist symbols that returned no bar data (delisted / unsupported tickers)
  const allSymbols = db.getWatchlist();
  const purged = [];
  for (const sym of allSymbols) {
    const bars = marketData.getBars(sym, '5Min');
    if (bars.length === 0) {
      db.removeFromWatchlist(sym);
      marketData.removeSymbol(sym);
      purged.push(sym);
    }
  }
  if (purged.length) {
    console.log(`[Startup] Purged ${purged.length} symbol(s) with no market data: ${purged.join(', ')}`);
  }

  // Start Alpaca WebSocket stream
  alpaca.startStream();

  // Start AI analysis if auto-trade was enabled on last run
  const cfg = db.getRawConfig();
  if (cfg.auto_trade_enabled === 'true') {
    console.log('[Startup] Auto-trading was enabled — starting analysis engine');
    autoTrader.start();
  }

  // Start market screener (scans every 15 min by default)
  const screenerIntervalMin = parseInt(cfg.screener_interval_min || '15');
  screener.start(screenerIntervalMin);
  console.log(`[Startup] Market screener started (interval: ${screenerIntervalMin}min)`);

  // Refresh bars every 5 minutes
  setInterval(async () => {
    try { await marketData.refreshAllBars(); } catch {}
  }, 5 * 60 * 1000);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  autoTrader.stop();
  screener.stop();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  autoTrader.stop();
  screener.stop();
  server.close(() => process.exit(0));
});
