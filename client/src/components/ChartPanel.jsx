import React, { useEffect, useState, useCallback } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTrading } from '../context/TradingContext';
import { apiFetch } from '../hooks/useApi';
import { fmtPrice, fmtTime, fmtNum } from '../utils/format';

const TIMEFRAMES = ['1Min', '5Min'];

function CandlestickBar(props) {
  const { x, y, width, height, open, close, high, low, payload } = props;
  if (!payload) return null;
  const isUp = payload.close >= payload.open;
  const color = isUp ? '#22c55e' : '#ef4444';
  const barX = x + width / 4;
  const barW = width / 2;
  const wickX = x + width / 2;

  const scaleY = y => props.yAxis ? props.yAxis.scale(y) : y;

  return null; // recharts doesn't support true candlestick natively, using bars instead
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-bg-panel border border-bg-border rounded p-2 text-xs font-mono shadow-xl">
      <div className="text-gray-400 mb-1">{d.time ? new Date(d.time).toLocaleTimeString() : ''}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-gray-500">O</span><span className="text-gray-200">{fmtPrice(d.open)}</span>
        <span className="text-gray-500">H</span><span className="text-green-400">{fmtPrice(d.high)}</span>
        <span className="text-gray-500">L</span><span className="text-red-400">{fmtPrice(d.low)}</span>
        <span className="text-gray-500">C</span><span className="text-gray-200">{fmtPrice(d.close)}</span>
        <span className="text-gray-500">Vol</span><span className="text-cyan-400">{fmtNum(d.volume, 0)}</span>
      </div>
      {d.ema9 && <div className="mt-1 text-[10px] text-purple-400">EMA9: {fmtPrice(d.ema9)}</div>}
      {d.ema21 && <div className="text-[10px] text-cyan-400">EMA21: {fmtPrice(d.ema21)}</div>}
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
    <div className="panel flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-gray-200 text-sm">{selectedSymbol || '—'}</span>
          {quote && (
            <>
              <span className={`num font-mono text-lg font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {fmtPrice(quote.price)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Overlay toggles */}
          <ToggleBtn active={showBB} onClick={() => setShowBB(v => !v)} label="BB" color="amber" />
          <ToggleBtn active={showEMA} onClick={() => setShowEMA(v => !v)} label="EMA" color="purple" />
          <ToggleBtn active={showVolume} onClick={() => setShowVolume(v => !v)} label="VOL" color="cyan" />

          <span className="text-bg-border">│</span>

          {/* Timeframe selector */}
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                timeframe === tf
                  ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tf}
            </button>
          ))}

          <button
            onClick={loadBars}
            className="text-xs font-mono text-gray-500 hover:text-gray-300 px-1 transition-colors"
            title="Refresh"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 p-2">
        {loading && !bars.length ? (
          <div className="flex items-center justify-center h-full text-gray-600 font-mono text-sm">
            Loading...
          </div>
        ) : !bars.length ? (
          <div className="flex items-center justify-center h-full text-gray-600 font-mono text-sm">
            No data for {selectedSymbol}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={bars} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={t => t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={{ stroke: '#1e2a3a' }}
                minTickGap={40}
              />
              <YAxis
                yAxisId="price"
                domain={[minP, maxP]}
                tickFormatter={v => '$' + v.toFixed(2)}
                tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'JetBrains Mono' }}
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
                  <Line yAxisId="price" dataKey="bbUpper" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="3 3" name="BB Upper" />
                  <Line yAxisId="price" dataKey="bbMiddle" stroke="#f59e0b40" strokeWidth={1} dot={false} strokeDasharray="2 4" name="BB Mid" />
                  <Line yAxisId="price" dataKey="bbLower" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="3 3" name="BB Lower" />
                </>
              )}

              {/* EMA lines */}
              {showEMA && (
                <>
                  <Line yAxisId="price" dataKey="ema9" stroke="#a78bfa" strokeWidth={1.5} dot={false} name="EMA 9" />
                  <Line yAxisId="price" dataKey="ema21" stroke="#22d3ee" strokeWidth={1.5} dot={false} name="EMA 21" />
                </>
              )}

              {/* Volume bars */}
              {showVolume && (
                <Bar
                  yAxisId="volume"
                  dataKey="volume"
                  fill="#22d3ee15"
                  stroke="#22d3ee30"
                  name="Volume"
                />
              )}

              {/* Price line (close) */}
              <Line
                yAxisId="price"
                dataKey="close"
                stroke={isUp ? '#22c55e' : '#ef4444'}
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

function ToggleBtn({ active, onClick, label, color }) {
  const colors = {
    amber: active ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' : 'text-gray-600 border-bg-border',
    purple: active ? 'text-purple-400 border-purple-400/40 bg-purple-400/10' : 'text-gray-600 border-bg-border',
    cyan: active ? 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10' : 'text-gray-600 border-bg-border',
  };
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${colors[color]}`}
    >
      {label}
    </button>
  );
}
