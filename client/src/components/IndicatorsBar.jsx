import React, { useEffect, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { apiFetch } from '../hooks/useApi';
import { fmtNum, fmtPrice } from '../utils/format';

function IndStat({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="flex flex-col items-center px-3 border-r border-border last:border-r-0 flex-shrink-0">
      <span className="font-sans text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</span>
      <span className={`font-mono text-xs ${color}`}>{value}</span>
    </div>
  );
}

function RSIGauge({ value }) {
  if (value == null) return <IndStat label="RSI" value="—" />;
  const isOverbought = value > 70;
  const isOversold = value < 30;
  const color = isOverbought ? 'text-loss' : isOversold ? 'text-signal' : 'text-text-muted';
  const statusColor = isOverbought ? 'text-loss' : isOversold ? 'text-signal' : 'text-text-muted';
  const label = isOverbought ? 'OVERBOUGHT' : isOversold ? 'OVERSOLD' : 'NEUTRAL';
  return (
    <div className="flex flex-col items-center px-3 border-r border-border flex-shrink-0">
      <span className="font-sans text-[10px] text-text-muted uppercase tracking-wider mb-0.5">RSI(14)</span>
      <span className={`font-mono text-xs ${color}`}>{fmtNum(value, 1)}</span>
      <span className={`font-sans text-[9px] ${statusColor}`}>{label}</span>
    </div>
  );
}

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
    <div className="bg-surface border-b border-border px-4 py-1.5 flex items-center flex-shrink-0">
      <span className="font-sans text-xs text-text-muted">No indicator data</span>
    </div>
  );

  const macdColor = ind.macd?.histogram > 0 ? 'text-signal' : 'text-loss';
  const trendColor = ind.trend === 'bullish' ? 'text-signal' : ind.trend === 'bearish' ? 'text-loss' : 'text-warn';
  const volColor = ind.volumeRatio > 1.5 ? 'text-warn' : ind.volumeRatio < 0.7 ? 'text-text-muted' : 'text-text-primary';

  return (
    <div className="bg-surface border-b border-border px-4 py-1.5 flex items-center gap-6 overflow-x-auto flex-shrink-0">
      <RSIGauge value={ind.rsi} />
      <IndStat
        label="MACD"
        value={ind.macd ? fmtNum(ind.macd.histogram, 4) : '—'}
        color={macdColor}
      />
      {ind.bollingerBands && (
        <>
          <IndStat label="BB UPPER" value={fmtPrice(ind.bollingerBands.upper)} color="text-warn" />
          <IndStat label="BB LOWER" value={fmtPrice(ind.bollingerBands.lower)} color="text-warn" />
        </>
      )}
      <IndStat label="EMA 9" value={fmtPrice(ind.ema9)} color="text-text-primary" />
      <IndStat label="EMA 21" value={fmtPrice(ind.ema21)} color="text-text-primary" />
      <IndStat label="VOL RATIO" value={ind.volumeRatio ? fmtNum(ind.volumeRatio, 2) + 'x' : '—'} color={volColor} />
      <IndStat
        label="TREND"
        value={ind.trend?.toUpperCase() || '—'}
        color={trendColor}
      />
    </div>
  );
}
