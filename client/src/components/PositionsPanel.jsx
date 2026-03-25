import React from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtPct, fmtNum, colorForValue } from '../utils/format';

export default function PositionsPanel() {
  const { positions, refetch } = useTrading();

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border flex-shrink-0">
        <span className="text-xs font-mono text-gray-500 tracking-widest">OPEN POSITIONS</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-600">{positions.length} open</span>
          <button
            onClick={refetch.positions}
            className="text-gray-600 hover:text-gray-400 font-mono text-xs"
          >↺</button>
        </div>
      </div>

      <div className="flex-1 scroll-panel overflow-y-auto">
        {positions.length === 0 ? (
          <div className="text-center text-gray-600 text-xs font-mono py-6">
            No open positions
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-600 border-b border-bg-border">
                <th className="text-left px-3 py-1.5">SYM</th>
                <th className="text-right px-2 py-1.5">QTY</th>
                <th className="text-right px-2 py-1.5">ENTRY</th>
                <th className="text-right px-2 py-1.5">PRICE</th>
                <th className="text-right px-3 py-1.5">P&L</th>
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
                  <tr key={pos.symbol} className="border-b border-bg-border/50 hover:bg-bg-hover transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1 rounded font-bold ${
                          side === 'long' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                        }`}>
                          {side.toUpperCase()}
                        </span>
                        <span className="text-gray-200 font-bold">{pos.symbol}</span>
                      </div>
                    </td>
                    <td className="text-right px-2 py-2 text-gray-300">{fmtNum(qty, qty % 1 === 0 ? 0 : 2)}</td>
                    <td className="text-right px-2 py-2 text-gray-400">{fmtPrice(entryPrice)}</td>
                    <td className="text-right px-2 py-2 text-gray-200">{fmtPrice(currentPrice)}</td>
                    <td className="text-right px-3 py-2">
                      <div className={colorForValue(unrealizedPL)}>
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
