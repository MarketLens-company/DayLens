import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../hooks/useApi';
import { fmtPrice, fmtDateTime, fmtNum, colorForValue } from '../utils/format';

const SYMBOLS = ['ALL', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];

export default function TradeHistory() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [winFilter, setWinFilter] = useState('ALL'); // ALL | WIN | LOSS

  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const sym = filter !== 'ALL' ? `?symbol=${filter}` : '';
      const data = await apiFetch(`/trades${sym}`);
      setTrades(data);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  const displayed = trades.filter(t => {
    if (winFilter === 'WIN') return t.pnl > 0;
    if (winFilter === 'LOSS') return t.pnl <= 0;
    return true;
  });

  const totalPnl = displayed.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const wins = displayed.filter(t => t.pnl > 0).length;
  const winRate = displayed.length ? (wins / displayed.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full min-h-0 p-3 gap-3">
      {/* Stats bar */}
      <div className="flex gap-3">
        <StatCard label="Total Trades" value={displayed.length} />
        <StatCard label="Win Rate" value={winRate.toFixed(1) + '%'} color={winRate >= 50 ? 'text-green-400' : 'text-red-400'} />
        <StatCard label="Total P&L" value={(totalPnl >= 0 ? '+' : '') + '$' + fmtNum(totalPnl)} color={colorForValue(totalPnl)} />
        <StatCard label="Wins" value={wins} color="text-green-400" />
        <StatCard label="Losses" value={displayed.length - wins} color="text-red-400" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 panel px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-gray-600 mr-1">SYMBOL</span>
          {SYMBOLS.map(s => (
            <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</FilterBtn>
          ))}
        </div>
        <span className="text-bg-border">│</span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-gray-600 mr-1">RESULT</span>
          {['ALL', 'WIN', 'LOSS'].map(w => (
            <FilterBtn key={w} active={winFilter === w} onClick={() => setWinFilter(w)}
              color={w === 'WIN' ? 'green' : w === 'LOSS' ? 'red' : 'default'}
            >
              {w}
            </FilterBtn>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={loadTrades}
            className="text-xs font-mono text-gray-500 hover:text-gray-300"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 panel overflow-hidden flex flex-col min-h-0">
        <table className="w-full text-xs font-mono">
          <thead className="border-b border-bg-border flex-shrink-0">
            <tr className="text-gray-600">
              <th className="text-left px-3 py-2">TIME</th>
              <th className="text-left px-2 py-2">SYM</th>
              <th className="text-left px-2 py-2">SIDE</th>
              <th className="text-right px-2 py-2">QTY</th>
              <th className="text-right px-2 py-2">ENTRY</th>
              <th className="text-right px-2 py-2">EXIT</th>
              <th className="text-right px-2 py-2">P&L</th>
              <th className="text-right px-2 py-2">CONF</th>
              <th className="text-left px-3 py-2">STATUS</th>
            </tr>
          </thead>
        </table>
        <div className="flex-1 scroll-panel overflow-y-auto">
          <table className="w-full text-xs font-mono">
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-600">Loading...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-600">No trades found</td></tr>
              ) : displayed.map(trade => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TradeRow({ trade }) {
  const [expanded, setExpanded] = useState(false);
  const pnl = trade.pnl;
  const hasExit = trade.exit_price != null;

  return (
    <>
      <tr
        className="border-b border-bg-border/40 hover:bg-bg-hover cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-3 py-2 text-gray-500">{fmtDateTime(trade.created_at)}</td>
        <td className="px-2 py-2 font-bold text-gray-200">{trade.symbol}</td>
        <td className="px-2 py-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            trade.side === 'buy'
              ? 'bg-green-400/10 text-green-400'
              : 'bg-red-400/10 text-red-400'
          }`}>
            {trade.side.toUpperCase()}
          </span>
        </td>
        <td className="text-right px-2 py-2 text-gray-300">{fmtNum(trade.qty, 0)}</td>
        <td className="text-right px-2 py-2 text-gray-400">{fmtPrice(trade.entry_price)}</td>
        <td className="text-right px-2 py-2 text-gray-400">{fmtPrice(trade.exit_price)}</td>
        <td className={`text-right px-2 py-2 font-medium ${colorForValue(pnl)}`}>
          {hasExit ? (pnl >= 0 ? '+' : '') + '$' + fmtNum(pnl) : '—'}
        </td>
        <td className="text-right px-2 py-2 text-gray-500">
          {trade.ai_confidence != null ? (trade.ai_confidence * 100).toFixed(0) + '%' : '—'}
        </td>
        <td className="px-3 py-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            trade.status === 'closed'
              ? 'bg-gray-700/50 text-gray-400'
              : 'bg-cyan-400/10 text-cyan-400'
          }`}>
            {trade.status.toUpperCase()}
          </span>
        </td>
      </tr>
      {expanded && trade.ai_reasoning && (
        <tr className="bg-bg-hover">
          <td colSpan={9} className="px-6 py-2 text-gray-400 text-[11px] font-sans italic border-b border-bg-border">
            AI: {trade.ai_reasoning}
          </td>
        </tr>
      )}
    </>
  );
}

function StatCard({ label, value, color = 'text-gray-200' }) {
  return (
    <div className="panel px-4 py-2 flex-1 text-center">
      <div className="text-[10px] font-mono text-gray-600 mb-1">{label}</div>
      <div className={`font-mono font-bold text-base num ${color}`}>{value}</div>
    </div>
  );
}

function FilterBtn({ children, active, onClick, color = 'default' }) {
  const activeColors = {
    default: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/40',
    green: 'bg-green-400/15 text-green-400 border-green-400/40',
    red: 'bg-red-400/15 text-red-400 border-red-400/40',
  };
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
        active
          ? activeColors[color]
          : 'text-gray-500 border-transparent hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  );
}
