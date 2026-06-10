import React, { useEffect, useState, useCallback } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTrading } from '../context/TradingContext';
import { apiFetch } from '../hooks/useApi';
import { fmtPrice, fmtTime, fmtNum } from '../utils/format';

const TIMEFRAMES = ['1Min', '5Min'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-surface border border-border rounded p-2 text-xs font-mono">
      <div className="text-text-muted mb-1">{d.time ? new Date(d.time).toLocaleTimeString() : ''}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-text-muted">O</span><span className="text-text-primary">{fmtPrice(d.open)}</span>
        <span className="text-text-muted">H</span><span className="text-signal">{fmtPrice(d.high)}</span>
        <span className="text-text-muted">L</span><span className="text-loss">{fmtPrice(d.low)}</span>
        <span className="text-text-muted">C</span><span className="text-text-primary">{fmtPrice(d.close)}</span>
        <span className="text-text-muted">Vol</span><span className="text-signal">{fmtNum(d.volume, 0)}</span>
      </div>
      {d.ema9 && <div className="mt-1 text-[10px] text-text-muted">EMA9: {fmtPrice(d.ema9)}</div>}
      {d.ema21 && <div className="text-[10px] text-text-muted">EMA21: {fmtPrice(d.ema21)}</div>}
    </div>
  );
};

export default function ChartPanel() {
  const { selectedSymbol, quotes } = useTrading();
  const [bars, setBars] = useState([]);
  const [timeframe, setTimeframe] = useState('5Min');
  const [loading, setLoading] = useState(false);
  const [showBB, setShowBB] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  const loadBars = useCallback(async () => {
    if (!selectedSymbol) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/bars/${selectedSymbol}?timeframe=${timeframe}`);
      setBars(data);
    } catch {}
    setLoading(false);
  }, [selectedSymbol, timeframe]);

  useEffect(() => { loadBars(); }, [loadBars]);

  // Refresh chart every 30s
  useEffect(() => {
    const t = setInterval(loadBars, 30000);
    return () => clearInterval(t);
  }, [loadBars]);

  const quote = selectedSymbol ? quotes[selectedSymbol] : null;
  const lastBar = bars[bars.length - 1];
  const isUp = lastBar ? lastBar.close >= lastBar.open : true;

  // Price domain with padding
  const prices = bars.flatMap(b => [b.high, b.low, b.bbUpper, b.bbLower].filter(Boolean));
  const minP = prices.length ? Math.min(...prices) * 0.9995 : 0;
  const maxP = prices.length ? Math.max(...prices) * 1.0005 : 1;
  const maxVol = Math.max(...bars.map(b => b.volume || 0)) * 4;

  return (
    <div className="bg-surface border border-border rounded flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-base text-text-primary">{selectedSymbol || '—'}</span>
          {quote && (
            <span className="font-mono text-xl font-bold text-text-primary">
              {fmtPrice(quote.price)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Overlay toggles */}
          <ToggleBtn active={showBB} onClick={() => setShowBB(v => !v)} label="BB" />
          <ToggleBtn active={showEMA} onClick={() => setShowEMA(v => !v)} label="EMA" />
          <ToggleBtn active={showVolume} onClick={() => setShowVolume(v => !v)} label="VOL" />

          <span className="text-border">│</span>

          {/* Timeframe selector */}
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`font-mono text-[10px] px-2 py-1 rounded-sm transition-colors ${
                timeframe === tf
                  ? 'bg-signal text-void'
                  : 'bg-void text-text-muted border border-border hover:text-text-primary'
              }`}
            >
              {tf}
            </button>
          ))}

          <button
            onClick={loadBars}
            className="font-mono text-xs text-text-muted hover:text-text-primary px-1 transition-colors"
            title="Refresh"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 p-2">
        {loading && !bars.length ? (
          <div className="flex items-center justify-center h-full text-text-muted font-sans text-sm">
            —
          </div>
        ) : !selectedSymbol ? (
          <div className="flex items-center justify-center h-full text-text-muted font-sans text-sm">
            Add a ticker to begin tracking
          </div>
        ) : !bars.length ? (
          <div className="flex items-center justify-center h-full text-text-muted font-sans text-sm">
            No chart data · Market may be closed
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={bars} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2333" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={t => t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                tick={{ fill: '#5A6580', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={{ stroke: '#1C2333' }}
                minTickGap={40}
              />
              <YAxis
                yAxisId="price"
                domain={[minP, maxP]}
                tickFormatter={v => '$' + v.toFixed(2)}
                tick={{ fill: '#5A6580', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                width={62}
                orientation="right"
              />
              {showVolume && (
                <YAxis
                  yAxisId="volume"
                  domain={[0, maxVol]}
                  hide
                />
              )}
              <Tooltip content={<CustomTooltip />} />

              {/* Bollinger Bands */}
              {showBB && (
                <>
                  <Line yAxisId="price" dataKey="bbUpper" stroke="#F59E0B" strokeWidth={1} dot={false} strokeDasharray="3 3" name="BB Upper" />
                  <Line yAxisId="price" dataKey="bbMiddle" stroke="#F59E0B40" strokeWidth={1} dot={false} strokeDasharray="2 4" name="BB Mid" />
                  <Line yAxisId="price" dataKey="bbLower" stroke="#F59E0B" strokeWidth={1} dot={false} strokeDasharray="3 3" name="BB Lower" />
                </>
              )}

              {/* EMA lines */}
              {showEMA && (
                <>
                  <Line yAxisId="price" dataKey="ema9" stroke="#5A6580" strokeWidth={1.5} dot={false} name="EMA 9" />
                  <Line yAxisId="price" dataKey="ema21" stroke="#00D4AA" strokeWidth={1.5} dot={false} name="EMA 21" />
                </>
              )}

              {/* Volume bars */}
              {showVolume && (
                <Bar
                  yAxisId="volume"
                  dataKey="volume"
                  fill="#00D4AA15"
                  stroke="#00D4AA30"
                  name="Volume"
                />
              )}

              {/* Price line (close) */}
              <Line
                yAxisId="price"
                dataKey="close"
                stroke={isUp ? '#00D4AA' : '#EF4444'}
                strokeWidth={2}
                dot={false}
                name="Close"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function ToggleBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm border transition-colors ${
        active
          ? 'bg-signal text-void border-signal'
          : 'bg-void text-text-muted border-border hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}
