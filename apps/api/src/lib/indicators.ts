// Pure indicator functions — no side effects, fully unit-testable.
// All functions accept OHLCV arrays (chronological order, oldest first)
// and return arrays of the same length, with null for periods where the
// indicator cannot yet be computed.

export type NullableNumber = number | null;

export interface MACDResult {
  macd: NullableNumber;
  signal: NullableNumber;
  histogram: NullableNumber;
}

// Simple moving average
export function sma(closes: number[], period: number): NullableNumber[] {
  const result: NullableNumber[] = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    result[i] = sum / period;
  }
  return result;
}

// Exponential moving average (Wilder's seeded-with-SMA approach)
export function ema(closes: number[], period: number): NullableNumber[] {
  const result: NullableNumber[] = new Array(closes.length).fill(null);
  if (closes.length < period) return result;

  const k = 2 / (period + 1);
  // Seed with SMA of first `period` values
  let prev = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = prev;

  for (let i = period; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
    result[i] = prev;
  }
  return result;
}

// RSI — uses Wilder's smoothed average (standard 14-period)
export function rsi(closes: number[], period = 14): NullableNumber[] {
  const result: NullableNumber[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return result;

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // Initial averages (simple)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs0);

  // Wilder smoothing for subsequent values
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i + 1] = 100 - 100 / (1 + rs);
  }
  return result;
}

// MACD — standard (12, 26, 9) configuration
export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult[] {
  const result: MACDResult[] = new Array(closes.length).fill(null).map(() => ({
    macd: null,
    signal: null,
    histogram: null,
  }));

  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  // MACD line = fast EMA - slow EMA (only where both are non-null)
  const macdLine: NullableNumber[] = closes.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? (fastEma[i] as number) - (slowEma[i] as number) : null
  );

  // Signal = EMA(9) of MACD line — compute only over non-null MACD values
  const firstValidIdx = macdLine.findIndex((v) => v !== null);
  if (firstValidIdx === -1) return result;

  const macdValues = macdLine.slice(firstValidIdx) as number[];
  const signalRaw = ema(macdValues, signalPeriod);

  for (let i = 0; i < macdValues.length; i++) {
    const absIdx = firstValidIdx + i;
    const m = macdLine[absIdx];
    const s = signalRaw[i];
    result[absIdx] = {
      macd: m,
      signal: s,
      histogram: m !== null && s !== null ? m - s : null,
    };
  }
  return result;
}

// ── ATR (Average True Range) — Wilder's smoothing ────────────────────────────
// Seed: simple average of first `period` true ranges; then Wilder smooth.
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): NullableNumber[] {
  const n = highs.length;
  const result: NullableNumber[] = new Array(n).fill(null);
  if (n < period) return result;

  const tr: number[] = new Array(n).fill(0);
  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  }

  let avg = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = avg;
  for (let i = period; i < n; i++) {
    avg = (avg * (period - 1) + tr[i]) / period;
    result[i] = avg;
  }
  return result;
}

// ── Ichimoku Kinko Hyo ────────────────────────────────────────────────────────
// Values are aligned to the bars[] index they would appear at on a chart
// (senkou spans are shifted back by `displacement` so the cloud aligns with price).
export interface IchimokuResult {
  tenkan: NullableNumber;   // Conversion Line: midpoint of last 9 bars
  kijun: NullableNumber;    // Base Line: midpoint of last 26 bars
  senkouA: NullableNumber;  // Leading Span A: (tenkan+kijun)/2 from 26 bars ago
  senkouB: NullableNumber;  // Leading Span B: midpoint of 52 bars ending 26 bars ago
  chikou: NullableNumber;   // Lagging Span: close 26 bars from now (plotted here)
}

