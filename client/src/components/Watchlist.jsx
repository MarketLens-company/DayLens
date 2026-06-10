import React from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtPct, fmtVolume } from '../utils/format';

function signalBadgeClass(action) {
  switch (action) {
    case 'BUY':  return 'bg-signal/10 text-signal border border-signal/20 font-mono text-[10px] px-1.5 py-0.5 rounded-sm';
    case 'SELL': return 'bg-loss/10 text-loss border border-loss/20 font-mono text-[10px] px-1.5 py-0.5 rounded-sm';
    default:     return 'bg-surface text-text-muted border border-border font-mono text-[10px] px-1.5 py-0.5 rounded-sm';
  }
}

export default function Watchlist() {
  const { watchlist, quotes, signals, selectedSymbol, setSelectedSymbol, triggerAnalysis } = useTrading();

  return (
    <div className="w-70 bg-surface border-r border-border flex flex-col h-full overflow-hidden" style={{ width: '280px' }}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <span className="font-sans text-xs text-text-muted uppercase tracking-widest">WATCHLIST</span>
        <span className="font-mono text-xs text-text-muted">{watchlist.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {watchlist.length === 0 && (
          <div className="text-center text-text-muted font-sans text-xs py-8 px-4">
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
              className={`w-full text-left px-4 py-3 border-b border-border cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-void border-l-2 border-l-signal'
                  : 'hover:bg-void/50 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-text-primary">
                    {sym}
                  </span>
                  {sig && (
                    <span className={signalBadgeClass(sig.action)}>
                      {sig.action}
                    </span>
                  )}
                </div>
                <span className={`font-mono text-xs ${changePct == null ? 'text-text-primary' : changePct >= 0 ? 'text-signal' : 'text-loss'}`}>
                  {fmtPct(changePct)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-text-primary">{fmtPrice(price)}</span>
                <div className="flex items-center gap-2">
                  {volume && (
                    <span className="font-sans text-[10px] text-text-muted">{fmtVolume(volume)}</span>
                  )}
                  {sig && (
                    <span className="font-mono text-[10px] text-text-muted">
                      {(sig.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Analyze button */}
      {selectedSymbol && (
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <button
            onClick={() => triggerAnalysis(selectedSymbol)}
            className="w-full bg-void border border-border text-signal font-mono text-xs tracking-widest hover:border-signal transition-colors px-4 py-2 rounded"
          >
            ANALYZE {selectedSymbol}
          </button>
        </div>
      )}
    </div>
  );
}
