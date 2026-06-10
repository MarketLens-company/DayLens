import React, { useState, useCallback } from 'react';
import Watchlist from '../components/Watchlist';
import ChartPanel from '../components/ChartPanel';
import PositionsPanel from '../components/PositionsPanel';
import AIDecisionFeed from '../components/AIDecisionFeed';
import IndicatorsBar from '../components/IndicatorsBar';
import ScreenerPanel from '../components/ScreenerPanel';
import { useTrading } from '../context/TradingContext';

export default function Dashboard() {
  const [scannerExpanded, setScannerExpanded] = useState(false);
  const { refetch } = useTrading();

  const handleWatchlistUpdate = useCallback(() => {
    if (refetch?.watchlist) refetch.watchlist();
  }, [refetch]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Indicators bar below top bar */}
      <IndicatorsBar />

      {/* Main grid */}
      <div className="flex flex-1 min-h-0 gap-2 p-2 overflow-hidden">
        {/* Left: watchlist */}
        <div className="w-48 flex-shrink-0 flex flex-col">
          <Watchlist />
        </div>

        {/* Center: chart + positions + scanner */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0">
            <ChartPanel />
          </div>
          <div className="h-44 flex-shrink-0">
            <PositionsPanel />
          </div>

          {/* Collapsible Market Scanner */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setScannerExpanded(e => !e)}
              className="w-full flex items-center justify-between px-3 py-1.5 font-sans text-xs text-text-muted hover:text-text-primary bg-surface border border-border rounded transition-colors"
            >
              <span className="tracking-widest uppercase">MARKET SCANNER</span>
              <span className="font-mono text-[10px] text-text-muted">
                {scannerExpanded ? '▲' : '▼'}
              </span>
            </button>
            {scannerExpanded && (
              <div className="mt-1 h-72">
                <ScreenerPanel onWatchlistUpdate={handleWatchlistUpdate} />
              </div>
            )}
          </div>
        </div>

        {/* Right: AI decision feed */}
        <div className="w-72 flex-shrink-0 flex flex-col">
          <AIDecisionFeed />
        </div>
      </div>
    </div>
  );
}