export function ichimoku(
  highs: number[],
  lows: number[],
  closes: number[],
  tenkanPeriod = 9,
  kijunPeriod = 26,
  senkouBPeriod = 52,
  displacement = 26
): IchimokuResult[] {
  const n = highs.length;
  const result: IchimokuResult[] = new Array(n).fill(null).map(() => ({
    tenkan: null, kijun: null, senkouA: null, senkouB: null, chikou: null,
  }));

  // Precompute period midpoints (highest high + lowest low) / 2
  const periodMid = (start: number, end: number): number => {
    let hi = -Infinity, lo = Infinity;
    for (let k = start; k <= end; k++) {
      if (highs[k] > hi) hi = highs[k];
      if (lows[k] < lo) lo = lows[k];
    }
    return (hi + lo) / 2;
  };

  const tenkanArr: NullableNumber[] = new Array(n).fill(null);
  const kijunArr: NullableNumber[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i >= tenkanPeriod - 1) tenkanArr[i] = periodMid(i - tenkanPeriod + 1, i);
    if (i >= kijunPeriod - 1) kijunArr[i] = periodMid(i - kijunPeriod + 1, i);
  }

  for (let i = 0; i < n; i++) {
    result[i].tenkan = tenkanArr[i];
    result[i].kijun = kijunArr[i];

    // Senkou A: values from displacement bars ago, displayed at i
    const past = i - displacement;
    if (past >= 0 && tenkanArr[past] !== null && kijunArr[past] !== null) {
      result[i].senkouA = ((tenkanArr[past] as number) + (kijunArr[past] as number)) / 2;
    }

    // Senkou B: 52-bar midpoint ending at displacement bars ago, displayed at i
    if (past >= senkouBPeriod - 1) {
      result[i].senkouB = periodMid(past - senkouBPeriod + 1, past);
    }

    // Chikou: current close displayed 26 bars back — so at position i we show close[i+d]
    if (i + displacement < n) {
      result[i].chikou = closes[i + displacement];
    }
  }
  return result;
}

// ── SuperTrend ────────────────────────────────────────────────────────────────
// ATR-based trailing stop. direction='up' → price above band (bullish),
// direction='down' → price below band (bearish).
export interface SuperTrendResult {
  value: NullableNumber;
  direction: 'up' | 'down' | null;
}

export function superTrend(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 10,
  multiplier = 3.0
): SuperTrendResult[] {
  const n = highs.length;
  const none = (): SuperTrendResult => ({ value: null, direction: null });
  const result: SuperTrendResult[] = new Array(n).fill(null).map(none);

  const atrArr = atr(highs, lows, closes, period);
  const startIdx = period - 1;
  if (startIdx >= n) return result;

  const upperBand: number[] = new Array(n).fill(0);
  const lowerBand: number[] = new Array(n).fill(0);
  const direction: Array<'up' | 'down' | null> = new Array(n).fill(null);

  for (let i = startIdx; i < n; i++) {
    const atrVal = atrArr[i];
    if (atrVal === null) continue;

    const hl2 = (highs[i] + lows[i]) / 2;
    const basicUpper = hl2 + multiplier * atrVal;
    const basicLower = hl2 - multiplier * atrVal;

    if (i === startIdx) {
      upperBand[i] = basicUpper;
      lowerBand[i] = basicLower;
      direction[i] = closes[i] > hl2 ? 'up' : 'down';
    } else {
      const prevClose = closes[i - 1];
      // Ratchet upper band down, lower band up
      upperBand[i] = basicUpper < upperBand[i - 1] || prevClose > upperBand[i - 1]
        ? basicUpper : upperBand[i - 1];
      lowerBand[i] = basicLower > lowerBand[i - 1] || prevClose < lowerBand[i - 1]
        ? basicLower : lowerBand[i - 1];

      // Flip direction when price crosses the active band
      if (direction[i - 1] === 'down') {
        direction[i] = closes[i] > upperBand[i] ? 'up' : 'down';
      } else {
        direction[i] = closes[i] < lowerBand[i] ? 'down' : 'up';
      }
    }

    result[i] = {
      value: direction[i] === 'up' ? lowerBand[i] : upperBand[i],
      direction: direction[i],
    };
  }
  return result;
}

