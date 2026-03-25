/**
 * Technical Indicators — all computed server-side from OHLCV bar arrays.
 * Each bar: { t, o, h, l, c, v }
 */

// Simple Moving Average
function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Exponential Moving Average
function ema(values, period) {
  if (values.length === 0) return null;
  const k = 2 / (period + 1);
  let emVal = values[0];
  for (let i = 1; i < values.length; i++) {
    emVal = values[i] * k + emVal * (1 - k);
  }
  return emVal;
}

// Compute EMA series (returns array same length as values)
function emaSeries(values, period) {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

// RSI (14-period default)
function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  const recent = closes.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// MACD (12/26/9)
function macd(closes) {
  if (closes.length < 26) return null;
  const ema12Series = emaSeries(closes, 12);
  const ema26Series = emaSeries(closes, 26);
  const macdLine = ema12Series.map((v, i) => v - ema26Series[i]);
  const signalSeries = emaSeries(macdLine.slice(25), 9);
  const macdVal = macdLine[macdLine.length - 1];
  const signalVal = signalSeries[signalSeries.length - 1];
  return {
    macd: macdVal,
    signal: signalVal,
    histogram: macdVal - signalVal,
  };
}

// Bollinger Bands (20-period, 2 std dev)
function bollingerBands(closes, period = 20, stdDevMult = 2) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: mean + stdDevMult * std,
    middle: mean,
    lower: mean - stdDevMult * std,
    bandwidth: (stdDevMult * 2 * std) / mean,
  };
}

// Volume ratio (current vs 20-bar average)
function volumeRatio(volumes) {
  if (volumes.length < 2) return null;
  const avg20 = sma(volumes.slice(0, -1), Math.min(20, volumes.length - 1));
  const current = volumes[volumes.length - 1];
  if (!avg20 || avg20 === 0) return null;
  return current / avg20;
}

/**
 * Compute all indicators from a bars array.
 * Returns an object with the latest values.
 */
function computeAll(bars) {
  if (!bars || bars.length === 0) return null;

  const closes = bars.map(b => b.c || b.close || 0);
  const volumes = bars.map(b => b.v || b.volume || 0);
  const highs = bars.map(b => b.h || b.high || 0);
  const lows = bars.map(b => b.l || b.low || 0);

  const lastClose = closes[closes.length - 1];
  const lastBar = bars[bars.length - 1];

  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const rsiVal = rsi(closes, 14);
  const macdVal = macd(closes);
  const bbands = bollingerBands(closes, 20, 2);
  const volRatio = volumeRatio(volumes);

  // Price position within Bollinger Bands (0=lower, 1=upper)
  let bbPosition = null;
  if (bbands) {
    bbPosition = (lastClose - bbands.lower) / (bbands.upper - bbands.lower);
  }

  return {
    price: lastClose,
    open: lastBar.o || lastBar.open || 0,
    high: lastBar.h || lastBar.high || 0,
    low: lastBar.l || lastBar.low || 0,
    volume: lastBar.v || lastBar.volume || 0,
    ema9,
    ema21,
    rsi: rsiVal,
    macd: macdVal,
    bollingerBands: bbands,
    bbPosition,
    volumeRatio: volRatio,
    trend: ema9 && ema21 ? (ema9 > ema21 ? 'bullish' : 'bearish') : 'neutral',
  };
}

/**
 * Build per-bar indicator series for charting (returns array).
 */
function computeSeries(bars) {
  if (!bars || bars.length === 0) return [];
  const closes = bars.map(b => b.c || b.close || 0);
  const ema9s = emaSeries(closes, 9);
  const ema21s = emaSeries(closes, 21);

  return bars.map((bar, i) => {
    const slice = closes.slice(0, i + 1);
    const bb = bollingerBands(slice, 20, 2);
    return {
      time: bar.t || bar.time,
      open: bar.o || bar.open,
      high: bar.h || bar.high,
      low: bar.l || bar.low,
      close: bar.c || bar.close,
      volume: bar.v || bar.volume,
      ema9: ema9s[i],
      ema21: ema21s[i],
      bbUpper: bb ? bb.upper : null,
      bbMiddle: bb ? bb.middle : null,
      bbLower: bb ? bb.lower : null,
    };
  });
}

module.exports = { computeAll, computeSeries, rsi, macd, bollingerBands, ema, emaSeries };
