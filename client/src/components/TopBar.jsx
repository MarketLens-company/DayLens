import React, { useEffect, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { fmtPrice, fmtChange, fmtPct, colorForValue } from '../utils/format';

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
      <span
        className={`w-2 h-2 rounded-full blink ${isOpen ? 'bg-green-400' : 'bg-gray-500'}`}
      />
      <span className={`num text-xs font-mono ${isOpen ? 'text-green-400' : 'text-gray-500'}`}>
        {isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
      </span>
      <span className="text-gray-600 text-xs font-mono">•</span>
      <span className="text-gray-400 text-xs font-mono">ET {etTime}</span>
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
    <header className="flex items-center justify-between px-4 h-12 bg-bg-panel border-b border-bg-border flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <span className="text-cyan-400 font-mono font-bold text-sm tracking-widest">DAYLENS</span>
        <span className="text-bg-border">│</span>
        <MarketStatus clock={clock} />
        <span className="text-bg-border">│</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-cyan-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500 font-mono">{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Account stats */}
      <div className="flex items-center gap-6">
        <Stat label="EQUITY" value={fmtPrice(equity)} />
        <Stat label="BUYING POWER" value={fmtPrice(buyingPower)} />
        <div className="flex flex-col items-end">
          <span className="text-gray-600 text-xs font-mono leading-none mb-0.5">DAILY P&L</span>
          <div className="flex items-center gap-1.5">
            <span className={`num text-sm font-mono font-medium ${colorForValue(dailyPL)}`}>
              {fmtChange(dailyPL)}
            </span>
            <span className={`num text-xs font-mono ${colorForValue(dailyPLPct)}`}>
              ({fmtPct(dailyPLPct)})
            </span>
          </div>
        </div>

        <span className="text-bg-border">│</span>

        {/* Auto-trade toggle */}
        <button
          onClick={() => toggleAutoTrade(!autoTradeEnabled)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
            autoTradeEnabled
              ? 'bg-green-400/15 text-green-400 border border-green-400/40 glow-green'
              : 'bg-bg-card text-gray-500 border border-bg-border hover:border-gray-500'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${autoTradeEnabled ? 'bg-green-400 blink' : 'bg-gray-600'}`} />
          AUTO-TRADE {autoTradeEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-gray-600 text-xs font-mono leading-none mb-0.5">{label}</span>
      <span className="num text-sm font-mono font-medium text-gray-200">{value}</span>
    </div>
  );
}
