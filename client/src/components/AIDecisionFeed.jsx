import React, { useRef, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtDateTime } from '../utils/format';

function signalBadgeClass(action) {
  switch (action) {
    case 'BUY':  return 'bg-signal/10 text-signal border border-signal/20 font-mono text-[10px] px-1.5 py-0.5 rounded-sm';
    case 'SELL': return 'bg-loss/10 text-loss border border-loss/20 font-mono text-[10px] px-1.5 py-0.5 rounded-sm';
    default:     return 'bg-surface text-text-muted border border-border font-mono text-[10px] px-1.5 py-0.5 rounded-sm';
  }
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const fillColor = pct >= 50 ? 'bg-signal' : 'bg-loss';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-text-muted w-7">{pct}%</span>
    </div>
  );
}

export default function AIDecisionFeed() {
  const { decisions, selectedSymbol } = useTrading();
  const containerRef = useRef(null);

  // Auto-scroll to top on new decision (newest is first)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [decisions.length]);

  const filtered = selectedSymbol
    ? decisions.filter(d => d.symbol === selectedSymbol)
    : decisions;

  return (
    <div className="bg-surface border border-border rounded flex flex-col h-full overflow-hidden">
      <div className="border-b border-border px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <span className="font-sans text-xs text-text-muted uppercase tracking-widest">AI DECISION FEED</span>
        {selectedSymbol && (
          <span className="font-mono text-xs text-signal">{selectedSymbol}</span>
        )}
        <span className="ml-auto font-mono text-xs text-text-muted">{filtered.length}</span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center text-text-muted font-sans text-xs py-6 px-4 leading-relaxed">
            Waiting for next analysis cycle · Claude analyzes each symbol every 5 min during market hours
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

function DecisionCard({ dec }) {
  return (
    <div className={`border-b border-border px-4 py-3 hover:bg-void/30 ${dec.executed ? 'border-l-2 border-l-signal' : ''}`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-xs text-text-primary">{dec.symbol}</span>
          <span className={signalBadgeClass(dec.action)}>
            {dec.action}
          </span>
          {dec.quantity > 0 && dec.action !== 'HOLD' && (
            <span className="font-mono text-[10px] text-text-muted">{dec.quantity} sh</span>
          )}
          {dec.executed ? (
            <span className="font-mono text-[10px] text-signal">✓ EXECUTED</span>
          ) : dec.skip_reason ? (
            <span className="font-mono text-[10px] text-text-muted truncate max-w-[100px]" title={dec.skip_reason}>
              ⊘ skipped
            </span>
          ) : null}
        </div>
        <span className="font-mono text-[10px] text-text-muted shrink-0 ml-2">
          {fmtDateTime(dec.created_at || dec.timestamp)}
        </span>
      </div>

      <ConfidenceBar value={dec.confidence} />

      {dec.reasoning && (
        <p className="font-sans text-xs text-text-muted mt-1 leading-relaxed">
          {dec.reasoning}
        </p>
      )}

      {(dec.stop_loss || dec.take_profit) && (
        <div className="flex gap-3 mt-1.5 font-mono text-[10px]">
          {dec.stop_loss && (
            <span className="text-loss">SL {fmtPrice(dec.stop_loss)}</span>
          )}
          {dec.take_profit && (
            <span className="text-signal">TP {fmtPrice(dec.take_profit)}</span>
          )}
        </div>
      )}

      {dec.skip_reason && (
        <p className="font-mono text-[10px] text-text-muted mt-1">{dec.skip_reason}</p>
      )}
    </div>
  );
}
