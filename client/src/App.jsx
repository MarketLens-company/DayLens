import React, { useState } from 'react';
import { TradingProvider } from './context/TradingContext';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import TradeHistory from './pages/TradeHistory';
import Screener from './pages/Screener';
import Settings from './pages/Settings';

const NAV = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'history', label: 'TRADE HISTORY' },
  { id: 'screener', label: 'SCREENER' },
  { id: 'settings', label: 'SETTINGS' },
];

function NavBar({ active, onChange }) {
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
    </nav>
  );
}

function AppContent() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <NavBar active={page} onChange={setPage} />
      <main className="flex-1 min-h-0 overflow-hidden">
        {page === 'dashboard' && <Dashboard />}
        {page === 'history' && <TradeHistory />}
        {page === 'screener' && <Screener />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}