// ── Fibonacci Retracement ─────────────────────────────────────────────────────
// Finds the swing high and swing low within the last `lookback` bars (or all bars),
// determines trend direction by which extreme occurred more recently, then
// returns the standard 7 retracement levels.
export interface FibLevel {
  ratio: number;
  price: number;
  label: string;
}

export interface FibonacciLevels {
  swingHigh: number;
  swingLow: number;
  direction: 'up' | 'down';
  levels: FibLevel[];
}

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

export function fibonacci(
  highs: number[],
  lows: number[],
  lookback?: number
): FibonacciLevels | null {
  const n = highs.length;
  if (n < 2) return null;

  const start = lookback ? Math.max(0, n - lookback) : 0;
  let swingHigh = -Infinity, swingHighIdx = start;
  let swingLow = Infinity, swingLowIdx = start;

  for (let i = start; i < n; i++) {
    if (highs[i] > swingHigh) { swingHigh = highs[i]; swingHighIdx = i; }
    if (lows[i] < swingLow) { swingLow = lows[i]; swingLowIdx = i; }
  }

  if (swingHigh === swingLow) return null;

  // If swing high is more recent → uptrend retracement (levels from high downward)
  const direction: 'up' | 'down' = swingHighIdx >= swingLowIdx ? 'up' : 'down';
  const range = swingHigh - swingLow;

  const levels: FibLevel[] = FIB_RATIOS.map((ratio) => ({
    ratio,
    price: direction === 'up' ? swingHigh - ratio * range : swingLow + ratio * range,
    label: `${(ratio * 100).toFixed(1)}%`,
  }));

  return { swingHigh, swingLow, direction, levels };
}

// ── Volume Profile ────────────────────────────────────────────────────────────
// Distributes volume across `bins` price buckets using typical price (H+L+C)/3.
// Returns buckets sorted low-to-high. isPOC marks the bin with most volume.
export interface VolumeProfileBin {
  priceFrom: number;
  priceTo: number;
  priceMid: number;
  volume: number;
  isPOC: boolean;
}

export function volumeProfile(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  bins = 24
): VolumeProfileBin[] {
  const n = highs.length;
  if (n === 0) return [];

  const globalHigh = Math.max(...highs);
  const globalLow = Math.min(...lows);
  if (globalHigh === globalLow) return [];

  const binSize = (globalHigh - globalLow) / bins;
  const buckets = new Array<number>(bins).fill(0);

  for (let i = 0; i < n; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    const idx = Math.min(Math.floor((tp - globalLow) / binSize), bins - 1);
    buckets[idx] += volumes[i];
  }

  const maxVol = Math.max(...buckets);
  return buckets.map((vol, i) => ({
    priceFrom: globalLow + i * binSize,
    priceTo: globalLow + (i + 1) * binSize,
    priceMid: globalLow + (i + 0.5) * binSize,
    volume: vol,
    isPOC: vol === maxVol,
  }));
}

// ── Candlestick Pattern Recognition ──────────────────────────────────────────
export type PatternName =
  | 'DOJI'
  | 'HAMMER'
  | 'HANGING_MAN'
  | 'SHOOTING_STAR'
  | 'INVERTED_HAMMER'
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'MORNING_STAR'
  | 'EVENING_STAR'
  | 'MARUBOZU_BULL'
  | 'MARUBOZU_BEAR';

export type PatternSignal = 'bullish' | 'bearish' | 'neutral';

export interface CandlePattern {
  index: number;
  name: PatternName;
  signal: PatternSignal;
  description: string;
}

