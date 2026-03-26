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
    <nav className="flex items-center gap-1 px-4 h-9 bg-bg-base border-b border-bg-border flex-shrink-0">
      {NAV.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
            active === item.id
              ? 'bg-bg-card text-cyan-400 border border-bg-border'
              : 'text-gray-600 hover:text-gray-400'
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
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-gray-400 hover:text-gray-200 border border-bg-border rounded-sm transition-colors"
      >
        <span className="text-amber-400 text-[8px]">&#9679;</span>
        <span className="max-w-28 truncate">{username}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-bg-card border border-bg-border rounded-sm z-20 overflow-hidden">
            <button
              onClick={() => { setOpen(false); onProfile(); }}
              className="w-full px-3 py-2 text-left font-mono text-xs text-gray-300 hover:bg-bg-base hover:text-amber-400 transition-colors"
            >
              PROFILE
            </button>
            <div className="border-t border-bg-border" />
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full px-3 py-2 text-left font-mono text-xs text-gray-500 hover:bg-bg-base hover:text-red-400 transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NoApiKeysBanner({ onProfile }) {
  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-3 px-4 py-2 bg-amber-900/20 border-b border-amber-800/40">
      <span className="font-mono text-xs text-amber-400">
        Configure your API keys to enable market data and trading.
      </span>
      <button
        onClick={onProfile}
        className="font-mono text-xs text-amber-500 underline underline-offset-2 hover:text-amber-300 transition-colors"
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
        <TopBar />
        {!hasApiKeys && <NoApiKeysBanner onProfile={() => setShowProfile(true)} />}
        <NavBar active={page} onChange={setPage} rightSlot={userMenu} />
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
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <span className="font-mono text-xs text-gray-500 animate-pulse">LOADING...</span>
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
