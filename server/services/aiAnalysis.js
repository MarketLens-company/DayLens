const Anthropic = require('@anthropic-ai/sdk');
const { getRawConfig } = require('./database');
require('dotenv').config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Use Haiku for routine per-symbol analysis (fast + ~4x cheaper than Sonnet).
// Sonnet is reserved for the screener which does broader market reasoning.
const MODEL = 'claude-haiku-3-5-20241022';

/**
 * Ask Claude to analyze a stock and return a structured trading decision.
 *
 * @param {object} params
 * @param {string} params.symbol
 * @param {Array}  params.bars         — last 30 OHLCV bars
 * @param {object} params.indicators   — computed indicators (latest values)
 * @param {object|null} params.position — current open position or null
 * @param {number} params.buyingPower
 * @returns {object} { action, quantity, confidence, reasoning, stop_loss, take_profit }
 */
async function analyzeStock({ symbol, bars, indicators, position, buyingPower }) {
  const cfg = getRawConfig();
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

  // Strip any accidental markdown code fences
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  const decision = JSON.parse(cleaned);

  // Validate and sanitize
  const valid = ['BUY', 'SELL', 'HOLD'];
  if (!valid.includes(decision.action)) decision.action = 'HOLD';
  decision.quantity = Math.max(0, Math.min(maxShares, parseInt(decision.quantity) || 0));
  decision.confidence = Math.max(0, Math.min(1, parseFloat(decision.confidence) || 0));
  decision.stop_loss = decision.stop_loss ? parseFloat(decision.stop_loss) : null;
  decision.take_profit = decision.take_profit ? parseFloat(decision.take_profit) : null;
  decision.reasoning = String(decision.reasoning || '').slice(0, 1000);

  return decision;
}

module.exports = { analyzeStock };
