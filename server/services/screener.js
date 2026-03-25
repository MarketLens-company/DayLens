/**
 * Market Screener Service
 * Scans a universe of ~200 liquid US stocks, scores them for trade potential,
 * and uses Claude AI to pick the best candidates for daytrading.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { getRawConfig, addToWatchlist } = require('./database');

const DATA_URL = process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets';
const KEY = process.env.ALPACA_API_KEY;
const SECRET = process.env.ALPACA_SECRET_KEY;

const ALPACA_HEADERS = {
  'APCA-API-KEY-ID': KEY,
  'APCA-API-SECRET-KEY': SECRET,
  'Content-Type': 'application/json',
};

// ---- Universe of ~200 liquid US stocks ----
const UNIVERSE = [
  // Technology
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'AMD', 'INTC', 'AVGO',
  'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC', 'MRVL', 'ORCL', 'CRM', 'ADBE',
  'NOW', 'SNOW', 'PLTR', 'UBER', 'LYFT', 'SHOP', 'RBLX', 'COIN', 'HOOD', 'SOFI',
  'SMCI', 'ARM', 'ASML', 'NXPI', 'MCHP', 'ADI', 'XLNX', 'MPWR', 'ENPH', 'FSLR',

  // Healthcare
  'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'BMY', 'AMGN', 'GILD', 'BIIB',
  'REGN', 'VRTX', 'MRNA', 'BNTX', 'DXCM', 'ISRG', 'SYK', 'MDT', 'BSX', 'ZBH',
  'CVS', 'CI', 'HUM', 'MCK', 'ABT', 'DHR', 'TMO', 'IQV', 'A', 'IDXX',

  // Financials
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'AXP', 'V', 'MA',
  'PYPL', 'SQ', 'AFRM', 'UPST', 'LC', 'NU', 'ALLY', 'COF', 'DFS', 'SYF',
  'ICE', 'CME', 'CBOE', 'SPGI', 'MCO', 'MSCI', 'FDS', 'BR', 'TRV', 'PRU',

  // Consumer Discretionary
  'NKE', 'MCD', 'SBUX', 'HD', 'LOW', 'TGT', 'WMT', 'COST', 'DG', 'DLTR',
  'BKNG', 'ABNB', 'EXPE', 'MAR', 'HLT', 'RCL', 'CCL', 'NCLH', 'LVS', 'MGM',
  'F', 'GM', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'BMBL', 'SNAP', 'PINS',

  // Consumer Staples
  'PG', 'KO', 'PEP', 'PM', 'MO', 'CL', 'KMB', 'CHD', 'CLX', 'SJM',
  'HRL', 'CAG', 'CPB', 'K', 'GIS', 'MKC', 'HSY', 'MDLZ', 'KHC', 'STZ',

  // Energy
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'BKR', 'MPC', 'PSX', 'VLO',
  'OXY', 'DVN', 'FANG', 'PXD', 'APA', 'MRO', 'HES', 'CTRA', 'AR', 'RRC',

  // Industrials
  'CAT', 'DE', 'BA', 'RTX', 'LMT', 'NOC', 'GD', 'HII', 'TDG', 'SPR',
  'GE', 'HON', 'MMM', 'ITW', 'EMR', 'ROK', 'PH', 'ETN', 'AME', 'IR',
  'UPS', 'FDX', 'XPO', 'CHRW', 'JBHT', 'ODFL', 'SAIA', 'R', 'AL', 'TDY',

  // Communication Services
  'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR', 'WBD', 'PARA', 'FOX',
  'TTD', 'MGNI', 'PUBM', 'IAS', 'DV', 'ZG', 'IAC', 'ANGI', 'MTCH', 'BMBL',

  // Materials & Real Estate
  'LIN', 'APD', 'ECL', 'SHW', 'PPG', 'DD', 'DOW', 'NEM', 'FCX', 'VALE',
  'AMT', 'PLD', 'EQIX', 'CCI', 'SPG', 'O', 'AVB', 'EQR', 'VTR', 'WELL',
];

// Deduplicate universe
const UNIVERSE_DEDUPED = [...new Set(UNIVERSE)];

// Sector mapping for universe display
const SECTOR_MAP = {
  // Technology
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', GOOGL: 'Technology',
  META: 'Technology', AMZN: 'Technology', TSLA: 'Technology', AMD: 'Technology',
  INTC: 'Technology', AVGO: 'Technology', QCOM: 'Technology', TXN: 'Technology',
  MU: 'Technology', AMAT: 'Technology', LRCX: 'Technology', KLAC: 'Technology',
  MRVL: 'Technology', ORCL: 'Technology', CRM: 'Technology', ADBE: 'Technology',
  NOW: 'Technology', SNOW: 'Technology', PLTR: 'Technology', UBER: 'Technology',
  LYFT: 'Technology', SHOP: 'Technology', RBLX: 'Technology', COIN: 'Technology',
  HOOD: 'Technology', SOFI: 'Technology', SMCI: 'Technology', ARM: 'Technology',
  ASML: 'Technology', NXPI: 'Technology', MCHP: 'Technology', ADI: 'Technology',
  XLNX: 'Technology', MPWR: 'Technology', ENPH: 'Technology', FSLR: 'Technology',
  // Healthcare
  JNJ: 'Healthcare', UNH: 'Healthcare', PFE: 'Healthcare', ABBV: 'Healthcare',
  MRK: 'Healthcare', LLY: 'Healthcare', BMY: 'Healthcare', AMGN: 'Healthcare',
  GILD: 'Healthcare', BIIB: 'Healthcare', REGN: 'Healthcare', VRTX: 'Healthcare',
  MRNA: 'Healthcare', BNTX: 'Healthcare', DXCM: 'Healthcare', ISRG: 'Healthcare',
  SYK: 'Healthcare', MDT: 'Healthcare', BSX: 'Healthcare', ZBH: 'Healthcare',
  CVS: 'Healthcare', CI: 'Healthcare', HUM: 'Healthcare', MCK: 'Healthcare',
  ABT: 'Healthcare', DHR: 'Healthcare', TMO: 'Healthcare', IQV: 'Healthcare',
  A: 'Healthcare', IDXX: 'Healthcare',
  // Financials
  JPM: 'Financials', BAC: 'Financials', WFC: 'Financials', GS: 'Financials',
  MS: 'Financials', C: 'Financials', BLK: 'Financials', AXP: 'Financials',
  V: 'Financials', MA: 'Financials', PYPL: 'Financials', SQ: 'Financials',
  AFRM: 'Financials', UPST: 'Financials', LC: 'Financials', NU: 'Financials',
  ALLY: 'Financials', COF: 'Financials', DFS: 'Financials', SYF: 'Financials',
  ICE: 'Financials', CME: 'Financials', CBOE: 'Financials', SPGI: 'Financials',
  MCO: 'Financials', MSCI: 'Financials', FDS: 'Financials', BR: 'Financials',
  TRV: 'Financials', PRU: 'Financials',
  // Consumer Discretionary
  NKE: 'Consumer Discretionary', MCD: 'Consumer Discretionary', SBUX: 'Consumer Discretionary',
  HD: 'Consumer Discretionary', LOW: 'Consumer Discretionary', TGT: 'Consumer Discretionary',
  WMT: 'Consumer Discretionary', COST: 'Consumer Discretionary', DG: 'Consumer Discretionary',
  DLTR: 'Consumer Discretionary', BKNG: 'Consumer Discretionary', ABNB: 'Consumer Discretionary',
  EXPE: 'Consumer Discretionary', MAR: 'Consumer Discretionary', HLT: 'Consumer Discretionary',
  RCL: 'Consumer Discretionary', CCL: 'Consumer Discretionary', NCLH: 'Consumer Discretionary',
  LVS: 'Consumer Discretionary', MGM: 'Consumer Discretionary', F: 'Consumer Discretionary',
  GM: 'Consumer Discretionary', RIVN: 'Consumer Discretionary', LCID: 'Consumer Discretionary',
  NIO: 'Consumer Discretionary', LI: 'Consumer Discretionary', XPEV: 'Consumer Discretionary',
  BMBL: 'Consumer Discretionary', SNAP: 'Consumer Discretionary', PINS: 'Consumer Discretionary',
  // Consumer Staples
  PG: 'Consumer Staples', KO: 'Consumer Staples', PEP: 'Consumer Staples',
  PM: 'Consumer Staples', MO: 'Consumer Staples', CL: 'Consumer Staples',
  KMB: 'Consumer Staples', CHD: 'Consumer Staples', CLX: 'Consumer Staples',
  SJM: 'Consumer Staples', HRL: 'Consumer Staples', CAG: 'Consumer Staples',
  CPB: 'Consumer Staples', K: 'Consumer Staples', GIS: 'Consumer Staples',
  MKC: 'Consumer Staples', HSY: 'Consumer Staples', MDLZ: 'Consumer Staples',
  KHC: 'Consumer Staples', STZ: 'Consumer Staples',
  // Energy
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy', EOG: 'Energy', SLB: 'Energy',
  HAL: 'Energy', BKR: 'Energy', MPC: 'Energy', PSX: 'Energy', VLO: 'Energy',
  OXY: 'Energy', DVN: 'Energy', FANG: 'Energy', PXD: 'Energy', APA: 'Energy',
  MRO: 'Energy', HES: 'Energy', CTRA: 'Energy', AR: 'Energy', RRC: 'Energy',
  // Industrials
  CAT: 'Industrials', DE: 'Industrials', BA: 'Industrials', RTX: 'Industrials',
  LMT: 'Industrials', NOC: 'Industrials', GD: 'Industrials', HII: 'Industrials',
  TDG: 'Industrials', SPR: 'Industrials', GE: 'Industrials', HON: 'Industrials',
  MMM: 'Industrials', ITW: 'Industrials', EMR: 'Industrials', ROK: 'Industrials',
  PH: 'Industrials', ETN: 'Industrials', AME: 'Industrials', IR: 'Industrials',
  UPS: 'Industrials', FDX: 'Industrials', XPO: 'Industrials', CHRW: 'Industrials',
  JBHT: 'Industrials', ODFL: 'Industrials', SAIA: 'Industrials', R: 'Industrials',
  AL: 'Industrials', TDY: 'Industrials',
  // Communication Services
  NFLX: 'Communication Services', DIS: 'Communication Services', CMCSA: 'Communication Services',
  T: 'Communication Services', VZ: 'Communication Services', TMUS: 'Communication Services',
  CHTR: 'Communication Services', WBD: 'Communication Services', PARA: 'Communication Services',
  FOX: 'Communication Services', TTD: 'Communication Services', MGNI: 'Communication Services',
  PUBM: 'Communication Services', IAS: 'Communication Services', DV: 'Communication Services',
  ZG: 'Communication Services', IAC: 'Communication Services', ANGI: 'Communication Services',
  MTCH: 'Communication Services',
  // Materials
  LIN: 'Materials', APD: 'Materials', ECL: 'Materials', SHW: 'Materials',
  PPG: 'Materials', DD: 'Materials', DOW: 'Materials', NEM: 'Materials',
  FCX: 'Materials', VALE: 'Materials',
  // Real Estate
  AMT: 'Real Estate', PLD: 'Real Estate', EQIX: 'Real Estate', CCI: 'Real Estate',
  SPG: 'Real Estate', O: 'Real Estate', AVB: 'Real Estate', EQR: 'Real Estate',
  VTR: 'Real Estate', WELL: 'Real Estate',
};

// ---- In-memory state ----
let lastScanResult = null;
let scanTimer = null;
let broadcastFn = null;

function setBroadcast(fn) {
  broadcastFn = fn;
}

function getLastScan() {
  return lastScanResult;
}

// ---- Fetch snapshots from Alpaca (batched) ----
async function fetchSnapshots(symbols) {
  const results = {};
  const batchSize = 100;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const symbolsParam = batch.join(',');
    const url = `${DATA_URL}/v2/stocks/snapshots?symbols=${encodeURIComponent(symbolsParam)}&feed=iex`;

    try {
      const res = await fetch(url, { headers: ALPACA_HEADERS });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`[Screener] Snapshots fetch error (batch ${i}-${i + batchSize}): ${res.status} ${text}`);
        continue;
      }
      const data = await res.json();
      // data is an object keyed by symbol
      for (const [sym, snap] of Object.entries(data)) {
        results[sym] = snap;
      }
    } catch (err) {
      console.warn(`[Screener] fetchSnapshots batch error:`, err.message);
    }
  }

  return results;
}

// ---- Estimate how far through the trading day we are (0-1) ----
function tradingDayElapsed() {
  const now = new Date();
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const h = et.getHours();
  const m = et.getMinutes();
  const totalMin = h * 60 + m;
  const openMin = 9 * 60 + 30;   // 9:30 AM
  const closeMin = 16 * 60;       // 4:00 PM
  const tradingMins = closeMin - openMin; // 390 min

  if (totalMin < openMin) return 0;
  if (totalMin >= closeMin) return 1;
  return (totalMin - openMin) / tradingMins;
}

// ---- Score a single stock 0-100 ----
function scoreStock(symbol, snapshot) {
  try {
    const dailyBar = snapshot.dailyBar;
    const prevDailyBar = snapshot.prevDailyBar;
    const latestTrade = snapshot.latestTrade;

    if (!dailyBar || !prevDailyBar) return 0;

    const currentPrice = latestTrade?.p || dailyBar.c || 0;
    const prevClose = prevDailyBar.c || 0;
    const todayOpen = dailyBar.o || 0;
    const currentVol = dailyBar.v || 0;
    const prevVol = prevDailyBar.v || 1;

    if (prevClose === 0 || currentPrice === 0) return 0;

    let score = 0;

    // 1. Volume surge (30%) — normalize by % of day elapsed to compare fairly
    const elapsed = tradingDayElapsed();
    const elapsedClamped = Math.max(elapsed, 0.05); // avoid division by near-zero
    // Projected full-day volume if current pace continues
    const projectedVol = currentVol / elapsedClamped;
    const volRatio = projectedVol / prevVol;
    // volRatio of 2.0 = 200% of prev day = good signal; cap at 5x for scoring
    const volScore = Math.min(volRatio / 5, 1) * 30;
    score += volScore;

    // 2. Absolute daily momentum (25%) — how much has it moved (abs %)
    const changePct = ((currentPrice - prevClose) / prevClose) * 100;
    const absChange = Math.abs(changePct);
    // Cap at 10% move for max score
    const absScore = Math.min(absChange / 10, 1) * 25;
    score += absScore;

    // 3. Directional momentum (20%) — positive moves score higher
    const dirScore = changePct > 0 ? 20 : (changePct > -1 ? 10 : 0);
    score += dirScore;

    // 4. Price range preference $10-$500 (15%)
    let priceScore = 0;
    if (currentPrice >= 10 && currentPrice <= 500) {
      priceScore = 15;
    } else if (currentPrice >= 5 && currentPrice < 10) {
      priceScore = 8;
    } else if (currentPrice > 500 && currentPrice <= 1000) {
      priceScore = 10;
    }
    score += priceScore;

    // 5. Gap (10%) — today open vs prev close
    const gapPct = Math.abs(((todayOpen - prevClose) / prevClose) * 100);
    // Gap of 2%+ gets max score, cap at 5% for normalization
    const gapScore = Math.min(gapPct / 5, 1) * 10;
    score += gapScore;

    return Math.round(Math.min(score, 100));
  } catch {
    return 0;
  }
}

// ---- Call Claude to pick best candidates ----
async function runAiPicker(candidates) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.warn('[Screener] No Anthropic API key — skipping AI picks');
    return [];
  }

  const client = new Anthropic();

  const candidateList = candidates.map((c, i) =>
    `${i + 1}. ${c.symbol} | Price: $${c.price.toFixed(2)} | Change: ${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% | Vol Ratio: ${c.volRatio.toFixed(2)}x | Score: ${c.score}`
  ).join('\n');

  const prompt = `You are an expert daytrader analyzing US stocks for intraday trading opportunities.

Here are the top 30 pre-screened candidates ranked by a quantitative momentum/volume score (higher = more activity):

${candidateList}

Select the best 5-8 stocks for daytrading TODAY. Consider:
- Strong volume surges (institutional interest)
- Clean momentum in a clear direction
- Stocks in the $10-$500 price range preferred
- Avoid selecting too many from the same sector
- Prefer stocks with clear catalysts (large moves usually have reasons)

Respond ONLY with valid JSON in this exact format:
{
  "picks": [
    { "symbol": "AAPL", "reasoning": "Brief 1-2 sentence explanation", "priority": "high" },
    { "symbol": "TSLA", "reasoning": "Brief 1-2 sentence explanation", "priority": "medium" }
  ]
}

Priority must be "high" or "medium". High priority = strongest setup.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0]?.text || '';
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Screener] Could not parse AI response:', text.slice(0, 200));
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.picks)) return [];

    return parsed.picks.filter(p =>
      p.symbol && typeof p.symbol === 'string' &&
      p.reasoning && typeof p.reasoning === 'string' &&
      (p.priority === 'high' || p.priority === 'medium')
    );
  } catch (err) {
    console.error('[Screener] AI picker error:', err.message);
    return [];
  }
}

// ---- Main scan function ----
async function runScan() {
  const scanStart = Date.now();
  console.log(`[Screener] Starting scan of ${UNIVERSE_DEDUPED.length} symbols...`);

  try {
    // 1. Fetch snapshots for entire universe in batches
    const snapshots = await fetchSnapshots(UNIVERSE_DEDUPED);

    // 2. Filter out symbols that errored or have no data
    const validSymbols = UNIVERSE_DEDUPED.filter(sym => {
      const snap = snapshots[sym];
      return snap && snap.dailyBar && snap.prevDailyBar;
    });

    console.log(`[Screener] Valid snapshots: ${validSymbols.length}/${UNIVERSE_DEDUPED.length}`);

    // 3. Score all valid symbols
    const scored = validSymbols.map(sym => {
      const snap = snapshots[sym];
      const score = scoreStock(sym, snap);

      const dailyBar = snap.dailyBar;
      const prevDailyBar = snap.prevDailyBar;
      const latestTrade = snap.latestTrade;

      const currentPrice = latestTrade?.p || dailyBar.c || 0;
      const prevClose = prevDailyBar.c || 1;
      const changePct = ((currentPrice - prevClose) / prevClose) * 100;

      const currentVol = dailyBar.v || 0;
      const prevVol = prevDailyBar.v || 1;
      const elapsed = Math.max(tradingDayElapsed(), 0.05);
      const projectedVol = currentVol / elapsed;
      const volRatio = projectedVol / prevVol;

      return {
        symbol: sym,
        score,
        price: currentPrice,
        changePct,
        volRatio,
        currentVol,
        prevVol,
        dayHigh: dailyBar.h || 0,
        dayLow: dailyBar.l || 0,
        prevClose,
        open: dailyBar.o || 0,
        sector: SECTOR_MAP[sym] || 'Unknown',
      };
    });

    // 4. Sort by score descending, take top 30
    scored.sort((a, b) => b.score - a.score);
    const top30 = scored.slice(0, 30);

    // 5. Call Claude AI to analyze top 30 candidates
    const aiPicks = await runAiPicker(top30);

    // 6. If screener_auto_add is enabled, add AI picks to watchlist
    const cfg = getRawConfig();
    if (cfg.screener_auto_add === 'true') {
      const maxDynamic = parseInt(cfg.screener_max_dynamic || '10');
      const highPriority = aiPicks.filter(p => p.priority === 'high').slice(0, maxDynamic);
      for (const pick of highPriority) {
        try {
          addToWatchlist(pick.symbol);
          console.log(`[Screener] Auto-added ${pick.symbol} to watchlist`);
        } catch (err) {
          console.warn(`[Screener] Failed to auto-add ${pick.symbol}:`, err.message);
        }
      }
    }

    const scanDuration = Date.now() - scanStart;
    const scannedAt = new Date().toISOString();

    const result = {
      scannedAt,
      totalScanned: validSymbols.length,
      universeSize: UNIVERSE_DEDUPED.length,
      candidates: top30,
      aiPicks,
      scanDuration,
    };

    lastScanResult = result;

    // Broadcast to frontend via WS
    if (broadcastFn) {
      try {
        broadcastFn({ type: 'screener_update', payload: result });
      } catch {}
    }

    console.log(`[Screener] Scan complete: ${top30.length} candidates, ${aiPicks.length} AI picks (${scanDuration}ms)`);
    return result;
  } catch (err) {
    console.error('[Screener] runScan error:', err.message);
    const fallback = {
      scannedAt: new Date().toISOString(),
      totalScanned: 0,
      universeSize: UNIVERSE_DEDUPED.length,
      candidates: [],
      aiPicks: [],
      scanDuration: Date.now() - scanStart,
      error: err.message,
    };
    lastScanResult = fallback;
    return fallback;
  }
}

// ---- Interval control ----
function start(intervalMin = 15) {
  if (scanTimer) {
    clearInterval(scanTimer);
  }

  if (!KEY || KEY === 'your_alpaca_api_key_here') {
    console.warn('[Screener] No Alpaca API key — screener disabled');
    return;
  }

  const ms = intervalMin * 60 * 1000;
  console.log(`[Screener] Starting — scanning every ${intervalMin} minutes`);

  // Run an initial scan after a short delay to let server fully boot
  setTimeout(() => runScan(), 10000);

  scanTimer = setInterval(() => runScan(), ms);
}

function stop() {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
    console.log('[Screener] Stopped');
  }
}

module.exports = {
  runScan,
  start,
  stop,
  getLastScan,
  setBroadcast,
  UNIVERSE: UNIVERSE_DEDUPED,
  SECTOR_MAP,
};