export function detectPatterns(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];
  const n = opens.length;

  for (let i = 0; i < n; i++) {
    const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
    const range = h - l;
    if (range === 0) continue;

    const body = Math.abs(c - o);
    const upper = h - Math.max(o, c);
    const lower = Math.min(o, c) - l;
    const bodyR = body / range;
    const upperR = upper / range;
    const lowerR = lower / range;
    const isBull = c >= o;

    // Doji: body < 10% of range
    if (bodyR < 0.1) {
      patterns.push({ index: i, name: 'DOJI', signal: 'neutral', description: 'Doji — indecision between buyers and sellers' });
      continue;
    }

    // Marubozu: body > 90% (almost no shadows)
    if (bodyR > 0.9) {
      if (isBull) {
        patterns.push({ index: i, name: 'MARUBOZU_BULL', signal: 'bullish', description: 'Bullish Marubozu — strong sustained buying pressure' });
      } else {
        patterns.push({ index: i, name: 'MARUBOZU_BEAR', signal: 'bearish', description: 'Bearish Marubozu — strong sustained selling pressure' });
      }
      continue;
    }

    // Hammer / Hanging Man: small body at top, long lower shadow
    if (lowerR >= 0.6 && upperR <= 0.2 && bodyR <= 0.35) {
      // Simple trend context: compare current close to 5-bar-ago close
      const refIdx = Math.max(0, i - 5);
      const priorDowntrend = closes[refIdx] > c;
      if (priorDowntrend) {
        patterns.push({ index: i, name: 'HAMMER', signal: 'bullish', description: 'Hammer — potential bullish reversal after downtrend' });
      } else {
        patterns.push({ index: i, name: 'HANGING_MAN', signal: 'bearish', description: 'Hanging Man — potential bearish reversal after uptrend' });
      }
      continue;
    }

    // Shooting Star / Inverted Hammer: small body at bottom, long upper shadow
    if (upperR >= 0.6 && lowerR <= 0.2 && bodyR <= 0.35) {
      const refIdx = Math.max(0, i - 5);
      const priorDowntrend = closes[refIdx] > c;
      if (priorDowntrend) {
        patterns.push({ index: i, name: 'INVERTED_HAMMER', signal: 'bullish', description: 'Inverted Hammer — potential bullish reversal after downtrend' });
      } else {
        patterns.push({ index: i, name: 'SHOOTING_STAR', signal: 'bearish', description: 'Shooting Star — potential bearish reversal after uptrend' });
      }
      continue;
    }

    // Two-candle patterns
    if (i > 0) {
      const po = opens[i - 1], pc = closes[i - 1];
      const prevBull = pc >= po;
      const prevBody = Math.abs(pc - po);

      if (!prevBull && isBull && body > prevBody && o <= pc && c >= po) {
        patterns.push({ index: i, name: 'BULLISH_ENGULFING', signal: 'bullish', description: 'Bullish Engulfing — strong bullish reversal' });
        continue;
      }

      if (prevBull && !isBull && body > prevBody && o >= pc && c <= po) {
        patterns.push({ index: i, name: 'BEARISH_ENGULFING', signal: 'bearish', description: 'Bearish Engulfing — strong bearish reversal' });
        continue;
      }
    }

    // Three-candle patterns
    if (i >= 2) {
      const o0 = opens[i - 2], c0 = closes[i - 2];
      const o1 = opens[i - 1], c1 = closes[i - 1];
      const h1 = highs[i - 1], l1 = lows[i - 1];
      const firstBull = c0 >= o0;
      const firstBody = Math.abs(c0 - o0);
      const midBody = Math.abs(c1 - o1);
      const midRange = h1 - l1;
      const midBodyR = midRange > 0 ? midBody / midRange : 1;

      // Morning Star: large bearish, small middle (gap down), large bullish closing into first body
      if (!firstBull && midBodyR < 0.35 && isBull && body > firstBody * 0.5 && c > (o0 + c0) / 2) {
        patterns.push({ index: i, name: 'MORNING_STAR', signal: 'bullish', description: 'Morning Star — three-candle bullish reversal' });
        continue;
      }

      // Evening Star: large bullish, small middle (gap up), large bearish closing into first body
      if (firstBull && midBodyR < 0.35 && !isBull && body > firstBody * 0.5 && c < (o0 + c0) / 2) {
        patterns.push({ index: i, name: 'EVENING_STAR', signal: 'bearish', description: 'Evening Star — three-candle bearish reversal' });
        continue;
      }
    }
  }

  return patterns;
}
