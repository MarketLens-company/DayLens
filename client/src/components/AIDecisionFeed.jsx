import React, { useRef, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtDateTime, bgForAction, colorForAction } from '../utils/format';

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 75 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-gray-500 w-7">{pct}%</span>
    </div>
  );
}

export default function AIDecisionFeed() {
  const { decisions, selectedSymbol } = useTrading();
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const isAtBottomRef = useRef(true);

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
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border flex-shrink-0">
        <span className="text-xs font-mono text-gray-500 tracking-widest">AI DECISION FEED</span>
        <div className="flex items-center gap-2">
          {selectedSymbol && (
            <span className="text-xs font-mono text-cyan-400/70">{selectedSymbol}</span>
          )}
          <span className="text-xs font-mono text-gray-600">{filtered.length} decisions</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 scroll-panel overflow-y-auto p-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-600 text-xs font-mono py-6">
            Waiting for AI analysis...
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
    <div className={`card p-2.5 animate-slide-down ${dec.executed ? 'border-l-2 border-l-green-400/60' : ''}`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs text-gray-200">{dec.symbol}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${bgForAction(dec.action)}`}>
            {dec.action}
          </span>
          {dec.quantity > 0 && dec.action !== 'HOLD' && (
            <span className="text-[10px] font-mono text-gray-500">{dec.quantity} sh</span>
          )}
          {dec.executed ? (
            <span className="text-[10px] font-mono text-green-400/80">✓ EXECUTED</span>
          ) : dec.skip_reason ? (
            <span className="text-[10px] font-mono text-gray-600 truncate max-w-[100px]" title={dec.skip_reason}>
              ⊘ skipped
            </span>
          ) : null}
        </div>
        <span className="text-[10px] font-mono text-gray-600 shrink-0 ml-2">
          {fmtDateTime(dec.created_at || dec.timestamp)}
        </span>
      </div>

      <ConfidenceBar value={dec.confidence} />

      {dec.reasoning && (
        <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed font-sans">
          {dec.reasoning}
        </p>
      )}

      {(dec.stop_loss || dec.take_profit) && (
        <div className="flex gap-3 mt-1.5 text-[10px] font-mono">
          {dec.stop_loss && (
            <span className="text-red-400/70">SL {fmtPrice(dec.stop_loss)}</span>
          )}
          {dec.take_profit && (
            <span className="text-green-400/70">TP {fmtPrice(dec.take_profit)}</span>
          )}
        </div>
      )}

      {dec.skip_reason && (
        <p className="text-[10px] text-gray-600 mt-1 font-mono">{dec.skip_reason}</p>
      )}
    </div>
  );
}
