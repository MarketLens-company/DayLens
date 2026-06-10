import React from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtPct, fmtNum } from '../utils/format';

export default function PositionsPanel() {
  const { positions, refetch } = useTrading();

  return (
    <div className="bg-surface border border-border rounded flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="font-sans text-xs text-text-muted uppercase tracking-widest">OPEN POSITIONS</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-text-muted">{positions.length} open</span>
          <button
            onClick={refetch.positions}
            className="text-text-muted hover:text-text-primary font-mono text-xs transition-colors"
          >↺</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="text-center text-text-muted font-sans text-xs py-6 px-4 leading-relaxed">
            No open positions · Auto-trade will open positions when signals exceed confidence threshold
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-1.5 font-sans text-[10px] text-text-muted uppercase tracking-wider">SYM</th>
                <th className="text-right px-2 py-1.5 font-sans text-[10px] text-text-muted uppercase tracking-wider">QTY</th>
                <th className="text-right px-2 py-1.5 font-sans text-[10px] text-text-muted uppercase tracking-wider">ENTRY</th>
                <th className="text-right px-2 py-1.5 font-sans text-[10px] text-text-muted uppercase tracking-wider">PRICE</th>
                <th className="text-right px-3 py-1.5 font-sans text-[10px] text-text-muted uppercase tracking-wider">P&L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(pos => {
                const unrealizedPL = parseFloat(pos.unrealized_pl);
                const unrealizedPLPct = parseFloat(pos.unrealized_plpc) * 100;
                const currentPrice = parseFloat(pos.current_price);
                const entryPrice = parseFloat(pos.avg_entry_price);
                const qty = parseFloat(pos.qty);
                const side = pos.side;

                return (
                  <tr key={pos.symbol} className="border-b border-border hover:bg-void/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1 rounded font-bold font-mono border ${
                          side === 'long'
                            ? 'bg-signal/10 text-signal border-signal/20'
                            : 'bg-loss/10 text-loss border-loss/20'
                        }`}>
                          {side.toUpperCase()}
                        </span>
                        <span className="font-mono font-bold text-sm text-text-primary">{pos.symbol}</span>
                      </div>
                    </td>
                    <td className="text-right px-2 py-2 font-mono text-xs text-text-primary">{fmtNum(qty, qty % 1 === 0 ? 0 : 2)}</td>
                    <td className="text-right px-2 py-2 font-mono text-xs text-text-primary">{fmtPrice(entryPrice)}</td>
                    <td className="text-right px-2 py-2 font-mono text-xs text-text-primary">{fmtPrice(currentPrice)}</td>
                    <td className="text-right px-3 py-2">
                      <div className={`font-mono text-xs ${unrealizedPL >= 0 ? 'text-signal' : 'text-loss'}`}>
                        <div>{unrealizedPL >= 0 ? '+' : ''}{fmtNum(unrealizedPL, 2)}</div>
                        <div className="text-[10px] opacity-75">{fmtPct(unrealizedPLPct)}</div>
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
