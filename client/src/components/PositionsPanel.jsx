import React from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtPct, fmtNum } from '../utils/format';

export default function PositionsPanel() {
  const { positions, refetch } = useTrading();

  return (
    <div className="bracket bg-surface border border-border rounded-sm flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="font-sans text-[10px] text-text-muted uppercase tracking-[0.15em]">Open Positions</span>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] ${positions.length > 0 ? 'text-signal' : 'text-text-muted/60'}`}>
            {positions.length} open
          </span>
          <button
            onClick={refetch.positions}
            className="font-mono text-[10px] text-text-muted/50 hover:text-text-primary transition-colors"
          >↺</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 px-4 text-center gap-1">
            <p className="font-sans text-xs text-text-muted/50">No open positions</p>
            <p className="font-sans text-[11px] text-text-muted/35">
              Auto-trade opens positions when AI confidence exceeds threshold.
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['SYM', 'QTY', 'ENTRY', 'PRICE', 'P&L'].map((h, i) => (
                  <th key={h}
                    className={`py-1.5 font-sans text-[9px] text-text-muted/60 uppercase tracking-wider ${i === 0 ? 'text-left px-3' : i === 4 ? 'text-right px-3' : 'text-right px-2'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map(pos => {
                const uPL    = parseFloat(pos.unrealized_pl);
                const uPLPct = parseFloat(pos.unrealized_plpc) * 100;
                const curr   = parseFloat(pos.current_price);
                const entry  = parseFloat(pos.avg_entry_price);
                const qty    = parseFloat(pos.qty);
                const isLong = pos.side === 'long';
                const plPos  = uPL >= 0;

                return (
                  <tr key={pos.symbol} className="border-b border-border hover:bg-void/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1 py-0.5 rounded-sm font-mono font-bold border ${
                          isLong ? 'bg-signal/8 text-signal border-signal/15' : 'bg-loss/8 text-loss border-loss/15'
                        }`}>{pos.side.toUpperCase()}</span>
                        <span className="font-mono font-bold text-xs text-text-primary">{pos.symbol}</span>
                      </div>
                    </td>
                    <td className="text-right px-2 py-2 font-mono text-xs text-text-muted">{fmtNum(qty, qty % 1 === 0 ? 0 : 2)}</td>
                    <td className="text-right px-2 py-2 font-mono text-xs text-text-muted">{fmtPrice(entry)}</td>
                    <td className="text-right px-2 py-2 font-mono text-xs text-text-primary">{fmtPrice(curr)}</td>
                    <td className="text-right px-3 py-2">
                      <div className={`font-mono text-xs font-medium ${plPos ? 'text-signal' : 'text-loss'}`}>
                        <div>{plPos ? '+' : ''}{fmtNum(uPL, 2)}</div>
                        <div className="text-[10px] opacity-60">{fmtPct(uPLPct)}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
