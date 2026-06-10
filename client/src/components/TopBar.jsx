import React, { useEffect, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtChange, fmtPct } from '../utils/format';

function MarketStatus({ clock }) {
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
    <div className="flex items-center gap-2">
      <span className={`font-sans text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${
        isOpen
          ? 'bg-signal/10 text-signal border-signal/30'
          : 'bg-surface text-text-muted border-border'
      }`}>
        {isOpen ? 'OPEN' : 'CLOSED'}
      </span>
      <span className="font-mono text-xs text-text-muted">ET {etTime}</span>
    </div>
  );
}

export default function TopBar() {
  const { account, clock, wsConnected, config, toggleAutoTrade } = useTrading();

  const equity = account ? parseFloat(account.equity) : null;
  const lastEquity = account ? parseFloat(account.last_equity) : null;
  const dailyPL = equity && lastEquity ? equity - lastEquity : null;
  const dailyPLPct = dailyPL && lastEquity ? (dailyPL / lastEquity) * 100 : null;
  const buyingPower = account ? parseFloat(account.buying_power) : null;
  const autoTradeEnabled = config?.auto_trade_enabled === 'true';

  return (
    <header className="bg-surface border-b border-border px-4 py-2 flex items-center gap-6 flex-shrink-0">
      <MarketStatus clock={clock} />

      <Stat label="EQUITY" value={fmtPrice(equity)} />
      <Stat label="BUYING POWER" value={fmtPrice(buyingPower)} />

      <div className="flex flex-col">
        <span className="font-sans text-[10px] text-text-muted uppercase tracking-widest leading-none mb-0.5">DAILY P&L</span>
        <div className="flex items-center gap-1.5">
          <span className={`font-mono text-sm font-medium ${dailyPL == null ? 'text-text-primary' : dailyPL >= 0 ? 'text-signal' : 'text-loss'}`}>
            {fmtChange(dailyPL)}
          </span>
          <span className={`font-mono text-xs ${dailyPLPct == null ? 'text-text-primary' : dailyPLPct >= 0 ? 'text-signal' : 'text-loss'}`}>
            ({fmtPct(dailyPLPct)})
          </span>
        </div>
      </div>

      {/* Auto-trade toggle */}
      <button
        onClick={() => toggleAutoTrade(!autoTradeEnabled)}
        className={`ml-auto font-mono text-xs font-bold tracking-widest px-3 py-1.5 rounded transition-colors ${
          autoTradeEnabled
            ? 'bg-signal text-void'
            : 'bg-surface text-text-muted border border-border hover:border-text-muted'
        }`}
      >
        AUTO-TRADE {autoTradeEnabled ? 'ON' : 'OFF'}
      </button>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="font-sans text-[10px] text-text-muted uppercase tracking-widest leading-none mb-0.5">{label}</span>
      <span className="font-mono text-sm text-text-primary font-medium">{value}</span>
    </div>
  );
}
