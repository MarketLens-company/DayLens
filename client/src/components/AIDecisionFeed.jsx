import React, { useRef, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtDateTime } from '../utils/format';

function ActionBadge({ action }) {
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

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const fillColor = pct >= 75 ? 'bg-signal' : pct >= 50 ? 'bg-signal/60' : 'bg-text-muted/40';
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${fillColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-text-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

function DecisionCard({ dec }) {
  const action = dec.action || 'HOLD';
  const cardClass = action === 'BUY' ? 'card-buy' : action === 'SELL' ? 'card-sell' : 'card-hold';

  return (
    <div className={`border-b border-border px-3 py-2.5 hover:bg-void/30 transition-colors ${cardClass}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono font-bold text-xs text-text-primary">{dec.symbol}</span>
          <ActionBadge action={action} />
          {dec.quantity > 0 && action !== 'HOLD' && (
            <span className="font-mono text-[10px] text-text-muted">{dec.quantity} sh</span>
          )}
          {dec.executed ? (
            <span className="font-mono text-[10px] text-signal">✓ EXECUTED</span>
          ) : dec.skip_reason ? (
            <span className="font-mono text-[10px] text-text-muted/60">⊘ skipped</span>
          ) : null}
        </div>
        <span className="font-mono text-[10px] text-text-muted/60 shrink-0 leading-none mt-0.5">
          {fmtDateTime(dec.created_at || dec.timestamp)}
        </span>
      </div>

      {/* Confidence bar */}
      <ConfidenceBar value={dec.confidence} />

      {/* Reasoning */}
      {dec.reasoning && (
        <p className="font-sans text-[11px] text-text-muted/75 mt-2 leading-relaxed line-clamp-4">
          {dec.reasoning}
        </p>
      )}

      {/* SL / TP */}
      {(dec.stop_loss || dec.take_profit) && (
        <div className="flex gap-4 mt-2 font-mono text-[10px]">
          {dec.stop_loss   && <span className="text-loss/70">SL {fmtPrice(dec.stop_loss)}</span>}
          {dec.take_profit && <span className="text-signal/70">TP {fmtPrice(dec.take_profit)}</span>}
        </div>
      )}

      {dec.skip_reason && (
        <p className="font-mono text-[10px] text-text-muted/50 mt-1">{dec.skip_reason}</p>
      )}
    </div>
  );
}

export default function AIDecisionFeed() {
  const { decisions, selectedSymbol } = useTrading();
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [decisions.length]);

  const filtered = selectedSymbol
    ? decisions.filter(d => d.symbol === selectedSymbol)
    : decisions;

  return (
    <div className="bracket bg-surface border border-border rounded-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <span className="font-sans text-[10px] text-text-muted uppercase tracking-[0.15em]">AI Signal Feed</span>
        {selectedSymbol && (
          <span className="font-mono text-[10px] text-signal/80">· {selectedSymbol}</span>
        )}
        <span className="ml-auto font-mono text-[10px] text-text-muted/60">{filtered.length}</span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center gap-2">
            <span className="font-mono text-[10px] text-text-muted/30 tracking-widest">◆ ◆ ◆</span>
            <p className="font-sans text-xs text-text-muted/50 leading-relaxed">
              Waiting for next analysis cycle.
            </p>
            <p className="font-sans text-[11px] text-text-muted/35">
              Claude analyzes each symbol every 5 min during market hours.
            </p>
          </div>
        ) : (
          filtered.map((dec, i) => (
            <DecisionCard key={dec.id || i} dec={dec} />
          ))
        )}
      </div>
    </div>
  );
}
