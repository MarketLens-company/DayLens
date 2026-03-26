require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const { createWsServer, broadcast, broadcastToUser, createUserBroadcast } = require('./wsServer');
const alpaca = require('./services/alpaca');
const marketData = require('./services/marketData');
const autoTrader = require('./services/autoTrader');
const screener = require('./services/screener');
const db = require('./services/database');
const { requireAuth } = require('./services/auth');
const userSessionManager = require('./services/userSessionManager');

const app = express();
const server = http.createServer(app);

// ---- Middleware ----
app.use(cors({ origin: '*' }));
app.use(express.json());

// ---- Auth routes (public) ----
app.use('/api/auth', require('./routes/auth'));

// ---- Health check (public) ----
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- Auth middleware for all subsequent /api routes ----
app.use('/api', requireAuth);

// ---- Session middleware — attach per-user session to req ----
app.use('/api', async (req, res, next) => {
  if (req.userId) {
    try {
      const userBroadcast = createUserBroadcast(req.userId);
      const session = await userSessionManager.getOrInitSession(req.userId, userBroadcast);
      req.userSession = session; // may be null if no API keys configured
    } catch (err) {
      console.warn(`[Session] Failed to init session for user ${req.userId}:`, err.message);
      req.userSession = null;
    }
  }
  next();
});

// ---- API Routes ----
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

// ---- Serve React build in production ----
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ---- WebSocket Server ----
const wss = createWsServer(server);

// Wire global autotrader broadcast (for singleton / user 1)
autoTrader.setBroadcast(broadcast);

// Wire screener broadcast so scan results go to all frontend clients via WS
screener.setBroadcast(broadcast);

// ---- Global Alpaca Stream -> Frontend broadcast + marketData handler ----
// This is the singleton stream for the global screener / backward compat.
// Per-user streams are set up in userSessionManager.
alpaca.onQuote(msg => {
  marketData.handleStreamMessage(msg);

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
  console.log(`\nDayLens server running on http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);

  // Init global market data (fetch initial bars for user 1 / system watchlist)
  try {
    await marketData.initWatchlist();
    console.log('[Startup] Market data initialized');
  } catch (err) {
    console.warn('[Startup] Market data init error:', err.message);
  }

  // Purge watchlist symbols that returned no bar data
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

  // Start global Alpaca WebSocket stream (for singleton/screener usage)
  alpaca.startStream();

  // Start AI analysis for user 1 if auto-trade was enabled on last run
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
