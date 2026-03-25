import React, { useEffect, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { apiFetch } from '../hooks/useApi';
import { fmtNum, fmtPrice } from '../utils/format';

function IndStat({ label, value, color = 'text-gray-300' }) {
  return (
    <div className="flex flex-col items-center px-3 border-r border-bg-border last:border-r-0">
      <span className="text-[9px] font-mono text-gray-600 tracking-wider mb-0.5">{label}</span>
      <span className={`text-xs font-mono font-medium ${color}`}>{value}</span>
    </div>
  );
}

function RSIGauge({ value }) {
  if (value == null) return <IndStat label="RSI" value="—" />;
  const color = value > 70 ? 'text-red-400' : value < 30 ? 'text-green-400' : 'text-gray-300';
  const label = value > 70 ? 'OVERBOUGHT' : value < 30 ? 'OVERSOLD' : 'NEUTRAL';
  return (
    <div className="flex flex-col items-center px-3 border-r border-bg-border">
      <span className="text-[9px] font-mono text-gray-600 tracking-wider mb-0.5">RSI(14)</span>
      <span className={`text-xs font-mono font-medium ${color}`}>{fmtNum(value, 1)}</span>
      <span className={`text-[9px] font-mono ${color} opacity-60`}>{label}</span>
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
    <div className="h-10 bg-bg-panel border-b border-bg-border flex items-center px-3">
      <span className="text-xs font-mono text-gray-600">No indicator data</span>
    </div>
  );

  const macdColor = ind.macd?.histogram > 0 ? 'text-green-400' : 'text-red-400';
  const trendColor = ind.trend === 'bullish' ? 'text-green-400' : ind.trend === 'bearish' ? 'text-red-400' : 'text-amber-400';
  const volColor = ind.volumeRatio > 1.5 ? 'text-amber-400' : ind.volumeRatio < 0.7 ? 'text-gray-500' : 'text-gray-300';

  return (
    <div className="h-11 bg-bg-panel border-b border-bg-border flex items-center flex-shrink-0 overflow-x-auto">
      <RSIGauge value={ind.rsi} />
      <IndStat
        label="MACD"
        value={ind.macd ? fmtNum(ind.macd.histogram, 4) : '—'}
        color={macdColor}
      />
      {ind.bollingerBands && (
        <>
          <IndStat label="BB UPPER" value={fmtPrice(ind.bollingerBands.upper)} color="text-amber-400/70" />
          <IndStat label="BB LOWER" value={fmtPrice(ind.bollingerBands.lower)} color="text-amber-400/70" />
        </>
      )}
      <IndStat label="EMA 9" value={fmtPrice(ind.ema9)} color="text-purple-400/80" />
      <IndStat label="EMA 21" value={fmtPrice(ind.ema21)} color="text-cyan-400/80" />
      <IndStat label="VOL RATIO" value={ind.volumeRatio ? fmtNum(ind.volumeRatio, 2) + 'x' : '—'} color={volColor} />
      <IndStat label="TREND" value={ind.trend?.toUpperCase() || '—'} color={trendColor} />
    </div>
  );
}
