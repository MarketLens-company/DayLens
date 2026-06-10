import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../hooks/useApi';
import { fmtPrice, fmtPct, fmtTime } from '../utils/format';
import { useTrading } from '../context/TradingContext';

function ScoreBar({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-signal transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-text-muted w-6 text-right">{pct}</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  if (priority === 'high') {
    return (
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-warn/10 text-warn border border-warn/20 uppercase tracking-wider">
        HIGH
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-signal/10 text-signal border border-signal/20 uppercase tracking-wider">
      MED
    </span>
  );
}

export default function ScreenerPanel({ onWatchlistUpdate }) {
  const { screenerData } = useTrading();
  const [scanData, setScanData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const [addedSymbols, setAddedSymbols] = useState(new Set());

  // Load initial data
  const loadScanData = useCallback(async () => {
    try {
      const data = await apiFetch('/screener');
      if (data && data.scannedAt) {
        setScanData(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadScanData();
  }, [loadScanData]);

  // Update from WebSocket push
  useEffect(() => {
    if (screenerData) {
      setScanData(screenerData);
    }
  }, [screenerData]);

  // Poll for new results every 30 seconds
  useEffect(() => {
    const t = setInterval(loadScanData, 30000);
    return () => clearInterval(t);
  }, [loadScanData]);

  const handleRunScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await apiFetch('/screener/run', { method: 'POST' });
      setScanData(result);
    } catch (err) {
      console.error('Scan failed:', err.message);
    } finally {
      setScanning(false);
    }
  }, []);

  const handleAddToWatchlist = useCallback(async (symbol) => {
    if (addingSymbol) return;
    setAddingSymbol(symbol);
    try {
      await apiFetch('/watchlist', {
        method: 'POST',
        body: JSON.stringify({ symbol, action: 'add' }),
      });
      setAddedSymbols(prev => new Set([...prev, symbol]));
      if (onWatchlistUpdate) onWatchlistUpdate();
    } catch (err) {
      console.error('Add to watchlist failed:', err.message);
    } finally {
      setAddingSymbol(null);
    }
  }, [addingSymbol, onWatchlistUpdate]);

  const candidates = scanData?.candidates?.slice(0, 10) || [];
  const aiPicks = scanData?.aiPicks || [];
  const scannedAt = scanData?.scannedAt;
  const totalScanned = scanData?.totalScanned || 0;

  return (
    <div className="bg-surface border border-border rounded flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-sans text-xs text-text-muted uppercase tracking-widest">MARKET SCANNER</span>
          {totalScanned > 0 && (
            <span className="font-mono text-xs text-text-muted">
              {totalScanned} scanned
            </span>
          )}
          {scannedAt && (
            <span className="font-mono text-xs text-text-muted">
              Last: {fmtTime(scannedAt)}
            </span>
          )}
        </div>
        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="flex items-center gap-1.5 bg-void border border-signal text-signal font-mono text-xs px-3 py-1 rounded hover:bg-signal hover:text-void transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning ? (
            <>
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              SCANNING...
            </>
          ) : (
            <>&#9654; RUN SCAN</>
          )}
        </button>
      </div>

      {/* No data state */}
      {!scanData?.scannedAt && !scanning && (
        <div className="flex items-center justify-center py-8 text-text-muted font-sans text-xs">
          No scan data. Click RUN SCAN to start.
        </div>
      )}

      {/* Two-column layout */}
      {(scanData?.scannedAt || scanning) && (
        <div className="flex flex-1 min-h-0 gap-2 p-2">
          {/* Left: Top Candidates */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="font-sans text-[10px] text-text-muted tracking-widest mb-2 px-1 uppercase">
              TOP CANDIDATES
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {candidates.length === 0 && (
                <div className="text-center text-text-muted font-sans text-xs py-4">
                  {scanning ? '—' : 'No candidates yet'}
                </div>
              )}
              {candidates.map((c, idx) => (
                <div
                  key={c.symbol}
                  className={`flex items-center gap-2 px-2 py-1.5 border-b border-border transition-colors ${
                    idx % 2 === 0 ? 'bg-void' : 'bg-surface'
                  }`}
                >
                  <span className="font-mono text-[10px] text-text-muted w-4 text-right flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-mono font-bold text-sm text-text-primary w-12 flex-shrink-0">
                    {c.symbol}
                  </span>
                  <div className="flex-shrink-0">
                    <ScoreBar score={c.score} />
                  </div>
                  <span className="font-mono text-xs text-text-primary w-16 text-right flex-shrink-0">
                    {fmtPrice(c.price)}
                  </span>
                  <span className={`font-mono text-xs w-14 text-right flex-shrink-0 ${c.changePct >= 0 ? 'text-signal' : 'text-loss'}`}>
                    {fmtPct(c.changePct)}
                  </span>
                  <span className="font-mono text-[10px] text-text-muted flex-shrink-0">
                    {c.volRatio >= 0 ? `${c.volRatio.toFixed(1)}x` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-border flex-shrink-0" />

          {/* Right: AI Picks */}
          <div className="w-64 flex-shrink-0 flex flex-col">
            <div className="font-sans text-[10px] text-text-muted tracking-widest mb-2 px-1 uppercase">
              AI PICKS
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {aiPicks.length === 0 && (
                <div className="text-center text-text-muted font-sans text-xs py-4">
                  {scanning ? '—' : 'No AI picks yet'}
                </div>
              )}
              {aiPicks.map((pick) => {
                const alreadyAdded = addedSymbols.has(pick.symbol);
                const isAdding = addingSymbol === pick.symbol;

                return (
                  <div
                    key={pick.symbol}
                    className="bg-void border border-border rounded p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-signal">
                        {pick.symbol}
                      </span>
                      <PriorityBadge priority={pick.priority} />
                    </div>
                    <p className="font-sans text-xs text-text-muted leading-relaxed">
                      {pick.reasoning}
                    </p>
                    <button
                      onClick={() => handleAddToWatchlist(pick.symbol)}
                      disabled={alreadyAdded || isAdding}
                      className={`w-full font-mono text-[10px] py-1 rounded-sm border transition-colors ${
                        alreadyAdded
                          ? 'border-signal/30 bg-signal/5 text-signal cursor-default'
                          : 'text-signal border border-signal/30 hover:border-signal px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {alreadyAdded ? '✓ IN WATCHLIST' : isAdding ? 'ADDING...' : '+ ADD TO WATCHLIST'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
