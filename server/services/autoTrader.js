/**
 * Auto-Trader Engine
 * Supports both singleton (global, backward compat) and factory (per-user) usage.
 *
 * Factory: createAutoTraderService({ db, alpacaService, marketDataService, userId, getAnthropicKey })
 */
const Anthropic = require('@anthropic-ai/sdk');

// ---- Factory function ----
function createAutoTraderService({ db, alpacaService, marketDataService, userId, getAnthropicKey }) {
  let analysisTimers = {};
  let broadcastFn = null;
  let running = false;

  const MODEL = 'claude-haiku-3-5-20241022';

  function setBroadcast(fn) {
    broadcastFn = fn;
  }

  function broadcastMsg(type, payload) {
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
    const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const et = new Date(etStr);
    const h = et.getHours();
    const m = et.getMinutes();
    const totalMin = h * 60 + m;
    const open = 9 * 60 + 30;
    const close = 16 * 60;
    const dow = et.getDay();
    return dow >= 1 && dow <= 5 && totalMin >= open && totalMin < close;
  }

  // ---- AI Analysis ----
  async function analyzeStock({ symbol, bars, indicators, position, buyingPower }) {
    const anthropicKey = getAnthropicKey ? await getAnthropicKey() : process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) throw new Error('No Anthropic API key configured');

    const client = new Anthropic({ apiKey: anthropicKey });
    const cfg = db.getRawConfigForUser ? db.getRawConfigForUser(userId) : db.getRawConfig();
    const maxPositionPct = parseFloat(cfg.max_position_pct || '0.10');

    const currentPrice = indicators.price;
    const maxPositionValue = buyingPower * maxPositionPct;
    const maxShares = Math.floor(maxPositionValue / currentPrice);

    const barsForPrompt = bars.slice(-30).map(b => ({
      t: b.t || b.time,
      o: +(b.o || b.open || 0).toFixed(2),
      h: +(b.h || b.high || 0).toFixed(2),
      l: +(b.l || b.low || 0).toFixed(2),
      c: +(b.c || b.close || 0).toFixed(2),
      v: b.v || b.volume || 0,
    }));

    const indicatorSummary = {
      price: currentPrice,
      ema9: indicators.ema9 ? +indicators.ema9.toFixed(3) : null,
      ema21: indicators.ema21 ? +indicators.ema21.toFixed(3) : null,
      rsi: indicators.rsi ? +indicators.rsi.toFixed(2) : null,
      macd: indicators.macd ? {
        line: +indicators.macd.macd.toFixed(4),
        signal: +indicators.macd.signal.toFixed(4),
        histogram: +indicators.macd.histogram.toFixed(4),
      } : null,
      bollingerBands: indicators.bollingerBands ? {
        upper: +indicators.bollingerBands.upper.toFixed(2),
        middle: +indicators.bollingerBands.middle.toFixed(2),
        lower: +indicators.bollingerBands.lower.toFixed(2),
        bandwidth: +indicators.bollingerBands.bandwidth.toFixed(4),
      } : null,
      volumeRatio: indicators.volumeRatio ? +indicators.volumeRatio.toFixed(2) : null,
      trend: indicators.trend,
    };

    const positionInfo = position
      ? {
          side: position.side,
          qty: parseFloat(position.qty),
          avgEntryPrice: parseFloat(position.avg_entry_price),
          unrealizedPL: parseFloat(position.unrealized_pl),
          unrealizedPLPct: parseFloat(position.unrealized_plpc),
        }
      : null;

    const systemPrompt = `You are an expert quantitative day trader and technical analyst.
You analyze stocks using technical indicators and make precise, data-driven trading decisions.
You respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

    const userPrompt = `Analyze ${symbol} and provide a trading decision.

CURRENT PRICE: $${currentPrice}
MAX SHARES YOU CAN RECOMMEND: ${maxShares} (based on ${(maxPositionPct * 100).toFixed(0)}% max position size of $${buyingPower.toFixed(2)} buying power)
CURRENT POSITION: ${positionInfo ? JSON.stringify(positionInfo) : 'None'}

TECHNICAL INDICATORS:
${JSON.stringify(indicatorSummary, null, 2)}

LAST 30 BARS (5-min OHLCV):
${JSON.stringify(barsForPrompt)}

INSTRUCTIONS:
- If no position: BUY signal buys shares, HOLD means wait, SELL means no position exists so HOLD
- If long position: SELL means close the position, HOLD means keep it
- Consider RSI extremes (>70 overbought, <30 oversold)
- Consider MACD crossovers and histogram direction
- Consider price vs Bollinger Bands (near upper = potential resistance, near lower = potential support)
- Consider EMA9 vs EMA21 trend alignment
- Volume ratio > 1.5 suggests strong conviction
- Set stop_loss and take_profit as absolute price levels (not percentages)
- Confidence: 0.0-1.0 where 1.0 = extremely high conviction

Respond with ONLY this JSON structure:
{
  "action": "BUY" | "SELL" | "HOLD",
  "quantity": <integer number of shares, 0 if HOLD>,
  "confidence": <float 0.0-1.0>,
  "reasoning": "<concise 2-3 sentence explanation of the key signals driving this decision>",
  "stop_loss": <price level as float, null if HOLD>,
  "take_profit": <price level as float, null if HOLD>
}`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const text = message.content[0].text.trim();
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const decision = JSON.parse(cleaned);

    const valid = ['BUY', 'SELL', 'HOLD'];
    if (!valid.includes(decision.action)) decision.action = 'HOLD';
    decision.quantity = Math.max(0, Math.min(maxShares, parseInt(decision.quantity) || 0));
    decision.confidence = Math.max(0, Math.min(1, parseFloat(decision.confidence) || 0));
    decision.stop_loss = decision.stop_loss ? parseFloat(decision.stop_loss) : null;
    decision.take_profit = decision.take_profit ? parseFloat(decision.take_profit) : null;
    decision.reasoning = String(decision.reasoning || '').slice(0, 1000);

    return decision;
  }

  // ---- Single symbol analysis ----
  async function analyzeSymbol(symbol) {
    try {
      const bars = marketDataService.getBars(symbol, '5Min');
      if (bars.length < 26) {
        console.log(`[AutoTrader:${userId}] Not enough bars for ${symbol}`);
        return;
      }

      const indicators = marketDataService.getIndicators(symbol);
      if (!indicators) return;

      const [account, positions] = await Promise.all([
        alpacaService.getAccount(),
        alpacaService.getPositions(),
      ]);

      const buyingPower = parseFloat(account.buying_power);
      const currentPosition = positions.find(p => p.symbol === symbol) || null;

      const decision = await analyzeStock({
        symbol,
        bars,
        indicators,
        position: currentPosition,
        buyingPower,
      });

      const cfg = db.getRawConfigForUser ? db.getRawConfigForUser(userId) : db.getRawConfig();
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
          const riskCheck = await checkRiskLimits(cfg, account);
          if (!riskCheck.ok) {
            skipReason = riskCheck.reason;
          } else if (decision.action === 'BUY') {
            const posCheck = await checkPositionLimits(cfg, positions);
            if (!posCheck.ok) {
              skipReason = posCheck.reason;
            } else {
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

                const order = await alpacaService.placeOrder(orderPayload);
                executed = 1;

                db.insertTrade({
                  symbol,
                  side: 'buy',
                  qty: decision.quantity,
                  entry_price: indicators.price,
                  exit_price: null,
                  pnl: null,
                  ai_confidence: decision.confidence,
                  ai_reasoning: decision.reasoning,
                  alpaca_order_id: order.id,
                  status: 'open',
                  user_id: userId,
                });

                broadcastMsg('order_fill', {
                  symbol,
                  side: 'buy',
                  qty: decision.quantity,
                  price: indicators.price,
                  orderId: order.id,
                });

                console.log(`[AutoTrader:${userId}] BUY ${decision.quantity} ${symbol} @ ${indicators.price}`);
              } catch (err) {
                skipReason = `Order failed: ${err.message}`;
                console.error(`[AutoTrader:${userId}] BUY failed for ${symbol}:`, err.message);
              }
            }
          } else if (decision.action === 'SELL' && currentPosition) {
            try {
              const order = await alpacaService.placeOrder({
                symbol,
                qty: Math.min(decision.quantity, parseFloat(currentPosition.qty)),
                side: 'sell',
                type: 'market',
                time_in_force: 'day',
              });
              executed = 1;

              const entryPrice = parseFloat(currentPosition.avg_entry_price);
              const pnl = (indicators.price - entryPrice) * decision.quantity;

              db.insertTrade({
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
                user_id: userId,
              });

              broadcastMsg('order_fill', {
                symbol,
                side: 'sell',
                qty: decision.quantity,
                price: indicators.price,
                pnl,
                orderId: order.id,
              });

              console.log(`[AutoTrader:${userId}] SELL ${decision.quantity} ${symbol} @ ${indicators.price}`);
            } catch (err) {
              skipReason = `Order failed: ${err.message}`;
              console.error(`[AutoTrader:${userId}] SELL failed for ${symbol}:`, err.message);
            }
          }
        }
      }

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
        user_id: userId,
      };
      db.insertDecision(decisionRecord);

      broadcastMsg('ai_decision', {
        ...decisionRecord,
        price: indicators.price,
        timestamp: new Date().toISOString(),
      });

      console.log(`[AutoTrader:${userId}] ${symbol}: ${decision.action} (conf=${decision.confidence.toFixed(2)}) — ${skipReason || (executed ? 'EXECUTED' : 'logged')}`);
    } catch (err) {
      console.error(`[AutoTrader:${userId}] analyzeSymbol ${symbol}:`, err.message);
    }
  }

  // ---- Scheduler ----
  function scheduleSymbol(symbol, intervalMin) {
    if (analysisTimers[symbol]) {
      clearInterval(analysisTimers[symbol]);
    }
    const ms = intervalMin * 60 * 1000;
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

    const anthropicKey = getAnthropicKey ? getAnthropicKey() : process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey || anthropicKey === 'your_anthropic_api_key_here') {
      console.warn(`[AutoTrader:${userId}] No Anthropic API key — AI analysis disabled`);
      return;
    }

    const cfg = db.getRawConfigForUser ? db.getRawConfigForUser(userId) : db.getRawConfig();
    const intervalMin = parseFloat(cfg.analysis_interval_min || '5');
    const getWatchlistFn = db.getWatchlistForUser
      ? () => db.getWatchlistForUser(userId)
      : db.getWatchlist;
    const symbols = getWatchlistFn();

    console.log(`[AutoTrader:${userId}] Starting analysis for: ${symbols.join(', ')} every ${intervalMin}min`);
    for (const sym of symbols) {
      scheduleSymbol(sym, intervalMin);
    }
  }

  function stop() {
    running = false;
    for (const sym of Object.keys(analysisTimers)) {
      unscheduleSymbol(sym);
    }
    console.log(`[AutoTrader:${userId}] Stopped all analysis timers`);
  }

  function addSymbol(symbol) {
    if (!running) return;
    const cfg = db.getRawConfigForUser ? db.getRawConfigForUser(userId) : db.getRawConfig();
    const intervalMin = parseFloat(cfg.analysis_interval_min || '5');
    scheduleSymbol(symbol, intervalMin);
  }

  function removeSymbol(symbol) {
    unscheduleSymbol(symbol);
  }

  function isRunning() {
    return running;
  }

  return {
    start,
    stop,
    addSymbol,
    removeSymbol,
    setBroadcast,
    analyzeSymbol,
    isRunning,
  };
}

// ---- Singleton for backward compatibility ----
const alpaca = require('./alpaca');
const marketData = require('./marketData');
const db = require('./database');

const _singleton = createAutoTraderService({
  db,
  alpacaService: alpaca,
  marketDataService: marketData,
  userId: 1,
  getAnthropicKey: () => process.env.ANTHROPIC_API_KEY,
});

module.exports = _singleton;
module.exports.createAutoTraderService = createAutoTraderService;
