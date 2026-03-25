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
      <span className="text-[10px] font-mono text-green-400">✓ Added</span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={adding}
      className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-400/30 bg-cyan-400/5 text-cyan-400 hover:bg-cyan-400/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {adding ? '...' : '+ ADD'}
    </button>
  );
}

function CandidatesTable({ candidates, onAdd }) {
  if (!candidates || candidates.length === 0) {
    return (
      <div className="text-center text-gray-600 text-xs font-mono py-8">
        No candidates. Run a scan to populate.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-bg-border text-gray-500 text-[10px] tracking-wider">
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">SYMBOL</th>
            <th className="text-right px-3 py-2">SCORE</th>
            <th className="text-right px-3 py-2">PRICE</th>
            <th className="text-right px-3 py-2">CHANGE%</th>
            <th className="text-right px-3 py-2">VOL RATIO</th>
            <th className="text-right px-3 py-2">DAY HIGH</th>
            <th className="text-right px-3 py-2">DAY LOW</th>
            <th className="text-right px-3 py-2">SECTOR</th>
            <th className="text-right px-3 py-2">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, idx) => {
            let scoreColor = 'text-gray-400';
            if (c.score >= 70) scoreColor = 'text-green-400';
            else if (c.score >= 45) scoreColor = 'text-amber-400';

            return (
              <tr
                key={c.symbol}
                className="border-b border-bg-border/40 hover:bg-bg-hover transition-colors"
              >
                <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                <td className="px-3 py-2">
                  <span className="font-bold text-gray-200">{c.symbol}</span>
                </td>
                <td className={`px-3 py-2 text-right font-bold ${scoreColor}`}>{c.score}</td>
                <td className="px-3 py-2 text-right text-gray-200">{fmtPrice(c.price)}</td>
                <td className={`px-3 py-2 text-right ${c.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmtPct(c.changePct)}
                </td>
                <td className="px-3 py-2 text-right text-gray-400">
                  {c.volRatio != null ? `${c.volRatio.toFixed(2)}x` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-400">{fmtPrice(c.dayHigh)}</td>
                <td className="px-3 py-2 text-right text-gray-400">{fmtPrice(c.dayLow)}</td>
                <td className="px-3 py-2 text-right text-gray-500 text-[10px]">{c.sector || '—'}</td>
                <td className="px-3 py-2 text-right">
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
    <div className="panel mt-2">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-gray-500 hover:text-gray-400 transition-colors"
      >
        <span className="tracking-widest">SCANNER UNIVERSE ({universe.length || '~200'} symbols)</span>
        <span className="text-gray-600">{expanded ? '▲ COLLAPSE' : '▼ EXPAND'}</span>
      </button>

      {expanded && (
        <div className="border-t border-bg-border px-3 py-3">
          {loading && (
            <div className="text-center text-gray-600 text-xs font-mono py-4">Loading universe...</div>
          )}
          {!loading && sectors.length === 0 && (
            <div className="text-center text-gray-600 text-xs font-mono py-4">No data.</div>
          )}
          {!loading && sectors.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {sectors.map(sector => (
                <div key={sector}>
                  <div className="text-[10px] font-mono text-amber-400 tracking-wider mb-1.5 uppercase">
                    {sector}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {bySector[sector].map(sym => (
                      <span
                        key={sym}
                        className="text-[10px] font-mono text-gray-500 bg-bg-base px-1.5 py-0.5 rounded border border-bg-border"
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
    <div className="flex flex-col h-full min-h-0 overflow-y-auto p-2 space-y-2">
      {/* Scanner Panel at top — full width */}
      <div className="flex-shrink-0">
        <ScreenerPanel onWatchlistUpdate={handleWatchlistUpdate} />
      </div>

      {/* Full candidates table */}
      <div className="panel flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border">
          <span className="text-xs font-mono text-gray-500 tracking-widest">
            ALL CANDIDATES ({allCandidates.length})
          </span>
          {scanData?.scannedAt && (
            <span className="text-xs font-mono text-gray-600">
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
