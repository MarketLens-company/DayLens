import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';

export default function Settings() {
  const { config, updateConfig, watchlist, addToWatchlist, removeFromWatchlist } = useTrading();
  const [form, setForm] = useState(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (config && !form) {
      setForm({ ...config });
    }
  }, [config]);

  if (!form) return (
    <div className="flex items-center justify-center h-full text-gray-600 font-mono text-sm">
      Loading config...
    </div>
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateConfig(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleAddSymbol = async () => {
    const sym = newSymbol.toUpperCase().trim();
    if (!sym) return;
    await addToWatchlist(sym);
    setNewSymbol('');
  };

  const autoTradeEnabled = form.auto_trade_enabled === 'true';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto p-4 gap-4 max-w-3xl mx-auto w-full">
      <h2 className="text-sm font-mono text-gray-400 tracking-widest mt-2">CONFIGURATION</h2>

      {/* Auto-trade master toggle */}
      <section className="panel p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-sm font-semibold text-gray-200 mb-0.5">Autonomous Trading</h3>
            <p className="text-xs text-gray-500">When enabled, the AI will automatically execute orders above the confidence threshold.</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, auto_trade_enabled: autoTradeEnabled ? 'false' : 'true' }))}
            className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${
              autoTradeEnabled ? 'bg-green-400' : 'bg-bg-border'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                autoTradeEnabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {autoTradeEnabled && (
          <p className="text-xs font-mono text-green-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full blink" /> LIVE TRADING ACTIVE — REAL ORDERS WILL BE PLACED
          </p>
        )}
      </section>

      {/* Trading params */}
      <section className="panel p-4 space-y-4">
        <h3 className="font-mono text-xs text-gray-500 tracking-widest">RISK PARAMETERS</h3>

        <SliderField
          label="Confidence Threshold"
          hint="Minimum AI confidence to execute a trade"
          value={parseFloat(form.confidence_threshold)}
          min={0.5} max={1.0} step={0.05}
          format={v => (v * 100).toFixed(0) + '%'}
          onChange={v => setForm(f => ({ ...f, confidence_threshold: String(v) }))}
        />

        <SliderField
          label="Max Position Size"
          hint="Maximum % of buying power per position"
          value={parseFloat(form.max_position_pct)}
          min={0.02} max={0.25} step={0.01}
          format={v => (v * 100).toFixed(0) + '%'}
          onChange={v => setForm(f => ({ ...f, max_position_pct: String(v) }))}
        />

        <SliderField
          label="Daily Loss Limit"
          hint="Halt trading if portfolio down this % on the day"
          value={parseFloat(form.daily_loss_limit_pct)}
          min={0.01} max={0.10} step={0.005}
          format={v => (v * 100).toFixed(1) + '%'}
          onChange={v => setForm(f => ({ ...f, daily_loss_limit_pct: String(v) }))}
          color="red"
        />

        <NumberField
          label="Max Open Positions"
          hint="Maximum number of simultaneous positions"
          value={parseInt(form.max_open_positions)}
          min={1} max={20}
          onChange={v => setForm(f => ({ ...f, max_open_positions: String(v) }))}
        />

        <NumberField
          label="Analysis Interval (minutes)"
          hint="How often Claude analyzes each symbol"
          value={parseInt(form.analysis_interval_min)}
          min={1} max={60}
          onChange={v => setForm(f => ({ ...f, analysis_interval_min: String(v) }))}
        />
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded font-mono text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-400/20 text-green-400 border border-green-400/40'
              : 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/40 hover:bg-cyan-400/25'
          }`}
        >
          {saving ? 'SAVING...' : saved ? '✓ SAVED' : 'SAVE CHANGES'}
        </button>
        {error && <span className="text-red-400 text-xs font-mono">{error}</span>}
      </div>

      {/* Watchlist management */}
      <section className="panel p-4">
        <h3 className="font-mono text-xs text-gray-500 tracking-widest mb-3">WATCHLIST</h3>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSymbol}
            onChange={e => setNewSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAddSymbol()}
            placeholder="ADD TICKER..."
            className="flex-1 bg-bg-base border border-bg-border rounded px-3 py-1.5 text-sm font-mono text-gray-200 placeholder-gray-700 focus:outline-none focus:border-cyan-400/50"
          />
          <button
            onClick={handleAddSymbol}
            className="px-4 py-1.5 bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 rounded font-mono text-sm hover:bg-cyan-400/20 transition-colors"
          >
            ADD
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {watchlist.map(sym => (
            <div key={sym} className="flex items-center gap-1.5 bg-bg-card border border-bg-border rounded px-2.5 py-1">
              <span className="font-mono text-sm font-bold text-gray-200">{sym}</span>
              <button
                onClick={() => removeFromWatchlist(sym)}
                className="text-gray-600 hover:text-red-400 text-xs transition-colors ml-1"
                title={`Remove ${sym}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Info */}
      <section className="panel p-4 text-xs font-mono text-gray-600 space-y-1">
        <p>• All trading uses Alpaca paper trading — no real money at risk</p>
        <p>• Risk management rules are enforced server-side and cannot be bypassed</p>
        <p>• Auto-trading only executes during market hours (9:30am–4:00pm ET)</p>
        <p>• AI analysis powered by Claude claude-sonnet-4-20250514</p>
      </section>
    </div>
  );
}

function SliderField({ label, hint, value, min, max, step, format, onChange, color = 'cyan' }) {
  const pct = ((value - min) / (max - min)) * 100;
  const colors = {
    cyan: 'accent-cyan-400',
    red: 'accent-red-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-sm text-gray-300 font-sans">{label}</span>
          <span className="text-xs text-gray-600 ml-2 font-sans">{hint}</span>
        </div>
        <span className={`num font-mono text-sm font-bold ${color === 'red' ? 'text-red-400' : 'text-cyan-400'}`}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 rounded-full appearance-none bg-bg-border ${colors[color]} cursor-pointer`}
      />
      <div className="flex justify-between text-[10px] text-gray-700 font-mono mt-0.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function NumberField({ label, hint, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-gray-300 font-sans">{label}</span>
        <span className="text-xs text-gray-600 ml-2 font-sans">{hint}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-6 h-6 flex items-center justify-center bg-bg-card border border-bg-border rounded text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
        >−</button>
        <span className="num font-mono text-sm text-gray-200 w-8 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-6 h-6 flex items-center justify-center bg-bg-card border border-bg-border rounded text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
        >+</button>
      </div>
    </div>
  );
}
