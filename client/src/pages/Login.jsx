import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-mono tracking-widest text-center rounded transition-all duration-200 ${
        active
          ? 'bg-signal text-void font-bold'
          : 'text-text-muted hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [siUsername, setSiUsername] = useState('');
  const [siPassword, setSiPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  async function handleSignIn(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(siUsername.trim(), siPassword);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (regPassword !== regConfirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register(regUsername.trim(), regEmail.trim(), regPassword);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inp = "w-full bg-void border border-border px-3 py-2.5 font-mono text-sm text-text-primary placeholder-text-muted/40 transition-shadow rounded-sm";
  const lbl = "block font-sans text-[11px] text-text-muted uppercase tracking-[0.12em] mb-1.5";

  const features = [
    ['◈', 'Claude AI scans 200+ stocks every 15 min'],
    ['◈', 'Autonomous trades with configurable risk controls'],
    ['◈', 'Real-time quotes via Alpaca paper trading'],
    ['◈', 'Your keys · Your account · Your data'],
  ];

  return (
    <div className="min-h-screen bg-void flex overflow-hidden">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex flex-[55] flex-col relative overflow-hidden border-r border-border">
        {/* Animated grid */}
        <div className="absolute inset-0 animated-grid" />
        {/* Radial vignette to focus center */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, #080B10 90%)' }}
        />
        {/* Decorative corner signal dots */}
        <div className="absolute top-8 left-8 w-1.5 h-1.5 rounded-full bg-signal/25" />
        <div className="absolute top-8 right-8 w-1 h-1 rounded-full bg-signal/15" />
        <div className="absolute bottom-8 left-8 w-1 h-1 rounded-full bg-signal/15" />
        <div className="absolute bottom-8 right-8 w-1.5 h-1.5 rounded-full bg-signal/25" />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-14 text-center">
          {/* Logo */}
          <div className="mb-10 animate-in">
            <div className="font-mono font-bold text-[52px] leading-none tracking-wider mb-3">
              <span className="text-signal">◆</span>
              <span className="text-text-primary"> DayLens</span>
            </div>
            <p className="font-sans text-[11px] text-text-muted uppercase tracking-[0.25em]">
              AI-Powered Trading Terminal
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3.5 max-w-[300px] animate-in-d2">
            {features.map(([icon, text]) => (
              <div key={text} className="flex items-start gap-3 text-left">
                <span className="text-signal text-sm mt-0.5 shrink-0 font-mono">{icon}</span>
                <span className="font-sans text-sm text-text-muted/80 leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          {/* Bottom tag */}
          <p className="absolute bottom-6 font-mono text-[10px] text-text-muted/30 tracking-widest uppercase">
            Paper trading only · Not financial advice
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 lg:flex-[45] flex-col items-center justify-center px-8 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden text-center animate-in">
          <div className="font-mono font-bold text-3xl tracking-wider mb-1">
            <span className="text-signal">◆</span>
            <span className="text-text-primary"> DayLens</span>
          </div>
          <p className="font-sans text-xs text-text-muted tracking-wider">AI-Powered Trading Terminal</p>
        </div>

        <div className="w-full max-w-[360px]">
          {/* Heading */}
          <div className="mb-6 animate-in">
            <h1 className="font-sans text-2xl font-semibold text-text-primary leading-tight">
              {tab === 'signin' ? 'Welcome back.' : 'Create account.'}
            </h1>
            <p className="font-sans text-sm text-text-muted mt-1">
              {tab === 'signin'
                ? 'Sign in to your terminal.'
                : 'Start paper trading in minutes.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-surface border border-border rounded p-1 mb-6 animate-in-d1">
            <TabBtn active={tab === 'signin'} onClick={() => { setTab('signin'); setError(''); }}>
              SIGN IN
            </TabBtn>
            <TabBtn active={tab === 'register'} onClick={() => { setTab('register'); setError(''); }}>
              CREATE ACCOUNT
            </TabBtn>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-loss/8 border border-loss/25 rounded-sm px-3 py-2 animate-in">
              <span className="font-mono text-xs text-loss">{error}</span>
            </div>
          )}

          {/* Forms */}
          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="flex flex-col gap-4 animate-in-d2">
              <div>
                <label className={lbl}>Username</label>
                <input type="text" value={siUsername} onChange={e => setSiUsername(e.target.value)}
                  autoComplete="username" required className={inp} placeholder="your_username" />
              </div>
              <div>
                <label className={lbl}>Password</label>
                <input type="password" value={siPassword} onChange={e => setSiPassword(e.target.value)}
                  autoComplete="current-password" required className={inp} placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="mt-1 w-full bg-signal text-void font-mono font-bold text-sm tracking-widest py-3 rounded-sm hover:bg-[#00C49A] active:bg-[#00B38A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? 'SIGNING IN...' : 'SIGN IN →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4 animate-in-d2">
              <div>
                <label className={lbl}>Username</label>
                <input type="text" value={regUsername} onChange={e => setRegUsername(e.target.value)}
                  autoComplete="username" required className={inp} placeholder="3–20 chars, letters/numbers/_" />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  autoComplete="email" required className={inp} placeholder="you@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Password</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                    autoComplete="new-password" required className={inp} placeholder="Min 8 chars" />
                </div>
                <div>
                  <label className={lbl}>Confirm</label>
                  <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                    autoComplete="new-password" required className={inp} placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="mt-1 w-full bg-signal text-void font-mono font-bold text-sm tracking-widest py-3 rounded-sm hover:bg-[#00C49A] active:bg-[#00B38A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="mt-8 font-mono text-[10px] text-text-muted/35 text-center tracking-widest uppercase">
            Paper trading only · Not financial advice
          </p>
        </div>
      </div>
    </div>
  );
}
