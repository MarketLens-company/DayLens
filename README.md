# DayLens — AI Day-Trading Terminal

A real-time autonomous stock day-trading dashboard powered by Claude AI and Alpaca Markets.

## Quick Start

### 1. Configure API Keys

```bash
cp .env.example .env
```

Edit `.env`:
```
ALPACA_API_KEY=your_key_here
ALPACA_SECRET_KEY=your_secret_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

Get free Alpaca paper-trading keys at: https://alpaca.markets
Get Anthropic API key at: https://console.anthropic.com

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Run in development mode

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

---

## Architecture

```
/
├── server/                     # Node.js + Express backend
│   ├── index.js                # Entry point, startup sequence
│   ├── wsServer.js             # WebSocket broadcast server
│   ├── services/
│   │   ├── alpaca.js           # Alpaca REST + WebSocket client
│   │   ├── database.js         # SQLite via better-sqlite3
│   │   ├── indicators.js       # RSI, MACD, Bollinger, EMA engine
│   │   ├── marketData.js       # Bar cache + live quote cache
│   │   ├── aiAnalysis.js       # Claude API integration
│   │   └── autoTrader.js       # Analysis scheduler + order execution
│   └── routes/                 # REST API endpoints
│
├── client/                     # React + Vite frontend
│   └── src/
│       ├── App.jsx             # Root with nav
│       ├── context/
│       │   └── TradingContext.jsx  # Global state + WS connection
│       ├── hooks/
│       │   ├── useWebSocket.js
│       │   └── useApi.js
│       ├── components/
│       │   ├── TopBar.jsx      # Equity, P&L, market status, auto-trade toggle
│       │   ├── Watchlist.jsx   # Symbol list with live prices + AI signals
│       │   ├── ChartPanel.jsx  # Recharts line chart + BB/EMA overlays
│       │   ├── PositionsPanel.jsx
│       │   ├── AIDecisionFeed.jsx
│       │   └── IndicatorsBar.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── TradeHistory.jsx
│           └── Settings.jsx
└── .env.example
```

## Features

| Feature | Details |
|---------|---------|
| Live quotes | Alpaca WebSocket stream → frontend via WS |
| Technical indicators | RSI-14, MACD 12/26/9, Bollinger 20/2, EMA9/21, Volume ratio |
| AI analysis | Claude claude-sonnet-4-20250514 analyzes each symbol every N minutes |
| Auto-trading | Bracket orders (market + stop-loss + take-profit) via Alpaca |
| Risk management | Max position %, max positions, daily loss limit, market hours check |
| Trade history | SQLite log with full AI reasoning, P&L, win rate |
| Settings | Live config editing, watchlist management, confidence threshold slider |

## Risk Management (always enforced)

- **Max position size**: % of buying power per trade (default 10%)
- **Max open positions**: total concurrent positions (default 5)
- **Daily loss limit**: halts trading if portfolio drops X% (default 3%)
- **Market hours**: only trades 9:30am–4:00pm ET, Mon–Fri

## API Endpoints

```
GET  /api/account             Alpaca account info
GET  /api/positions           Open positions
GET  /api/watchlist           Current watchlist
POST /api/watchlist           Add/remove symbol
GET  /api/quotes/:symbol      Live quote + indicators + latest signal
GET  /api/bars/:symbol        Historical bars with indicator series
GET  /api/trades              Trade history (SQLite)
GET  /api/decisions           AI decision log
GET  /api/config              Trading config
POST /api/config              Update config
POST /api/orders              Place manual order
DELETE /api/orders/:id        Cancel order
POST /api/trading/start       Enable auto-trading
POST /api/trading/stop        Disable auto-trading
POST /api/trading/analyze/:s  Trigger immediate AI analysis
```

## Notes

- This uses **paper trading only** — no real money
- The AI uses `claude-sonnet-4-20250514` for structured JSON decisions
- All AI decisions are logged to SQLite with full reasoning
- The frontend auto-reconnects to WebSocket if disconnected
