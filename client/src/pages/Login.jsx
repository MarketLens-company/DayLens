import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sign in state
  const [siUsername, setSiUsername] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Register state
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

    if (regPassword !== regConfirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(regUsername.trim(), regEmail.trim(), regPassword);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-void border border-border rounded px-3 py-2 font-mono text-sm text-text-primary placeholder-text-muted focus:shadow-[0_0_0_2px_#00D4AA] outline-none transition-shadow";
  const labelClass = "block font-sans text-xs text-text-muted tracking-widest uppercase mb-1";

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="mb-6 text-center">
          <div className="font-mono font-bold text-3xl tracking-widest mb-1">
            <span className="text-signal">◆</span>
            <span className="text-text-primary"> DayLens</span>
          </div>
          <div className="font-sans text-xs text-text-muted tracking-wide">
            Your AI trading terminal.
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-lg p-8">
          {/* Tab switcher — pill style */}
          <div className="flex gap-1 bg-void rounded-md p-1 mb-6">
            <button
              onClick={() => { setTab('signin'); setError(''); }}
              className={`flex-1 py-2 text-xs font-sans tracking-widest text-center rounded transition-colors ${
                tab === 'signin'
                  ? 'bg-signal text-void font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2 text-xs font-sans tracking-widest text-center rounded transition-colors ${
                tab === 'register'
                  ? 'bg-signal text-void font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              CREATE ACCOUNT
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 bg-loss/10 border border-loss/30 rounded px-3 py-2">
              <span className="font-mono text-xs text-loss">{error}</span>
            </div>
          )}

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>USERNAME</label>
                <input
                  type="text"
                  value={siUsername}
                  onChange={e => setSiUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className={inputClass}
                  placeholder="your_username"
                />
              </div>
              <div>
                <label className={labelClass}>PASSWORD</label>
                <input
                  type="password"
                  value={siPassword}
                  onChange={e => setSiPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-signal text-void font-mono font-bold text-sm tracking-widest py-3 rounded hover:bg-[#00BFA0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>USERNAME</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className={inputClass}
                  placeholder="3-20 chars, letters/numbers/_"
                />
              </div>
              <div>
                <label className={labelClass}>EMAIL</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className={labelClass}>PASSWORD</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={inputClass}
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label className={labelClass}>CONFIRM PASSWORD</label>
                <input
                  type="password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-signal text-void font-mono font-bold text-sm tracking-widest py-3 rounded hover:bg-[#00BFA0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 font-sans text-xs text-text-muted text-center">
          Paper trading only &bull; Not financial advice
        </div>
      </div>
    </div>
  );
}
