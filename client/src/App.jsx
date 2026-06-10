import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import TradeHistory from './pages/TradeHistory';
import Screener from './pages/Screener';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Profile from './pages/Profile';

const NAV = [
  { id: 'dashboard',  label: 'DASHBOARD' },
  { id: 'history',    label: 'TRADE HISTORY' },
  { id: 'screener',   label: 'SCREENER' },
  { id: 'settings',   label: 'SETTINGS' },
];

function NavBar({ active, onChange, rightSlot }) {
  return (
    <nav className="flex items-center px-4 h-11 bg-void border-b border-border flex-shrink-0 gap-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-8 shrink-0">
        <span className="text-signal font-mono text-sm leading-none">◆</span>
        <span className="font-mono font-bold text-sm text-text-primary tracking-wide">DayLens</span>
      </div>

      {/* Nav tabs */}
      <div className="flex items-stretch h-full">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`relative px-4 h-full font-sans text-[11px] uppercase tracking-[0.1em] transition-colors ${
              active === item.id
                ? 'text-signal'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {item.label}
            {active === item.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
            )}
          </button>
        ))}
      </div>

      {/* Right slot */}
      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </nav>
  );
}

function UserMenu({ onProfile, onLogout, username }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-4">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-signal signal-ring pulse-live"
        />
        <span className="font-mono text-[10px] text-text-muted tracking-widest">LIVE</span>
      </div>

      {/* Divider */}
      <span className="text-border font-mono text-xs">│</span>

      {/* Username */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-mono text-xs text-text-primary hover:text-signal transition-colors"
      >
        <span className="w-4 h-4 rounded-sm bg-signal/15 border border-signal/20 flex items-center justify-center text-signal text-[9px] font-bold">
          {username?.[0]?.toUpperCase() || '?'}
        </span>
        {username}
      </button>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="font-sans text-[11px] text-text-muted hover:text-loss transition-colors tracking-wide"
      >
        LOGOUT
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-sm z-20 overflow-hidden">
            <button
              onClick={() => { setOpen(false); onProfile(); }}
              className="w-full px-3 py-2.5 text-left font-sans text-xs text-text-muted hover:text-signal hover:bg-void transition-colors tracking-widest uppercase"
            >
              Profile & Keys
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NoApiKeysBanner({ onProfile }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-warn/8 border-b border-warn/20">
      <span className="w-1 h-1 rounded-full bg-warn shrink-0" />
      <span className="font-sans text-xs text-warn/90">
        Configure your API keys to enable market data and trading.
      </span>
      <button
        onClick={onProfile}
        className="font-mono text-[11px] text-warn/80 underline underline-offset-2 hover:text-warn transition-colors ml-auto shrink-0"
      >
        Open Profile →
      </button>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);

  if (showProfile) {
    return <Profile onClose={() => setShowProfile(false)} />;
  }

  const hasApiKeys = user?.hasApiKeys;

  const userMenu = (
    <UserMenu
      username={user?.username || ''}
      onProfile={() => setShowProfile(true)}
      onLogout={logout}
    />
  );

  return (
    <TradingProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <NavBar active={page} onChange={setPage} rightSlot={userMenu} />
        <TopBar />
        {!hasApiKeys && <NoApiKeysBanner onProfile={() => setShowProfile(true)} />}
        <main className="flex-1 min-h-0 overflow-hidden">
          {page === 'dashboard' && <Dashboard />}
          {page === 'history'   && <TradeHistory />}
          {page === 'screener'  && <Screener />}
          {page === 'settings'  && <Settings />}
        </main>
      </div>
    </TradingProvider>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <span className="font-mono text-xs text-text-muted animate-pulse">◆</span>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedApp /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
