import React, { useState, useEffect, useCallback } from 'react';
import ScreenerPanel from '../components/ScreenerPanel';
import { apiFetch } from '../hooks/useApi';
import { fmtPrice, fmtPct } from '../utils/format';
import { useTrading } from '../context/TradingContext';

function AddButton({ symbol, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleClick = async () => {
    if (adding || added) return;
    setAdding(true);
    try {
      await apiFetch('/watchlist', {
        method: 'POST',
        body: JSON.stringify({ symbol, action: 'add' }),
      });
      setAdded(true);
      if (onAdd) onAdd(symbol);
    } catch (err) {
      console.error('Add to watchlist failed:', err.message);
    } finally {
      setAdding(false);
    }
  };

  if (added) {
    return (
      <span className="font-mono text-[10px] text-signal">✓ Added</span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={adding}
      className="text-signal font-mono text-[10px] border border-signal/30 hover:border-signal px-2 py-1 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {adding ? '...' : '+ ADD'}
    </button>
  );
}

function CandidatesTable({ candidates, onAdd }) {
  if (!candidates || candidates.length === 0) {
    return (
      <div className="text-center text-text-muted font-sans text-xs py-8">
        No candidates. Run a scan to populate.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-surface sticky top-0 border-b border-border">
          <tr>
            <th className="text-left px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">#</th>
            <th className="text-left px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">SYMBOL</th>
            <th className="text-right px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">SCORE</th>
            <th className="text-right px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">PRICE</th>
            <th className="text-right px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">CHANGE%</th>
            <th className="text-right px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">VOL RATIO</th>
            <th className="text-right px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">DAY HIGH</th>
            <th className="text-right px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">DAY LOW</th>
            <th className="text-right px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">SECTOR</th>
            <th className="text-right px-4 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, idx) => {
            let scoreColor = 'text-text-muted';
            if (c.score >= 70) scoreColor = 'text-signal';
            else if (c.score >= 45) scoreColor = 'text-warn';

            return (
              <tr
                key={c.symbol}
                className={`border-b border-border ${idx % 2 === 0 ? 'bg-void' : 'bg-surface'}`}
              >
                <td className="px-4 py-2 font-mono text-xs text-text-muted">{idx + 1}</td>
                <td className="px-4 py-2">
                  <span className="font-mono font-bold text-sm text-text-primary">{c.symbol}</span>
                </td>
                <td className={`px-4 py-2 text-right font-mono text-xs font-bold ${scoreColor}`}>{c.score}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-text-primary">{fmtPrice(c.price)}</td>
                <td className={`px-4 py-2 text-right font-mono text-xs ${c.changePct >= 0 ? 'text-signal' : 'text-loss'}`}>
                  {fmtPct(c.changePct)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-text-primary">
                  {c.volRatio != null ? `${c.volRatio.toFixed(2)}x` : '—'}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-text-primary">{fmtPrice(c.dayHigh)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-text-primary">{fmtPrice(c.dayLow)}</td>
                <td className="px-4 py-2 text-right font-mono text-[10px] text-text-muted">{c.sector || '—'}</td>
                <td className="px-4 py-2 text-right">
                  <AddButton symbol={c.symbol} onAdd={onAdd} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UniverseSection() {
  const [universe, setUniverse] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    if (universe.length > 0) return;
    setLoading(true);
    apiFetch('/screener/universe')
      .then(data => setUniverse(data.universe || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expanded, universe.length]);

  // Group by sector
  const bySector = {};
  for (const item of universe) {
    const s = item.sector || 'Unknown';
    if (!bySector[s]) bySector[s] = [];
    bySector[s].push(item.symbol);
  }
  const sectors = Object.keys(bySector).sort();

  return (
    <div className="bg-surface border border-border rounded">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2 font-sans text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <span className="tracking-widest uppercase">SCANNER UNIVERSE ({universe.length || '~200'} symbols)</span>
        <span className="font-mono text-xs text-text-muted">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {loading && (
            <div className="text-center text-text-muted font-sans text-xs py-4">—</div>
          )}
          {!loading && sectors.length === 0 && (
            <div className="text-center text-text-muted font-sans text-xs py-4">No data.</div>
          )}
          {!loading && sectors.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {sectors.map(sector => (
                <div key={sector}>
                  <div className="font-sans text-[10px] text-warn tracking-wider mb-1.5 uppercase">
                    {sector}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {bySector[sector].map(sym => (
                      <span
                        key={sym}
                        className="font-mono text-[10px] text-text-muted bg-void px-1.5 py-0.5 rounded border border-border"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Screener() {
  const { screenerData, refetch } = useTrading();
  const [scanData, setScanData] = useState(null);

  // Sync from context (WS push)
  useEffect(() => {
    if (screenerData) setScanData(screenerData);
  }, [screenerData]);

  // Load on mount
  useEffect(() => {
    apiFetch('/screener')
      .then(data => { if (data?.scannedAt) setScanData(data); })
      .catch(() => {});
  }, []);

  const handleWatchlistUpdate = useCallback(() => {
    if (refetch?.watchlist) refetch.watchlist();
  }, [refetch]);

  const allCandidates = scanData?.candidates || [];

  return (
    <div className="bg-void flex flex-col h-full min-h-0 overflow-y-auto p-2 space-y-2">
      {/* Scanner Panel at top — full width */}
      <div className="flex-shrink-0">
        <ScreenerPanel onWatchlistUpdate={handleWatchlistUpdate} />
      </div>

      {/* Full candidates table */}
      <div className="bg-surface border border-border rounded flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="font-sans text-xs text-text-muted uppercase tracking-widest">
            ALL CANDIDATES ({allCandidates.length})
          </span>
          {scanData?.scannedAt && (
            <span className="font-mono text-xs text-text-muted">
              {scanData.scanDuration ? `${(scanData.scanDuration / 1000).toFixed(1)}s scan` : ''}
            </span>
          )}
        </div>
        <CandidatesTable candidates={allCandidates} onAdd={handleWatchlistUpdate} />
      </div>

      {/* Universe section — collapsible */}
      <UniverseSection />
    </div>
  );
}
