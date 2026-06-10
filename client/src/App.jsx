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
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'history', label: 'TRADE HISTORY' },
  { id: 'screener', label: 'SCREENER' },
  { id: 'settings', label: 'SETTINGS' },
];

function NavBar({ active, onChange, rightSlot }) {
  return (
    <nav className="flex items-center gap-1 px-4 h-12 bg-void border-b border-border flex-shrink-0">
      {/* Logo */}
      <span className="font-mono font-bold text-base tracking-wide mr-6 whitespace-nowrap flex items-center gap-1.5">
        <span className="text-signal text-sm">◆</span>
        <span className="text-text-primary">DayLens</span>
      </span>

      {/* Nav tabs */}
      {NAV.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-3 h-12 font-sans text-xs uppercase tracking-widest transition-colors border-b-2 ${
            active === item.id
              ? 'text-signal border-signal'
              : 'text-text-muted hover:text-text-primary border-transparent'
          }`}
        >
          {item.label}
        </button>
      ))}

      {/* Right-aligned user menu slot */}
      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </nav>
  );
}

function UserMenu({ onProfile, onLogout, username }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-3">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <span className="pulse-live text-signal text-xs">●</span>
        <span className="text-text-muted font-sans text-xs tracking-widest">LIVE</span>
      </div>

      {/* Username chip */}
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-surface border border-border rounded px-2 py-1 font-sans text-xs text-text-primary hover:border-text-muted transition-colors"
      >
        {username}
      </button>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="text-text-muted hover:text-loss font-sans text-xs transition-colors"
      >
        LOGOUT
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded z-20 overflow-hidden">
            <button
              onClick={() => { setOpen(false); onProfile(); }}
              className="w-full px-3 py-2 text-left font-sans text-xs text-text-primary hover:bg-void hover:text-signal transition-colors"
            >
              PROFILE
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NoApiKeysBanner({ onProfile }) {
  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-3 px-4 py-2 bg-warn/10 border-b border-warn/30">
      <span className="text-warn font-sans text-xs">⚠</span>
      <span className="font-sans text-xs text-warn">
        Configure your API keys to enable market data and trading.
      </span>
      <button
        onClick={onProfile}
        className="font-sans text-xs text-warn underline underline-offset-2 hover:text-text-primary transition-colors"
      >
        Open Profile
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
          {page === 'history' && <TradeHistory />}
          {page === 'screener' && <Screener />}
          {page === 'settings' && <Settings />}
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
        <span className="font-mono text-xs text-text-muted">—</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
