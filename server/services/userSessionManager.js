/**
 * User Session Manager
 * Manages per-user instances of Alpaca, MarketData, and AutoTrader services.
 * Sessions are created lazily when a user first makes an authenticated request with valid API keys.
 * Sessions persist in memory until server restart or explicit destruction.
 */
const db = require('./database');
const { createAlpacaService } = require('./alpaca');
const { createMarketDataService } = require('./marketData');
const { createAutoTraderService } = require('./autoTrader');

// Map of userId -> UserSession
const sessions = new Map();

class UserSession {
  constructor(userId, apiKeys) {
    this.userId = userId;
    this.apiKeys = apiKeys;
    this.alpacaClient = null;
    this.marketDataService = null;
    this.autoTraderService = null;
    this.broadcast = null;
    this.initialized = false;
  }
}

/**
 * Initialize a new session for the given user.
 * Loads API keys from DB, creates service instances, starts market data.
 */
async function initSession(userId, broadcastFn) {
  const apiKeys = db.getApiKeys(userId);
  if (!apiKeys || !apiKeys.alpacaApiKey) {
    return null; // No keys configured
  }

  const session = new UserSession(userId, apiKeys);
  session.broadcast = broadcastFn || null;

  // Create Alpaca client
  session.alpacaClient = createAlpacaService({
    apiKey: apiKeys.alpacaApiKey,
    secretKey: apiKeys.alpacaSecretKey,
    baseUrl: apiKeys.alpacaBaseUrl,
    dataUrl: apiKeys.alpacaDataUrl,
    wsUrl: apiKeys.alpacaWsUrl,
  });

  // Create MarketData service
  const getWatchlistFn = () => db.getWatchlistForUser(userId);
  session.marketDataService = createMarketDataService(session.alpacaClient, getWatchlistFn);

  // Create AutoTrader service
  session.autoTraderService = createAutoTraderService({
    db,
    alpacaService: session.alpacaClient,
    marketDataService: session.marketDataService,
    userId,
    getAnthropicKey: () => {
      const keys = db.getApiKeys(userId);
      return keys ? keys.anthropicApiKey : null;
    },
  });

  // Wire broadcast to autotrader so it sends to this user's WS connections
  if (broadcastFn) {
    session.autoTraderService.setBroadcast(broadcastFn);
  }

  // Wire Alpaca stream -> MarketData handler -> WS broadcast
  session.alpacaClient.onQuote(msg => {
    session.marketDataService.handleStreamMessage(msg);
    if (msg.T === 'q' || msg.T === 't') {
      const sym = msg.S;
      const quote = session.marketDataService.getQuote(sym);
      if (quote && broadcastFn) {
        broadcastFn({ type: 'quote_update', payload: quote });
      }
    }
  });

  // Initialize market data (fetch bars, seed quote cache)
  try {
    await session.marketDataService.initWatchlist();
    console.log(`[UserSession:${userId}] Market data initialized`);
  } catch (err) {
    console.warn(`[UserSession:${userId}] Market data init error:`, err.message);
  }

  // Start Alpaca WS stream
  session.alpacaClient.startStream();

  // Start auto-trader if it was enabled
  const cfg = db.getRawConfigForUser(userId);
  if (cfg.auto_trade_enabled === 'true') {
    console.log(`[UserSession:${userId}] Auto-trading was enabled — starting analysis engine`);
    session.autoTraderService.start();
  }

  session.initialized = true;
  sessions.set(userId, session);
  console.log(`[UserSession:${userId}] Session initialized`);

  return session;
}

/**
 * Get existing session for a user, or null if not initialized.
 */
function getSession(userId) {
  const session = sessions.get(userId);
  if (session && session.initialized) return session;
  return null;
}

/**
 * Get existing session or create a new one.
 * broadcastFn: function(msg) that sends to this user's WS connections
 */
async function getOrInitSession(userId, broadcastFn) {
  const existing = getSession(userId);
  if (existing) return existing;
  return initSession(userId, broadcastFn);
}

/**
 * Destroy and reinitialize a user's session (e.g., after API key update).
 */
async function restartSession(userId, broadcastFn) {
  destroySession(userId);
  return initSession(userId, broadcastFn);
}

/**
 * Destroy a user's session — stop all services and remove from map.
 */
function destroySession(userId) {
  const session = sessions.get(userId);
  if (!session) return;

  try {
    if (session.autoTraderService) session.autoTraderService.stop();
  } catch {}

  try {
    if (session.alpacaClient) session.alpacaClient.stopStream();
  } catch {}

  sessions.delete(userId);
  console.log(`[UserSession:${userId}] Session destroyed`);
}

/**
 * Restart a session by userId (used from auth routes).
 * broadcastFn will be looked up from the current session if not provided.
 */
async function restart(userId) {
  const existing = sessions.get(userId);
  const broadcastFn = existing ? existing.broadcast : null;
  return restartSession(userId, broadcastFn);
}

module.exports = {
  getSession,
  initSession,
  getOrInitSession,
  restartSession,
  destroySession,
  restart,
};
