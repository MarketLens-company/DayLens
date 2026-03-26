const WebSocket = require('ws');
require('dotenv').config();

// ---- Factory function ----
// Creates an isolated Alpaca service instance with the given API keys.
// keys: { apiKey, secretKey, baseUrl, dataUrl, wsUrl }
function createAlpacaService(keys = {}) {
  const BASE_URL = keys.baseUrl || process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
  const DATA_URL = keys.dataUrl || process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets';
  const WS_URL = keys.wsUrl || process.env.ALPACA_WS_URL || 'wss://stream.data.alpaca.markets/v2/iex';
  const KEY = keys.apiKey || process.env.ALPACA_API_KEY;
  const SECRET = keys.secretKey || process.env.ALPACA_SECRET_KEY;

  const HEADERS = {
    'APCA-API-KEY-ID': KEY,
    'APCA-API-SECRET-KEY': SECRET,
    'Content-Type': 'application/json',
  };

  // ---- REST helpers ----
  async function apicall(url, opts = {}) {
    const res = await fetch(url, { headers: HEADERS, ...opts });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Alpaca ${res.status}: ${text}`);
    }
    return res.json();
  }

  async function getAccount() {
    return apicall(`${BASE_URL}/v2/account`);
  }

  async function getPositions() {
    return apicall(`${BASE_URL}/v2/positions`);
  }

  async function getOrders(params = {}) {
    const qs = new URLSearchParams({ status: 'all', limit: '100', ...params });
    return apicall(`${BASE_URL}/v2/orders?${qs}`);
  }

  async function placeOrder(order) {
    return apicall(`${BASE_URL}/v2/orders`, {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async function cancelOrder(orderId) {
    const res = await fetch(`${BASE_URL}/v2/orders/${orderId}`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      throw new Error(`Cancel order ${res.status}: ${text}`);
    }
    return { cancelled: true };
  }

  async function getBars(symbol, timeframe = '5Min', limit = 100) {
    const qs = new URLSearchParams({
      symbols: symbol,
      timeframe: timeframe === '1min' ? '1Min' : timeframe,
      limit: String(limit),
      feed: 'iex',
    });
    const data = await apicall(`${DATA_URL}/v2/stocks/bars?${qs}`);
    return (data.bars && data.bars[symbol]) || [];
  }

  async function getLatestQuote(symbol) {
    const data = await apicall(
      `${DATA_URL}/v2/stocks/${symbol}/quotes/latest?feed=iex`
    );
    return data.quote || null;
  }

  async function getLatestBar(symbol) {
    const data = await apicall(
      `${DATA_URL}/v2/stocks/${symbol}/bars/latest?feed=iex`
    );
    return data.bar || null;
  }

  async function isMarketOpen() {
    const clock = await apicall(`${BASE_URL}/v2/clock`);
    return clock.is_open;
  }

  async function getClock() {
    return apicall(`${BASE_URL}/v2/clock`);
  }

  // ---- WebSocket Streaming ----
  let wsClient = null;
  let quoteHandlers = [];
  let wsConnected = false;
  let subscribedSymbols = new Set();
  let reconnectTimer = null;
  let reconnectDelay = 5000;
  let suppressReconnect = false;
  let destroyed = false;

  function onQuote(fn) {
    quoteHandlers.push(fn);
  }

  function removeQuoteHandler(fn) {
    quoteHandlers = quoteHandlers.filter(h => h !== fn);
  }

  function subscribeQuotes(symbols) {
    for (const s of symbols) subscribedSymbols.add(s);
    if (wsConnected && wsClient) {
      wsClient.send(JSON.stringify({
        action: 'subscribe',
        quotes: symbols,
        bars: symbols,
        trades: symbols,
      }));
    }
  }

  function unsubscribeQuotes(symbols) {
    for (const s of symbols) subscribedSymbols.delete(s);
    if (wsConnected && wsClient) {
      wsClient.send(JSON.stringify({
        action: 'unsubscribe',
        quotes: symbols,
        bars: symbols,
        trades: symbols,
      }));
    }
  }

  function connectStream() {
    if (destroyed) return;
    if (wsClient) {
      try { wsClient.terminate(); } catch {}
    }

    wsClient = new WebSocket(WS_URL);

    wsClient.on('open', () => {
      if (destroyed) { wsClient.terminate(); return; }
      console.log('[Alpaca WS] Connected');
      wsClient.send(JSON.stringify({
        action: 'auth',
        key: KEY,
        secret: SECRET,
      }));
    });

    wsClient.on('message', raw => {
      if (destroyed) return;
      let msgs;
      try { msgs = JSON.parse(raw); } catch { return; }
      if (!Array.isArray(msgs)) msgs = [msgs];

      for (const msg of msgs) {
        if (msg.T === 'success' && msg.msg === 'authenticated') {
          wsConnected = true;
          console.log('[Alpaca WS] Authenticated');
          if (subscribedSymbols.size > 0) {
            const syms = [...subscribedSymbols];
            wsClient.send(JSON.stringify({
              action: 'subscribe',
              quotes: syms,
              bars: syms,
              trades: syms,
            }));
          }
        } else if (msg.T === 'q' || msg.T === 'b' || msg.T === 't') {
          for (const h of quoteHandlers) {
            try { h(msg); } catch {}
          }
        } else if (msg.T === 'error') {
          console.error('[Alpaca WS] Error:', msg);
          if (msg.code === 406) {
            suppressReconnect = true;
            reconnectDelay = 60000;
            console.warn('[Alpaca WS] Connection limit hit — pausing reconnect for 60s');
            setTimeout(() => {
              suppressReconnect = false;
              reconnectDelay = 5000;
            }, 60000);
          }
        }
      }
    });

    wsClient.on('close', () => {
      if (destroyed) return;
      wsConnected = false;
      if (suppressReconnect) {
        console.log(`[Alpaca WS] Disconnected. Reconnecting in ${reconnectDelay / 1000}s (backoff)...`);
      } else {
        console.log('[Alpaca WS] Disconnected. Reconnecting in 5s...');
      }
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectStream, reconnectDelay);
    });

    wsClient.on('error', err => {
      if (!destroyed) console.error('[Alpaca WS] Error:', err.message);
    });
  }

  function startStream() {
    if (!KEY || KEY === 'your_alpaca_api_key_here') {
      console.warn('[Alpaca WS] No API key set — stream disabled');
      return;
    }
    connectStream();
  }

  function stopStream() {
    destroyed = true;
    clearTimeout(reconnectTimer);
    wsConnected = false;
    if (wsClient) {
      try { wsClient.terminate(); } catch {}
      wsClient = null;
    }
    quoteHandlers = [];
  }

  return {
    getAccount,
    getPositions,
    getOrders,
    placeOrder,
    cancelOrder,
    getBars,
    getLatestQuote,
    getLatestBar,
    isMarketOpen,
    getClock,
    subscribeQuotes,
    unsubscribeQuotes,
    onQuote,
    removeQuoteHandler,
    startStream,
    stopStream,
  };
}

// ---- Singleton for backward compatibility (screener, global routes) ----
const _singleton = createAlpacaService();

module.exports = _singleton;
module.exports.createAlpacaService = createAlpacaService;
