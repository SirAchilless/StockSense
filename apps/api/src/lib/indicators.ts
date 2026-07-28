// Pure indicator functions — no side effects, fully unit-testable.
// All functions accept a `closes` array (chronological order, oldest first)
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
