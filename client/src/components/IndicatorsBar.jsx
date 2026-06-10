import React, { useEffect, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { apiFetch } from '../hooks/useApi';
import { fmtNum, fmtPrice } from '../utils/format';

function Pip({ label, value, valueColor = 'text-text-primary', sub, subColor }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="font-sans text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-xs font-medium ${valueColor}`}>{value}</span>
      {sub && <span className={`font-mono text-[10px] ${subColor || 'text-text-muted'}`}>{sub}</span>}
    </div>
  );
}

function RSIPip({ value }) {
  if (value == null) return <Pip label="RSI" value="—" />;
  const isOverbought = value > 70;
  const isOversold   = value < 30;
  const color  = isOverbought ? 'text-loss' : isOversold ? 'text-signal' : 'text-text-primary';
  const badge  = isOverbought ? 'OVERBOUGHT' : isOversold ? 'OVERSOLD' : 'NEUTRAL';
  const badgeC = isOverbought ? 'text-loss/60' : isOversold ? 'text-signal/60' : 'text-text-muted/60';

  /* Mini gauge bar */
  const pct = Math.min(100, Math.max(0, value));
  const barColor = isOverbought ? 'bg-loss' : isOversold ? 'bg-signal' : 'bg-text-muted';

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="font-sans text-[10px] text-text-muted uppercase tracking-wider">RSI(14)</span>
      <div className="flex items-center gap-1">
        <div className="w-12 h-1 bg-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`font-mono text-xs font-medium ${color}`}>{fmtNum(value, 1)}</span>
      </div>
      <span className={`font-mono text-[9px] tracking-wider ${badgeC}`}>{badge}</span>
    </div>
  );
}

const Divider = () => <span className="text-border font-mono text-xs select-none">│</span>;

export default function IndicatorsBar() {
  const { selectedSymbol } = useTrading();
  const [ind, setInd] = useState(null);

  useEffect(() => {
    if (!selectedSymbol) return;
    const load = async () => {
      try {
        const data = await apiFetch(`/quotes/${selectedSymbol}`);
        setInd(data.indicators);
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [selectedSymbol]);

  if (!ind) return (
    <div className="bg-void border-b border-border px-4 py-1.5 flex items-center flex-shrink-0 h-8">
      <span className="font-mono text-[10px] text-text-muted/40">No indicator data</span>
    </div>
  );

  const macdColor = ind.macd?.histogram > 0 ? 'text-signal' : 'text-loss';
  const trendColor = ind.trend === 'bullish' ? 'text-signal' : ind.trend === 'bearish' ? 'text-loss' : 'text-warn';
  const trendArrow = ind.trend === 'bullish' ? '↑' : ind.trend === 'bearish' ? '↓' : '→';
  const volColor = ind.volumeRatio > 1.5 ? 'text-warn' : ind.volumeRatio < 0.7 ? 'text-text-muted' : 'text-text-primary';

  return (
    <div className="bg-void border-b border-border px-4 flex items-center gap-3 overflow-x-auto flex-shrink-0 h-8">
      <RSIPip value={ind.rsi} />
      <Divider />
      <Pip
        label="MACD"
        value={ind.macd ? fmtNum(ind.macd.histogram, 4) : '—'}
        valueColor={macdColor}
      />
      {ind.bollingerBands && (
        <>
          <Divider />
          <Pip
            label="BB"
            value={`${fmtPrice(ind.bollingerBands.upper)} / ${fmtPrice(ind.bollingerBands.lower)}`}
            valueColor="text-warn/80"
          />
        </>
      )}
      <Divider />
      <Pip label="EMA9" value={fmtPrice(ind.ema9)} valueColor="text-text-primary/70" />
      <Pip label="EMA21" value={fmtPrice(ind.ema21)} valueColor="text-signal/70" />
      <Divider />
      <Pip
        label="VOL"
        value={ind.volumeRatio ? fmtNum(ind.volumeRatio, 2) + 'x' : '—'}
        valueColor={volColor}
      />
      <Divider />
      <Pip
        label="TREND"
        value={`${ind.trend?.toUpperCase() || '—'} ${trendArrow}`}
        valueColor={trendColor}
      />
    </div>
  );
}
