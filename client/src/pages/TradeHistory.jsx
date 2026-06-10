import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../hooks/useApi';
import { fmtPrice, fmtDateTime, fmtNum } from '../utils/format';

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
    <div className="bg-void flex flex-col h-full min-h-0 p-3 gap-3">
      {/* Stats bar */}
      <div className="flex gap-3">
        <StatCard label="Total Trades" value={displayed.length} />
        <StatCard label="Win Rate" value={winRate.toFixed(1) + '%'} color={winRate >= 50 ? 'text-signal' : 'text-loss'} />
        <StatCard label="Total P&L" value={(totalPnl >= 0 ? '+' : '') + '$' + fmtNum(totalPnl)} color={totalPnl >= 0 ? 'text-signal' : 'text-loss'} />
        <StatCard label="Wins" value={wins} color="text-signal" />
        <StatCard label="Losses" value={displayed.length - wins} color="text-loss" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-surface border border-border rounded px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="font-sans text-xs text-text-muted mr-1">SYMBOL</span>
          {SYMBOLS.map(s => (
            <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</FilterBtn>
          ))}
        </div>
        <span className="text-border">│</span>
        <div className="flex items-center gap-1">
          <span className="font-sans text-xs text-text-muted mr-1">RESULT</span>
          {['ALL', 'WIN', 'LOSS'].map(w => (
            <FilterBtn key={w} active={winFilter === w} onClick={() => setWinFilter(w)}
              color={w === 'WIN' ? 'signal' : w === 'LOSS' ? 'loss' : 'default'}
            >
              {w}
            </FilterBtn>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={loadTrades}
            className="font-mono text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-surface border border-border rounded overflow-hidden flex flex-col min-h-0">
        <table className="w-full text-xs">
          <thead className="bg-surface border-b border-border flex-shrink-0">
            <tr>
              <th className="text-left px-3 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">TIME</th>
              <th className="text-left px-2 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">SYM</th>
              <th className="text-left px-2 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">SIDE</th>
              <th className="text-right px-2 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">QTY</th>
              <th className="text-right px-2 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">ENTRY</th>
              <th className="text-right px-2 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">EXIT</th>
              <th className="text-right px-2 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">P&L</th>
              <th className="text-right px-2 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">CONF</th>
              <th className="text-left px-3 py-2 font-sans text-[10px] text-text-muted uppercase tracking-wider">STATUS</th>
            </tr>
          </thead>
        </table>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 font-mono text-text-muted">—</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 font-sans text-text-muted text-xs">No trades found</td></tr>
              ) : displayed.map((trade, idx) => (
                <TradeRow key={trade.id} trade={trade} idx={idx} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TradeRow({ trade, idx }) {
  const [expanded, setExpanded] = useState(false);
  const pnl = trade.pnl;
  const hasExit = trade.exit_price != null;

  return (
    <>
      <tr
        className={`border-b border-border cursor-pointer transition-colors hover:bg-void/50 ${idx % 2 === 0 ? 'bg-void' : 'bg-surface'}`}
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-3 py-2 font-mono text-xs text-text-muted">{fmtDateTime(trade.created_at)}</td>
        <td className="px-2 py-2 font-mono font-bold text-sm text-text-primary">{trade.symbol}</td>
        <td className="px-2 py-2">
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
            trade.side === 'buy'
              ? 'bg-signal/10 text-signal border-signal/20'
              : 'bg-loss/10 text-loss border-loss/20'
          }`}>
            {trade.side.toUpperCase()}
          </span>
        </td>
        <td className="text-right px-2 py-2 font-mono text-sm text-text-primary">{fmtNum(trade.qty, 0)}</td>
        <td className="text-right px-2 py-2 font-mono text-sm text-text-primary">{fmtPrice(trade.entry_price)}</td>
        <td className="text-right px-2 py-2 font-mono text-sm text-text-primary">{fmtPrice(trade.exit_price)}</td>
        <td className={`text-right px-2 py-2 font-mono text-sm font-medium ${pnl == null ? 'text-text-primary' : pnl >= 0 ? 'text-signal' : 'text-loss'}`}>
          {hasExit ? (pnl >= 0 ? '+' : '') + '$' + fmtNum(pnl) : '—'}
        </td>
        <td className="text-right px-2 py-2 font-mono text-xs text-text-muted">
          {trade.ai_confidence != null ? (trade.ai_confidence * 100).toFixed(0) + '%' : '—'}
        </td>
        <td className="px-3 py-2">
          {hasExit ? (
            pnl > 0 ? (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-signal/10 text-signal border border-signal/20">WIN</span>
            ) : (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-loss/10 text-loss border border-loss/20">LOSS</span>
            )
          ) : (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface text-text-muted border border-border">
              {trade.status.toUpperCase()}
            </span>
          )}
        </td>
      </tr>
      {expanded && trade.ai_reasoning && (
        <tr className="bg-void/50">
          <td colSpan={9} className="px-6 py-2 font-sans text-xs text-text-muted italic border-b border-border">
            AI: {trade.ai_reasoning}
          </td>
        </tr>
      )}
    </>
  );
}

function StatCard({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-surface border border-border rounded px-4 py-2 flex-1 text-center">
      <div className="font-sans text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono font-bold text-base ${color}`}>{value}</div>
    </div>
  );
}

function FilterBtn({ children, active, onClick, color = 'default' }) {
  const activeColors = {
    default: 'bg-signal/15 text-signal border-signal/40',
    signal:  'bg-signal/15 text-signal border-signal/40',
    loss:    'bg-loss/15 text-loss border-loss/40',
  };
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors ${
        active
          ? activeColors[color]
          : 'text-text-muted border-transparent hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}
