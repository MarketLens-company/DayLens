import React from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtPct, fmtVolume, colorForValue, bgForAction } from '../utils/format';

export default function Watchlist() {
  const { watchlist, quotes, signals, selectedSymbol, setSelectedSymbol, triggerAnalysis } = useTrading();

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border flex-shrink-0">
        <span className="text-xs font-mono text-gray-500 tracking-widest">WATCHLIST</span>
        <span className="text-xs font-mono text-gray-600">{watchlist.length} symbols</span>
      </div>

      <div className="flex-1 scroll-panel overflow-y-auto">
        {watchlist.length === 0 && (
          <div className="text-center text-gray-600 text-xs font-mono py-8">
            No symbols. Add via Settings.
          </div>
        )}
        {watchlist.map(sym => {
          const q = quotes[sym];
          const sig = signals[sym];
          const price = q?.price;
          const changePct = q?.changePct;
          const volume = q?.volume;
          const isSelected = sym === selectedSymbol;

          return (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`w-full text-left px-3 py-2.5 border-b border-bg-border/50 transition-colors ${
                isSelected
                  ? 'bg-cyan-400/5 border-l-2 border-l-cyan-400'
                  : 'hover:bg-bg-hover border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-sm ${isSelected ? 'text-cyan-400' : 'text-gray-200'}`}>
                    {sym}
                  </span>
                  {sig && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${bgForAction(sig.action)}`}>
                      {sig.action}
                    </span>
                  )}
                </div>
                <span className={`num font-mono text-sm font-medium ${colorForValue(changePct)}`}>
                  {fmtPct(changePct)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="num font-mono text-sm text-gray-200">{fmtPrice(price)}</span>
                <div className="flex items-center gap-2">
                  {volume && (
                    <span className="font-mono text-xs text-gray-600">{fmtVolume(volume)}</span>
                  )}
                  {sig && (
                    <span className="font-mono text-[10px] text-gray-600">
                      {(sig.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Trigger analysis button for selected */}
      {selectedSymbol && (
        <div className="px-3 py-2 border-t border-bg-border flex-shrink-0">
          <button
            onClick={() => triggerAnalysis(selectedSymbol)}
            className="w-full text-xs font-mono text-amber-400 border border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 rounded py-1.5 transition-colors"
          >
            ⚡ ANALYZE {selectedSymbol}
          </button>
        </div>
      )}
    </div>
  );
}
