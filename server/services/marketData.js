/**
 * Market Data Service — caches bars and live quotes per symbol,
 * manages the Alpaca WebSocket subscription.
 * Supports both singleton (global) and factory (per-user) usage.
 */
const { computeAll } = require('./indicators');

// ---- Factory function ----
// alpacaService: an instance returned by createAlpacaService
// getWatchlistFn: optional function that returns the watchlist for this instance
function createMarketDataService(alpacaService, getWatchlistFn) {
  // In-memory caches (local to each instance)
  const barsCache = {};     // { symbol: { '1Min': [...], '5Min': [...] } }
  const quotesCache = {};   // { symbol: { price, bid, ask, volume, timestamp, change, changePct } }
  const lastBarCache = {};  // { symbol: latestBar }

  // Event emitter pattern for quote updates
  const quoteListeners = [];

  function onQuoteUpdate(fn) {
    quoteListeners.push(fn);
  }

  function emitQuoteUpdate(symbol, data) {
    for (const fn of quoteListeners) {
      try { fn(symbol, data); } catch {}
    }
  }

  async function fetchBars(symbol, timeframe = '5Min', limit = 100) {
    try {
      const bars = await alpacaService.getBars(symbol, timeframe, limit);
      if (!barsCache[symbol]) barsCache[symbol] = {};
      barsCache[symbol][timeframe] = bars;
      return bars;
    } catch (err) {
      console.error(`[MarketData] fetchBars ${symbol} ${timeframe}:`, err.message);
      return barsCache[symbol]?.[timeframe] || [];
    }
  }

  function getBars(symbol, timeframe = '5Min') {
    return barsCache[symbol]?.[timeframe] || [];
  }

  function getQuote(symbol) {
    return quotesCache[symbol] || null;
  }

  function getIndicators(symbol) {
    const bars = getBars(symbol, '5Min');
    if (!bars.length) return null;
    return computeAll(bars);
  }

  async function initWatchlist() {
    const symbols = getWatchlistFn ? getWatchlistFn() : [];
    if (!symbols.length) return;

    console.log('[MarketData] Initializing watchlist:', symbols.join(', '));

    await Promise.allSettled(
      symbols.flatMap(sym => [
        fetchBars(sym, '5Min', 100),
        fetchBars(sym, '1Min', 100),
      ])
    );

    // Seed quote cache with latest bar data
    for (const sym of symbols) {
      const bars5 = getBars(sym, '5Min');
      if (bars5.length > 0) {
        const latest = bars5[bars5.length - 1];
        const prev = bars5.length > 1 ? bars5[bars5.length - 2] : latest;
        const price = latest.c || latest.close || 0;
        const prevClose = prev.c || prev.close || price;
        quotesCache[sym] = {
          symbol: sym,
          price,
          open: latest.o || latest.open || 0,
          high: latest.h || latest.high || 0,
          low: latest.l || latest.low || 0,
          volume: latest.v || latest.volume || 0,
          change: price - prevClose,
          changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
          timestamp: latest.t || latest.time || new Date().toISOString(),
        };
      }
    }

    alpacaService.subscribeQuotes(symbols);
  }

  function handleStreamMessage(msg) {
    if (msg.T === 'q') {
      const sym = msg.S;
      const askPrice = msg.ap || 0;
      const bidPrice = msg.bp || 0;
      const midPrice = askPrice && bidPrice ? (askPrice + bidPrice) / 2 : askPrice || bidPrice;

      if (!quotesCache[sym]) quotesCache[sym] = { symbol: sym };

      const prev = quotesCache[sym];
      const prevPrice = prev.price || midPrice;
      quotesCache[sym] = {
        ...prev,
        symbol: sym,
        price: midPrice || prev.price,
        bid: bidPrice,
        ask: askPrice,
        timestamp: msg.t,
        change: midPrice - (prev.openPrice || prevPrice),
        changePct: prev.openPrice ? ((midPrice - prev.openPrice) / prev.openPrice) * 100 : 0,
      };
      emitQuoteUpdate(sym, quotesCache[sym]);

    } else if (msg.T === 'b') {
      const sym = msg.S;
      const bar = {
        t: msg.t,
        o: msg.o,
        h: msg.h,
        l: msg.l,
        c: msg.c,
        v: msg.v,
      };
      lastBarCache[sym] = bar;

      for (const tf of ['1Min', '5Min']) {
        if (!barsCache[sym]) barsCache[sym] = {};
        if (!barsCache[sym][tf]) barsCache[sym][tf] = [];
        barsCache[sym][tf].push(bar);
        if (barsCache[sym][tf].length > 200) barsCache[sym][tf].shift();
      }

      if (!quotesCache[sym]) quotesCache[sym] = { symbol: sym };
      const q = quotesCache[sym];
      quotesCache[sym] = {
        ...q,
        symbol: sym,
        price: bar.c,
        high: Math.max(q.high || 0, bar.h),
        low: q.low ? Math.min(q.low, bar.l) : bar.l,
        volume: (q.volume || 0) + bar.v,
        timestamp: bar.t,
      };
      emitQuoteUpdate(sym, quotesCache[sym]);

    } else if (msg.T === 't') {
      const sym = msg.S;
      const price = msg.p;
      if (!quotesCache[sym]) quotesCache[sym] = { symbol: sym };
      const q = quotesCache[sym];
      const openPrice = q.openPrice || price;
      quotesCache[sym] = {
        ...q,
        symbol: sym,
        price,
        openPrice: q.openPrice || price,
        change: price - openPrice,
        changePct: openPrice ? ((price - openPrice) / openPrice) * 100 : 0,
        volume: (q.volume || 0) + (msg.s || 0),
        timestamp: msg.t,
      };
      emitQuoteUpdate(sym, quotesCache[sym]);
    }
  }

  async function addSymbol(symbol) {
    await fetchBars(symbol, '5Min', 100);
    await fetchBars(symbol, '1Min', 100);
    alpacaService.subscribeQuotes([symbol]);
  }

  function removeSymbol(symbol) {
    alpacaService.unsubscribeQuotes([symbol]);
    delete barsCache[symbol];
    delete quotesCache[symbol];
  }

  async function refreshAllBars() {
    const symbols = getWatchlistFn ? getWatchlistFn() : Object.keys(barsCache);
    await Promise.allSettled(
      symbols.flatMap(sym => [
        fetchBars(sym, '5Min', 100),
        fetchBars(sym, '1Min', 30),
      ])
    );
  }

  return {
    fetchBars,
    getBars,
    getQuote,
    getIndicators,
    initWatchlist,
    handleStreamMessage,
    addSymbol,
    removeSymbol,
    refreshAllBars,
    onQuoteUpdate,
    barsCache,
    quotesCache,
  };
}

// ---- Singleton for backward compatibility ----
const alpaca = require('./alpaca');
const { getWatchlist } = require('./database');

const _singleton = createMarketDataService(alpaca, getWatchlist);

module.exports = _singleton;
module.exports.createMarketDataService = createMarketDataService;
