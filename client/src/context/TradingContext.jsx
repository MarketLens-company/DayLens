import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { apiFetch } from '../hooks/useApi';

const TradingContext = createContext(null);

export function TradingProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [screenerData, setScreenerData] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [quotes, setQuotes] = useState({});         // { symbol: quoteData }
  const [signals, setSignals] = useState({});        // { symbol: latestSignal }
  const [decisions, setDecisions] = useState([]);    // AI decision log (last 100)
  const [config, setConfigState] = useState(null);
  const [clock, setClock] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const refreshTimerRef = useRef(null);

  // ---- Loaders ----
  const loadAccount = useCallback(async () => {
    try {
      const data = await apiFetch('/account');
      // If API keys not configured, data has code NO_API_KEYS — don't set
      if (!data.code) setAccount(data);
    } catch {}
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const data = await apiFetch('/positions');
      if (Array.isArray(data)) setPositions(data);
    } catch {}
  }, []);

  const loadWatchlist = useCallback(async () => {
    try {
      const syms = await apiFetch('/watchlist');
      setWatchlist(syms);
      if (!selectedSymbol && syms.length > 0) setSelectedSymbol(syms[0]);
    } catch {}
  }, [selectedSymbol]);

  const loadDecisions = useCallback(async () => {
    try { setDecisions(await apiFetch('/decisions?limit=50')); } catch {}
  }, []);

  const loadConfig = useCallback(async () => {
    try { setConfigState(await apiFetch('/config')); } catch {}
  }, []);

  const loadClock = useCallback(async () => {
    try {
      const data = await apiFetch('/account/clock');
      if (!data.code) setClock(data);
    } catch {}
  }, []);

  const loadQuoteForSymbol = useCallback(async symbol => {
    try {
      const data = await apiFetch(`/quotes/${symbol}`);
      if (data.quote) {
        setQuotes(q => ({ ...q, [symbol]: data.quote }));
      }
      if (data.latestSignal) {
        setSignals(s => ({ ...s, [symbol]: data.latestSignal }));
      }
    } catch {}
  }, []);

  // ---- WebSocket handler ----
  const handleWsMessage = useCallback(msg => {
    switch (msg.type) {
      case 'connected':
        setWsConnected(true);
        break;
      case 'auth_ok':
        // WS auth confirmed — nothing extra needed
        break;
      case 'quote_update':
        setQuotes(q => ({ ...q, [msg.payload.symbol]: msg.payload }));
        break;
      case 'ai_decision':
        setDecisions(prev => [msg.payload, ...prev].slice(0, 100));
        setSignals(s => ({
          ...s,
          [msg.payload.symbol]: {
            action: msg.payload.action,
            confidence: msg.payload.confidence,
            timestamp: msg.payload.timestamp,
          },
        }));
        break;
      case 'order_fill':
        loadPositions();
        loadAccount();
        break;
      case 'screener_update':
        setScreenerData(msg.payload);
        break;
    }
  }, [loadPositions, loadAccount]);

  useWebSocket(handleWsMessage);

  // ---- Initial load ----
  useEffect(() => {
    loadAccount();
    loadPositions();
    loadWatchlist();
    loadDecisions();
    loadConfig();
    loadClock();
  }, []);

  // Poll account/positions every 30s
  useEffect(() => {
    const t = setInterval(() => {
      loadAccount();
      loadPositions();
      loadClock();
    }, 30000);
    return () => clearInterval(t);
  }, [loadAccount, loadPositions, loadClock]);

  // Load quotes for all watchlist symbols
  useEffect(() => {
    if (!watchlist.length) return;
    for (const sym of watchlist) loadQuoteForSymbol(sym);
  }, [watchlist, loadQuoteForSymbol]);

  // ---- Actions ----
  const updateConfig = useCallback(async (updates) => {
    try {
      const result = await apiFetch('/config', {
        method: 'POST',
        body: JSON.stringify(updates),
      });
      setConfigState(result.config);
      return result;
    } catch (e) {
      throw e;
    }
  }, []);

  const addToWatchlist = useCallback(async (symbol) => {
    const result = await apiFetch('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol, action: 'add' }),
    });
    setWatchlist(result.symbols);
    loadQuoteForSymbol(symbol.toUpperCase());
  }, [loadQuoteForSymbol]);

  const removeFromWatchlist = useCallback(async (symbol) => {
    const result = await apiFetch('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol, action: 'remove' }),
    });
    setWatchlist(result.symbols);
    setQuotes(q => { const n = { ...q }; delete n[symbol]; return n; });
  }, []);

  const toggleAutoTrade = useCallback(async (enabled) => {
    const endpoint = enabled ? '/trading/start' : '/trading/stop';
    await apiFetch(endpoint, { method: 'POST' });
    setConfigState(c => ({ ...c, auto_trade_enabled: String(enabled) }));
  }, []);

  const triggerAnalysis = useCallback(async (symbol) => {
    await apiFetch(`/trading/analyze/${symbol}`, { method: 'POST' });
  }, []);

  const placeOrder = useCallback(async (order) => {
    return apiFetch('/orders', { method: 'POST', body: JSON.stringify(order) });
  }, []);

  return (
    <TradingContext.Provider value={{
      account,
      positions,
      watchlist,
      quotes,
      signals,
      decisions,
      config,
      clock,
      selectedSymbol,
      setSelectedSymbol,
      wsConnected,
      screenerData,
      updateConfig,
      addToWatchlist,
      removeFromWatchlist,
      toggleAutoTrade,
      triggerAnalysis,
      placeOrder,
      refetch: { account: loadAccount, positions: loadPositions, watchlist: loadWatchlist },
    }}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used inside TradingProvider');
  return ctx;
}
