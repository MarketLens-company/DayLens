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
    <div className="flex flex-col h-full min-h-0 bg-void">
      <IndicatorsBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: watchlist */}
        <Watchlist />

        {/* Center: chart + positions + scanner */}
        <div className="flex-1 flex flex-col gap-0 min-w-0 overflow-hidden border-r border-border">
          {/* Chart takes most space */}
          <div className="flex-1 min-h-0 p-2 pb-1">
            <ChartPanel />
          </div>

          {/* Positions panel */}
          <div className="h-[170px] flex-shrink-0 px-2 pb-1">
            <PositionsPanel />
          </div>

          {/* Collapsible scanner */}
          <div className="flex-shrink-0 px-2 pb-2">
            <button
              onClick={() => setScannerExpanded(e => !e)}
              className="w-full flex items-center justify-between px-3 py-1.5 font-sans text-[10px] text-text-muted hover:text-text-primary bg-surface border border-border rounded-sm transition-colors tracking-widest uppercase"
            >
              <span className="flex items-center gap-2">
                <span className="text-signal/50 text-[8px]">◈</span>
                Market Scanner
              </span>
              <span className="font-mono text-[10px] text-text-muted/50">
                {scannerExpanded ? '▲ COLLAPSE' : '▼ EXPAND'}
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
        <div className="w-72 flex-shrink-0 flex flex-col p-2">
          <AIDecisionFeed />
        </div>
      </div>
    </div>
  );
}
