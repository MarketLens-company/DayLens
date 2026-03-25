/**
 * Auto-Trader Engine
 * - Runs AI analysis on each watchlist symbol at configurable intervals
 * - Executes trades if auto-trade is enabled and confidence >= threshold
 * - Enforces risk management rules
 * - Broadcasts decisions and fills via WebSocket
 */
const alpaca = require('./alpaca');
const marketData = require('./marketData');
const { analyzeStock } = require('./aiAnalysis');
const { getRawConfig, getWatchlist, insertDecision, insertTrade } = require('./database');

let analysisTimers = {};
let broadcastFn = null; // set by server after WS is ready
let running = false;

function setBroadcast(fn) {
  broadcastFn = fn;
}

function broadcast(type, payload) {
  if (broadcastFn) {
    try { broadcastFn({ type, payload }); } catch {}
  }
}

// ---- Risk checks ----
async function checkRiskLimits(cfg, account) {
  const equity = parseFloat(account.equity);
  const lastEquity = parseFloat(account.last_equity);
  const dailyPL = equity - lastEquity;
  const dailyPLPct = Math.abs(dailyPL / lastEquity);
  const lossLimit = parseFloat(cfg.daily_loss_limit_pct || '0.03');

  if (dailyPL < 0 && dailyPLPct >= lossLimit) {
    return { ok: false, reason: `Daily loss limit hit: ${(dailyPLPct * 100).toFixed(2)}%` };
  }
  return { ok: true };
}

async function checkPositionLimits(cfg, positions) {
  const maxPos = parseInt(cfg.max_open_positions || '5');
  if (positions.length >= maxPos) {
    return { ok: false, reason: `Max open positions reached (${maxPos})` };
  }
  return { ok: true };
}

function isMarketHours() {
  const now = new Date();
  // Convert to ET
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const h = et.getHours();
  const m = et.getMinutes();
  const totalMin = h * 60 + m;
  const open = 9 * 60 + 30;  // 9:30
  const close = 16 * 60;      // 16:00
  const dow = et.getDay();
  return dow >= 1 && dow <= 5 && totalMin >= open && totalMin < close;
}

