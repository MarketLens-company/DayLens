import React, { useEffect, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtChange, fmtPct } from '../utils/format';

function Clock({ clock }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const etTime = time.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const isOpen = clock?.is_open;

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-sm border tracking-widest ${
        isOpen
          ? 'bg-signal/10 text-signal border-signal/25'
          : 'bg-void text-text-muted border-border'
      }`}>
        {isOpen ? '● OPEN' : '○ CLOSED'}
      </span>
      <span className="font-mono text-xs text-text-muted">ET {etTime}</span>
    </div>
  );
}

function StatBlock({ label, value, className = '' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans text-[10px] text-text-muted uppercase tracking-[0.12em]">{label}</span>
      <span className={`font-mono text-sm text-text-primary font-medium ${className}`}>{value}</span>
    </div>
  );
}

export default function TopBar() {
  const { account, clock, config, toggleAutoTrade } = useTrading();

  const equity     = account ? parseFloat(account.equity)       : null;
  const lastEquity = account ? parseFloat(account.last_equity)  : null;
  const dailyPL    = equity && lastEquity ? equity - lastEquity : null;
  const dailyPLPct = dailyPL && lastEquity ? (dailyPL / lastEquity) * 100 : null;
  const buyingPower = account ? parseFloat(account.buying_power) : null;
  const autoTradeEnabled = config?.auto_trade_enabled === 'true';

  const plPositive = dailyPL == null ? null : dailyPL >= 0;

  return (
    <header className="bg-surface border-b border-border px-4 flex items-center h-12 gap-0 flex-shrink-0">
      <Clock clock={clock} />

      {/* Divider */}
      <span className="mx-4 text-border font-mono text-xs">│</span>

      <StatBlock label="Equity" value={fmtPrice(equity)} />

      <span className="mx-4 text-border font-mono text-xs">│</span>

      <StatBlock label="Buying Power" value={fmtPrice(buyingPower)} />

      <span className="mx-4 text-border font-mono text-xs">│</span>

      {/* Hero P&L — larger and glowing */}
      <div className="flex flex-col gap-0.5">
        <span className="font-sans text-[10px] text-text-muted uppercase tracking-[0.12em]">Daily P&amp;L</span>
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono text-base font-bold leading-none ${
            plPositive === null ? 'text-text-primary' :
            plPositive ? 'text-signal glow-profit' : 'text-loss glow-loss-txt'
          }`}>
            {fmtChange(dailyPL)}
          </span>
          <span className={`font-mono text-xs ${
            plPositive === null ? 'text-text-muted' :
            plPositive ? 'text-signal/70' : 'text-loss/70'
          }`}>
            ({fmtPct(dailyPLPct)})
          </span>
        </div>
      </div>

      {/* Auto-trade toggle */}
      <button
        onClick={() => toggleAutoTrade(!autoTradeEnabled)}
        className={`ml-auto flex items-center gap-2 font-mono text-xs font-bold tracking-widest px-3 py-1.5 rounded-sm transition-all duration-200 ${
          autoTradeEnabled
            ? 'bg-signal text-void'
            : 'bg-void text-text-muted border border-border hover:border-signal/40 hover:text-text-primary'
        }`}
      >
        {autoTradeEnabled && (
          <span className="w-1.5 h-1.5 rounded-full bg-void pulse-live shrink-0" />
        )}
        AUTO-TRADE {autoTradeEnabled ? 'ON' : 'OFF'}
      </button>
    </header>
  );
}
