import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../hooks/useApi';
import { fmtPrice, fmtPct, fmtTime } from '../utils/format';
import { useTrading } from '../context/TradingContext';

function ScoreBar({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  let barColor = 'bg-gray-600';
  if (pct >= 70) barColor = 'bg-green-400';
  else if (pct >= 45) barColor = 'bg-amber-400';
  else if (pct >= 25) barColor = 'bg-yellow-600';

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-gray-400 w-6 text-right">{pct}</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  if (priority === 'high') {
    return (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 uppercase tracking-wider">
        HIGH
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/30 uppercase tracking-wider">
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
    <div className="panel flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500 tracking-widest">MARKET SCANNER</span>
          {totalScanned > 0 && (
            <span className="text-xs font-mono text-gray-600">
              {totalScanned} symbols scanned
            </span>
          )}
          {scannedAt && (
            <span className="text-xs font-mono text-gray-600">
              Last scan: {fmtTime(scannedAt)}
            </span>
          )}
        </div>
        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded border border-amber-400/30 bg-amber-400/5 text-amber-400 hover:bg-amber-400/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="flex items-center justify-center py-8 text-gray-600 text-xs font-mono">
          No scan data. Click RUN SCAN to start.
        </div>
      )}

      {/* Two-column layout */}
      {(scanData?.scannedAt || scanning) && (
        <div className="flex flex-1 min-h-0 gap-2 p-2">
          {/* Left: Top Candidates */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="text-[10px] font-mono text-gray-500 tracking-widest mb-2 px-1">
              TOP CANDIDATES
            </div>
            <div className="flex-1 overflow-y-auto scroll-panel space-y-0.5">
              {candidates.length === 0 && (
                <div className="text-center text-gray-600 text-xs font-mono py-4">
                  {scanning ? 'Scanning...' : 'No candidates yet'}
                </div>
              )}
              {candidates.map((c, idx) => (
                <div
                  key={c.symbol}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-hover transition-colors"
                >
                  <span className="font-mono text-[10px] text-gray-600 w-4 text-right flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-mono font-bold text-sm text-gray-200 w-12 flex-shrink-0">
                    {c.symbol}
                  </span>
                  <div className="flex-shrink-0">
                    <ScoreBar score={c.score} />
                  </div>
                  <span className="font-mono text-sm text-gray-300 w-16 text-right flex-shrink-0">
                    {fmtPrice(c.price)}
                  </span>
                  <span className={`font-mono text-xs w-14 text-right flex-shrink-0 ${c.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmtPct(c.changePct)}
                  </span>
                  <span className="font-mono text-[10px] text-gray-500 flex-shrink-0">
                    {c.volRatio >= 0 ? `${c.volRatio.toFixed(1)}x` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-bg-border flex-shrink-0" />

          {/* Right: AI Picks */}
          <div className="w-64 flex-shrink-0 flex flex-col">
            <div className="text-[10px] font-mono text-gray-500 tracking-widest mb-2 px-1">
              AI PICKS
            </div>
            <div className="flex-1 overflow-y-auto scroll-panel space-y-2">
              {aiPicks.length === 0 && (
                <div className="text-center text-gray-600 text-xs font-mono py-4">
                  {scanning ? 'Analyzing...' : 'No AI picks yet'}
                </div>
              )}
              {aiPicks.map((pick) => {
                const alreadyAdded = addedSymbols.has(pick.symbol);
                const isAdding = addingSymbol === pick.symbol;

                return (
                  <div
                    key={pick.symbol}
                    className="bg-bg-base rounded border border-bg-border p-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-cyan-400">
                        {pick.symbol}
                      </span>
                      <PriorityBadge priority={pick.priority} />
                    </div>
                    <p className="text-[10px] font-mono text-gray-500 leading-relaxed">
                      {pick.reasoning}
                    </p>
                    <button
                      onClick={() => handleAddToWatchlist(pick.symbol)}
                      disabled={alreadyAdded || isAdding}
                      className={`w-full text-[10px] font-mono py-1 rounded border transition-colors ${
                        alreadyAdded
                          ? 'border-green-400/30 bg-green-400/5 text-green-400 cursor-default'
                          : 'border-cyan-400/30 bg-cyan-400/5 text-cyan-400 hover:bg-cyan-400/10 disabled:opacity-50 disabled:cursor-not-allowed'
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