// ---- Single symbol analysis ----
async function analyzeSymbol(symbol) {
  try {
    const bars = marketData.getBars(symbol, '5Min');
    if (bars.length < 26) {
      console.log(`[AutoTrader] Not enough bars for ${symbol}`);
      return;
    }

    const indicators = marketData.getIndicators(symbol);
    if (!indicators) return;

    const [account, positions] = await Promise.all([
      alpaca.getAccount(),
      alpaca.getPositions(),
    ]);

    const buyingPower = parseFloat(account.buying_power);
    const currentPosition = positions.find(p => p.symbol === symbol) || null;

    // Run AI analysis
    const decision = await analyzeStock({
      symbol,
      bars,
      indicators,
      position: currentPosition,
      buyingPower,
    });

    const cfg = getRawConfig();
    const autoTradeEnabled = cfg.auto_trade_enabled === 'true';
    const confidenceThreshold = parseFloat(cfg.confidence_threshold || '0.75');

    let executed = 0;
    let skipReason = null;

    if (decision.action !== 'HOLD' && decision.quantity > 0) {
      if (!autoTradeEnabled) {
        skipReason = 'Auto-trading disabled';
      } else if (decision.confidence < confidenceThreshold) {
        skipReason = `Confidence ${decision.confidence.toFixed(2)} below threshold ${confidenceThreshold}`;
      } else if (!isMarketHours()) {
        skipReason = 'Outside market hours';
      } else {
        // Check risk limits
        const riskCheck = await checkRiskLimits(cfg, account);
        if (!riskCheck.ok) {
          skipReason = riskCheck.reason;
        } else if (decision.action === 'BUY') {
          const posCheck = await checkPositionLimits(cfg, positions);
          if (!posCheck.ok) {
            skipReason = posCheck.reason;
          } else {
            // Execute BUY with bracket order
            try {
              const orderPayload = {
                symbol,
                qty: decision.quantity,
                side: 'buy',
                type: 'market',
                time_in_force: 'day',
              };

              if (decision.stop_loss && decision.take_profit) {
                orderPayload.order_class = 'bracket';
                orderPayload.stop_loss = { stop_price: decision.stop_loss };
                orderPayload.take_profit = { limit_price: decision.take_profit };
              }

              const order = await alpaca.placeOrder(orderPayload);
              executed = 1;

              insertTrade({
                symbol,
                side: 'buy',
                qty: decision.quantity,
                entry_price: indicators.price,
                ai_confidence: decision.confidence,
                ai_reasoning: decision.reasoning,
                alpaca_order_id: order.id,
                status: 'open',
              });

              broadcast('order_fill', {
                symbol,
                side: 'buy',
                qty: decision.quantity,
                price: indicators.price,
                orderId: order.id,
              });

              console.log(`[AutoTrader] BUY ${decision.quantity} ${symbol} @ ${indicators.price}`);
            } catch (err) {
              skipReason = `Order failed: ${err.message}`;
              console.error(`[AutoTrader] BUY failed for ${symbol}:`, err.message);
            }
          }
        } else if (decision.action === 'SELL' && currentPosition) {
          try {
            const order = await alpaca.placeOrder({
              symbol,
              qty: Math.min(decision.quantity, parseFloat(currentPosition.qty)),
              side: 'sell',
              type: 'market',
              time_in_force: 'day',
            });
            executed = 1;

            const entryPrice = parseFloat(currentPosition.avg_entry_price);
            const pnl = (indicators.price - entryPrice) * decision.quantity;

            insertTrade({
              symbol,
              side: 'sell',
              qty: decision.quantity,
              entry_price: entryPrice,
              exit_price: indicators.price,
              pnl,
              ai_confidence: decision.confidence,
              ai_reasoning: decision.reasoning,
              alpaca_order_id: order.id,
              status: 'closed',
            });

            broadcast('order_fill', {
              symbol,
              side: 'sell',
              qty: decision.quantity,
              price: indicators.price,
              pnl,
              orderId: order.id,
            });

            console.log(`[AutoTrader] SELL ${decision.quantity} ${symbol} @ ${indicators.price}`);
          } catch (err) {
            skipReason = `Order failed: ${err.message}`;
            console.error(`[AutoTrader] SELL failed for ${symbol}:`, err.message);
          }
        }
      }
    }

    // Save decision to DB
    const decisionRecord = {
      symbol,
      action: decision.action,
      quantity: decision.quantity,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      stop_loss: decision.stop_loss,
      take_profit: decision.take_profit,
      executed,
      skip_reason: skipReason,
    };
    insertDecision(decisionRecord);

    // Broadcast to frontend
    broadcast('ai_decision', {
      ...decisionRecord,
      price: indicators.price,
      timestamp: new Date().toISOString(),
    });

    console.log(`[AutoTrader] ${symbol}: ${decision.action} (conf=${decision.confidence.toFixed(2)}) — ${skipReason || (executed ? 'EXECUTED' : 'logged')}`);
  } catch (err) {
    console.error(`[AutoTrader] analyzeSymbol ${symbol}:`, err.message);
  }
}

// ---- Scheduler ----
function scheduleSymbol(symbol, intervalMin) {
  if (analysisTimers[symbol]) {
    clearInterval(analysisTimers[symbol]);
  }
  const ms = intervalMin * 60 * 1000;
  // Run immediately, then on interval
  analyzeSymbol(symbol);
  analysisTimers[symbol] = setInterval(() => analyzeSymbol(symbol), ms);
}

function unscheduleSymbol(symbol) {
  if (analysisTimers[symbol]) {
    clearInterval(analysisTimers[symbol]);
    delete analysisTimers[symbol];
  }
}

function start() {
  if (running) return;
  running = true;

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.warn('[AutoTrader] No Anthropic API key — AI analysis disabled');
    return;
  }

  const cfg = getRawConfig();
  const intervalMin = parseFloat(cfg.analysis_interval_min || '5');
  const symbols = getWatchlist();

  console.log(`[AutoTrader] Starting analysis for: ${symbols.join(', ')} every ${intervalMin}min`);
  for (const sym of symbols) {
    scheduleSymbol(sym, intervalMin);
  }
}

function stop() {
  running = false;
  for (const sym of Object.keys(analysisTimers)) {
    unscheduleSymbol(sym);
  }
  console.log('[AutoTrader] Stopped all analysis timers');
}

function addSymbol(symbol) {
  if (!running) return;
  const cfg = getRawConfig();
  const intervalMin = parseFloat(cfg.analysis_interval_min || '5');
  scheduleSymbol(symbol, intervalMin);
}

function removeSymbol(symbol) {
  unscheduleSymbol(symbol);
}

function isRunning() {
  return running;
}

module.exports = {
  start,
  stop,
  addSymbol,
  removeSymbol,
  setBroadcast,
  analyzeSymbol,
  isRunning,
};
