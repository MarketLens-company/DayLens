import React from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtPct, fmtVolume } from '../utils/format';

function ActionBadge({ action }) {
  if (!action) return null;
  const styles = {
    BUY:  'bg-signal/10 text-signal border-signal/20',
    SELL: 'bg-loss/10 text-loss border-loss/20',
    HOLD: 'bg-void text-text-muted border-border',
  };
  return (
    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm border tracking-widest ${styles[action] || styles.HOLD}`}>
      {action}
    </span>
  );
}

function ConfidenceMini({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 75 ? 'bg-signal' : pct >= 50 ? 'bg-signal/50' : 'bg-text-muted/40';
  return (
    <div className="flex items-center gap-1">
      <div className="w-10 h-0.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[9px] text-text-muted">{pct}%</span>
    </div>
  );
}

export default function Watchlist() {
  const { watchlist, quotes, signals, selectedSymbol, setSelectedSymbol, triggerAnalysis } = useTrading();

  return (
    <div className="bg-surface border-r border-border flex flex-col h-full overflow-hidden" style={{ width: '252px' }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <span className="font-sans text-[10px] text-text-muted uppercase tracking-[0.15em]">Watchlist</span>
        <span className="font-mono text-[10px] text-text-muted">{watchlist.length} symbols</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {watchlist.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="font-sans text-xs text-text-muted/60 leading-relaxed">
              No symbols.<br/>Add tickers in Settings.
            </p>
          </div>
        )}

        {watchlist.map(sym => {
          const q   = quotes[sym];
          const sig = signals[sym];
          const price     = q?.price;
          const changePct = q?.changePct;
          const volume    = q?.volume;
          const isSelected = sym === selectedSymbol;

          return (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors group ${
                isSelected
                  ? 'bg-void/80 border-l-[2px] border-l-signal'
                  : 'border-l-[2px] border-l-transparent hover:bg-void/40'
              }`}
            >
              {/* Row 1: symbol + badge + change */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono font-bold text-sm ${isSelected ? 'text-text-primary' : 'text-text-primary/85'}`}>
                    {sym}
                  </span>
                  {sig && <ActionBadge action={sig.action} />}
                </div>
                <span className={`font-mono text-xs font-medium ${
                  changePct == null ? 'text-text-muted' : changePct >= 0 ? 'text-signal' : 'text-loss'
                }`}>
                  {fmtPct(changePct)}
                </span>
              </div>

              {/* Row 2: price + volume + confidence */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-text-primary">
                  {price ? fmtPrice(price) : '—'}
                </span>
                <div className="flex items-center gap-2">
                  {volume && (
                    <span className="font-sans text-[10px] text-text-muted/60">{fmtVolume(volume)}</span>
                  )}
                  {sig && <ConfidenceMini value={sig.confidence} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Analyze button */}
      {selectedSymbol && (
        <div className="px-3 pb-3 pt-2 flex-shrink-0">
          <button
            onClick={() => triggerAnalysis(selectedSymbol)}
            className="w-full border border-border text-signal/80 font-mono text-[11px] tracking-widest hover:border-signal hover:text-signal hover:bg-signal/5 transition-all px-3 py-2 rounded-sm"
          >
            ⚡ ANALYZE {selectedSymbol}
          </button>
        </div>
      )}
    </div>
  );
}
