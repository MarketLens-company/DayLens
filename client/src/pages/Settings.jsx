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
    <div className="flex items-center justify-center h-full font-mono text-text-muted text-sm">
      —
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
    <div className="bg-void flex flex-col h-full min-h-0 overflow-y-auto px-6 py-6 max-w-2xl">
      <h2 className="font-sans text-[10px] text-text-muted tracking-widest uppercase mt-2 mb-4 pb-2 border-b border-border">CONFIGURATION</h2>

      {/* Auto-trade master toggle */}
      <section className="bg-surface border border-border rounded p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans text-sm text-text-primary font-medium mb-0.5">Autonomous Trading</h3>
            <p className="font-sans text-xs text-text-muted">When enabled, the AI will automatically execute orders above the confidence threshold.</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, auto_trade_enabled: autoTradeEnabled ? 'false' : 'true' }))}
            className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${
              autoTradeEnabled ? 'bg-signal' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                autoTradeEnabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {autoTradeEnabled && (
          <p className="font-mono text-xs text-signal mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-signal rounded-full pulse-live" /> LIVE TRADING ACTIVE — REAL ORDERS WILL BE PLACED
          </p>
        )}
      </section>

      {/* Trading params */}
      <section className="bg-surface border border-border rounded p-4 mb-4 space-y-4">
        <h3 className="font-sans text-[10px] text-text-muted tracking-widest uppercase pb-2 border-b border-border">RISK PARAMETERS</h3>

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
          color="loss"
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
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`bg-signal text-void font-mono text-xs font-bold px-4 py-2 rounded transition-colors disabled:opacity-50 ${
            saved ? 'bg-signal/70' : 'hover:bg-[#00BFA0]'
          }`}
        >
          {saving ? 'SAVING...' : saved ? '✓ SAVED' : 'SAVE CHANGES'}
        </button>
        {error && <span className="text-loss text-xs font-mono">{error}</span>}
      </div>

      {/* Watchlist management */}
      <section className="bg-surface border border-border rounded p-4 mb-4">
        <h3 className="font-sans text-[10px] text-text-muted tracking-widest uppercase pb-2 mb-4 border-b border-border">WATCHLIST</h3>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSymbol}
            onChange={e => setNewSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAddSymbol()}
            placeholder="ADD TICKER..."
            className="flex-1 bg-void border border-border rounded px-3 py-1.5 font-mono text-sm text-text-primary placeholder-text-muted focus:shadow-[0_0_0_2px_#00D4AA] outline-none transition-shadow"
          />
          <button
            onClick={handleAddSymbol}
            className="bg-signal text-void font-mono text-xs font-bold px-4 py-2 rounded hover:bg-[#00BFA0] transition-colors"
          >
            ADD
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {watchlist.map(sym => (
            <div key={sym} className="flex items-center gap-1.5 bg-void border border-border rounded px-2.5 py-1">
              <span className="font-mono text-sm font-bold text-text-primary">{sym}</span>
              <button
                onClick={() => removeFromWatchlist(sym)}
                className="font-mono text-text-muted hover:text-loss text-xs transition-colors ml-1"
                title={`Remove ${sym}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Info */}
      <section className="bg-surface border border-border rounded p-4 font-sans text-xs text-text-muted space-y-1">
        <p>• All trading uses Alpaca paper trading — no real money at risk</p>
        <p>• Risk management rules are enforced server-side and cannot be bypassed</p>
        <p>• Auto-trading only executes during market hours (9:30am–4:00pm ET)</p>
        <p>• AI analysis powered by Claude claude-sonnet-4-20250514</p>
      </section>
    </div>
  );
}

function SliderField({ label, hint, value, min, max, step, format, onChange, color = 'signal' }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-baseline gap-2 w-48 shrink-0">
          <span className="font-sans text-sm text-text-muted">{label}</span>
        </div>
        <span className="font-sans text-xs text-text-muted ml-2">{hint}</span>
        <span className={`font-mono text-sm font-bold ml-auto ${color === 'loss' ? 'text-loss' : 'text-signal'}`}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer"
        style={{ accentColor: color === 'loss' ? '#EF4444' : '#00D4AA' }}
      />
      <div className="flex justify-between font-mono text-[10px] text-text-muted mt-0.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function NumberField({ label, hint, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-sm text-text-muted w-48 shrink-0">{label}</span>
        <span className="font-sans text-xs text-text-muted">{hint}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-6 h-6 flex items-center justify-center bg-void border border-border rounded font-mono text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
        >−</button>
        <span className="font-mono text-sm text-text-primary w-8 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-6 h-6 flex items-center justify-center bg-void border border-border rounded font-mono text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
        >+</button>
      </div>
    </div>
  );
}
