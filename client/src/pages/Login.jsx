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

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4">
      {/* Logo / Title */}
      <div className="mb-8 text-center">
        <div className="font-mono text-3xl font-bold tracking-widest text-amber-400 mb-1">
          DAYLENS
        </div>
        <div className="font-mono text-xs text-gray-500 tracking-widest">
          AI-POWERED TRADING TERMINAL
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-bg-card border border-bg-border rounded-sm">
        {/* Tabs */}
        <div className="flex border-b border-bg-border">
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className={`flex-1 py-3 text-xs font-mono tracking-widest transition-colors ${
              tab === 'signin'
                ? 'text-amber-400 border-b-2 border-amber-400 -mb-px'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            SIGN IN
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-3 text-xs font-mono tracking-widest transition-colors ${
              tab === 'register'
                ? 'text-amber-400 border-b-2 border-amber-400 -mb-px'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        <div className="p-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-800 rounded-sm">
              <span className="font-mono text-xs text-red-400">{error}</span>
            </div>
          )}

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-xs text-gray-500 mb-1 tracking-wider">
                  USERNAME
                </label>
                <input
                  type="text"
                  value={siUsername}
                  onChange={e => setSiUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full bg-bg-base border border-bg-border rounded-sm px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="your_username"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-500 mb-1 tracking-wider">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={siPassword}
                  onChange={e => setSiPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full bg-bg-base border border-bg-border rounded-sm px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2 px-4 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-widest rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-xs text-gray-500 mb-1 tracking-wider">
                  USERNAME
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full bg-bg-base border border-bg-border rounded-sm px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="3-20 chars, letters/numbers/_"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-500 mb-1 tracking-wider">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full bg-bg-base border border-bg-border rounded-sm px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-500 mb-1 tracking-wider">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full bg-bg-base border border-bg-border rounded-sm px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-500 mb-1 tracking-wider">
                  CONFIRM PASSWORD
                </label>
                <input
                  type="password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full bg-bg-base border border-bg-border rounded-sm px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-2 px-4 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold tracking-widest rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 font-mono text-xs text-gray-700 text-center">
        Paper trading only &bull; Not financial advice
      </div>
    </div>
  );
}
