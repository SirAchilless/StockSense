import { describe, it, expect } from 'vitest';
import { sma, ema, rsi, macd, atr, ichimoku, superTrend, fibonacci, volumeProfile, detectPatterns } from '../indicators';

// Reference series: 30 prices around 100 with small variations
const REF = [
  100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
  111, 110, 112, 114, 113, 115, 117, 116, 118, 120,
  119, 121, 123, 122, 124, 126, 125, 127, 129, 128,
];

describe('sma', () => {
  it('returns null for first (period-1) entries', () => {
    const result = sma(REF, 5);
    expect(result[0]).toBeNull();
    expect(result[3]).toBeNull();
    expect(result[4]).not.toBeNull();
  });

  it('first valid value equals simple average of first 5 elements', () => {
    const result = sma(REF, 5);
    const expected = (100 + 102 + 101 + 103 + 105) / 5;
    expect(result[4]).toBeCloseTo(expected, 5);
  });

  it('output length matches input length', () => {
    expect(sma(REF, 10).length).toBe(REF.length);
  });

  it('returns all nulls when period > array length', () => {
    const result = sma(REF, 50);
    expect(result.every((v) => v === null)).toBe(true);
  });
});

describe('ema', () => {
  it('seed value at index (period-1) equals SMA of first period values', () => {
    const result = ema(REF, 5);
    const smaRef = REF.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    expect(result[4]).toBeCloseTo(smaRef, 5);
  });

  it('EMA values track price direction', () => {
    const result = ema(REF, 5);
    // REF is trending up — EMA at end should be higher than at seed
    const seed = result[4] as number;
    const last = result[REF.length - 1] as number;
    expect(last).toBeGreaterThan(seed);
  });

  it('returns null before period - 1', () => {
    const result = ema(REF, 10);
    expect(result[8]).toBeNull();
    expect(result[9]).not.toBeNull();
  });
});

describe('rsi', () => {
  it('first (period) entries are null', () => {
    const result = rsi(REF, 14);
    for (let i = 0; i < 14; i++) expect(result[i]).toBeNull();
    expect(result[14]).not.toBeNull();
  });

  it('RSI is bounded 0–100', () => {
    const result = rsi(REF, 14);
    for (const v of result) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('RSI > 50 on an uptrending series', () => {
    // All prices strictly increasing → RSI near 100
    const rising = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(rising, 14);
    const last = result[result.length - 1] as number;
    expect(last).toBeGreaterThan(50);
  });

  it('RSI < 50 on a downtrending series', () => {
    const falling = Array.from({ length: 20 }, (_, i) => 100 - i);
    const result = rsi(falling, 14);
    const last = result[result.length - 1] as number;
    expect(last).toBeLessThan(50);
  });
});

describe('macd', () => {
  // Need at least 26+9=35 bars for all signals to be non-null
  const LONG = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10 + i * 0.5);

  it('macd line is non-null from index 25 onward', () => {
    const result = macd(LONG, 12, 26, 9);
    expect(result[24].macd).toBeNull();
    expect(result[25].macd).not.toBeNull();
  });

  it('signal line is non-null after macd line has 9 values', () => {
    const result = macd(LONG, 12, 26, 9);
    // signal requires 9 macd values — first macd at idx 25, so signal at idx 25+8=33
    expect(result[32].signal).toBeNull();
    expect(result[33].signal).not.toBeNull();
  });

  it('histogram = macd - signal where both non-null', () => {
    const result = macd(LONG, 12, 26, 9);
    for (const bar of result) {
      if (bar.macd !== null && bar.signal !== null && bar.histogram !== null) {
        expect(bar.histogram).toBeCloseTo(bar.macd - bar.signal, 8);
      }
    }
  });

  it('output length matches input length', () => {
    expect(macd(LONG).length).toBe(LONG.length);
  });
});

// ── ATR ───────────────────────────────────────────────────────────────────────
describe('atr', () => {
  // Flat prices: every TR = 2 (high=102, low=98, close=100 for all bars)
  const n = 20;
  const HIGHS = new Array(n).fill(102);
  const LOWS = new Array(n).fill(98);
  const CLOSES = new Array(n).fill(100);

  it('first valid value at index period-1', () => {
    const result = atr(HIGHS, LOWS, CLOSES, 14);
    expect(result[12]).toBeNull();
    expect(result[13]).not.toBeNull();
  });

  it('ATR = 4 for flat high=102 low=98 series (TR always 4)', () => {
    // TR = max(H-L, |H-prevC|, |L-prevC|) = max(4, |102-100|, |98-100|) = 4
    const result = atr(HIGHS, LOWS, CLOSES, 14);
    expect(result[13]).toBeCloseTo(4, 5);
  });

  it('output length matches input', () => {
    expect(atr(HIGHS, LOWS, CLOSES).length).toBe(n);
  });

  it('ATR is positive on a volatile series', () => {
    const highs = Array.from({ length: 30 }, (_, i) => 100 + i + 5);
    const lows = Array.from({ length: 30 }, (_, i) => 100 + i - 5);
    const cls = Array.from({ length: 30 }, (_, i) => 100 + i);
    const result = atr(highs, lows, cls, 14);
    for (const v of result) {
      if (v !== null) expect(v).toBeGreaterThan(0);
    }
  });
});

// ── Ichimoku ──────────────────────────────────────────────────────────────────
describe('ichimoku', () => {
  // 80 bars of linearly rising prices so we have enough depth
  const m = 80;
  const HIGHS = Array.from({ length: m }, (_, i) => 100 + i + 1);
  const LOWS = Array.from({ length: m }, (_, i) => 100 + i - 1);
  const CLOSES = Array.from({ length: m }, (_, i) => 100 + i);

  it('output length matches input', () => {
    expect(ichimoku(HIGHS, LOWS, CLOSES).length).toBe(m);
  });

  it('tenkan null before index 8, non-null at 8', () => {
    const result = ichimoku(HIGHS, LOWS, CLOSES);
    expect(result[7].tenkan).toBeNull();
    expect(result[8].tenkan).not.toBeNull();
  });

  it('kijun null before index 25, non-null at 25', () => {
    const result = ichimoku(HIGHS, LOWS, CLOSES);
    expect(result[24].kijun).toBeNull();
    expect(result[25].kijun).not.toBeNull();
  });

  it('tenkan at index 8 = midpoint of first 9 bars', () => {
    const result = ichimoku(HIGHS, LOWS, CLOSES);
    // midpoint = (max high[0..8] + min low[0..8]) / 2
    const maxH = Math.max(...HIGHS.slice(0, 9));
    const minL = Math.min(...LOWS.slice(0, 9));
    expect(result[8].tenkan).toBeCloseTo((maxH + minL) / 2, 5);
  });

  it('senkouA is null where tenkan or kijun at past position is null', () => {
    const result = ichimoku(HIGHS, LOWS, CLOSES);
    // senkouA at i requires kijun[i-26] non-null → kijun valid at 25 → senkouA valid at 51
    expect(result[50].senkouA).toBeNull();
    expect(result[51].senkouA).not.toBeNull();
  });

  it('chikou at i = close[i+26]', () => {
    const result = ichimoku(HIGHS, LOWS, CLOSES);
    expect(result[0].chikou).toBeCloseTo(CLOSES[26], 5);
    expect(result[10].chikou).toBeCloseTo(CLOSES[36], 5);
  });

  it('chikou null for last 26 bars', () => {
    const result = ichimoku(HIGHS, LOWS, CLOSES);
    expect(result[m - 1].chikou).toBeNull();
    expect(result[m - 26].chikou).toBeNull();
    expect(result[m - 27].chikou).not.toBeNull();
  });
});

// ── SuperTrend ────────────────────────────────────────────────────────────────
describe('superTrend', () => {
  const m = 30;
  const HIGHS = Array.from({ length: m }, (_, i) => 100 + i + 2);
  const LOWS = Array.from({ length: m }, (_, i) => 100 + i - 2);
  const CLOSES = Array.from({ length: m }, (_, i) => 100 + i); // strictly rising

  it('output length matches input', () => {
    expect(superTrend(HIGHS, LOWS, CLOSES).length).toBe(m);
  });

  it('null before period-1', () => {
    const result = superTrend(HIGHS, LOWS, CLOSES, 10);
    expect(result[8].value).toBeNull();
    expect(result[9].value).not.toBeNull();
  });

  it('direction is "up" on a rising price series', () => {
    const result = superTrend(HIGHS, LOWS, CLOSES, 10);
    // A strong rising series should trend up near the end
    const last = result[m - 1];
    expect(last.direction).toBe('up');
  });

  it('direction is "down" on a falling price series', () => {
    const fallingH = Array.from({ length: m }, (_, i) => 200 - i + 2);
    const fallingL = Array.from({ length: m }, (_, i) => 200 - i - 2);
    const fallingC = Array.from({ length: m }, (_, i) => 200 - i);
    const result = superTrend(fallingH, fallingL, fallingC, 10);
    const last = result[m - 1];
    expect(last.direction).toBe('down');
  });

  it('value is positive for all non-null bars', () => {
    const result = superTrend(HIGHS, LOWS, CLOSES, 10);
    for (const r of result) {
      if (r.value !== null) expect(r.value).toBeGreaterThan(0);
    }
  });
});

// ── Fibonacci ─────────────────────────────────────────────────────────────────
describe('fibonacci', () => {
  // Swing low = 100 at index 0, swing high = 200 at index 10
  const H = Array.from({ length: 11 }, (_, i) => 100 + i * 10);
  const L = Array.from({ length: 11 }, (_, i) => 90 + i * 10);

  it('returns null for fewer than 2 bars', () => {
    expect(fibonacci([150], [140])).toBeNull();
  });

  it('detects uptrend when high is more recent than low', () => {
    const result = fibonacci(H, L);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('up');
  });

  it('0% level equals swing high on uptrend', () => {
    const result = fibonacci(H, L)!;
    const level0 = result.levels.find((l) => l.ratio === 0)!;
    expect(level0.price).toBeCloseTo(result.swingHigh, 5);
  });

  it('100% level equals swing low on uptrend', () => {
    const result = fibonacci(H, L)!;
    const level100 = result.levels.find((l) => l.ratio === 1.0)!;
    expect(level100.price).toBeCloseTo(result.swingLow, 5);
  });

  it('61.8% level matches hand calculation', () => {
    const result = fibonacci(H, L)!;
    const range = result.swingHigh - result.swingLow;
    const expected = result.swingHigh - 0.618 * range;
    const level618 = result.levels.find((l) => l.ratio === 0.618)!;
    expect(level618.price).toBeCloseTo(expected, 5);
  });

  it('returns 7 levels (0, 23.6, 38.2, 50, 61.8, 78.6, 100)', () => {
    const result = fibonacci(H, L)!;
    expect(result.levels).toHaveLength(7);
  });
});

// ── Volume Profile ────────────────────────────────────────────────────────────
describe('volumeProfile', () => {
  const m = 20;
  // All volume = 100 except bar at index 10 which has 1000 (should be POC)
  const HIGHS = Array.from({ length: m }, (_, i) => 100 + i);
  const LOWS = Array.from({ length: m }, (_, i) => 99 + i);
  const CLOSES = Array.from({ length: m }, (_, i) => 100 + i - 0.5);
  const VOLS = Array.from({ length: m }, (_, i) => (i === 10 ? 10000 : 100));

  it('returns `bins` buckets', () => {
    const result = volumeProfile(HIGHS, LOWS, CLOSES, VOLS, 10);
    expect(result).toHaveLength(10);
  });

  it('total volume across all bins equals sum of input volumes', () => {
    const result = volumeProfile(HIGHS, LOWS, CLOSES, VOLS, 10);
    const total = result.reduce((s, b) => s + b.volume, 0);
    const inputTotal = VOLS.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(inputTotal, 1);
  });

  it('exactly one bin is marked as POC', () => {
    const result = volumeProfile(HIGHS, LOWS, CLOSES, VOLS, 10);
    const pocBins = result.filter((b) => b.isPOC);
    expect(pocBins).toHaveLength(1);
  });

  it('POC bin has the highest volume', () => {
    const result = volumeProfile(HIGHS, LOWS, CLOSES, VOLS, 10);
    const poc = result.find((b) => b.isPOC)!;
    for (const bin of result) {
      expect(poc.volume).toBeGreaterThanOrEqual(bin.volume);
    }
  });

  it('priceFrom < priceMid < priceTo for each bin', () => {
    const result = volumeProfile(HIGHS, LOWS, CLOSES, VOLS, 10);
    for (const bin of result) {
      expect(bin.priceFrom).toBeLessThan(bin.priceMid);
      expect(bin.priceMid).toBeLessThan(bin.priceTo);
    }
  });

  it('returns empty array for empty input', () => {
    expect(volumeProfile([], [], [], [], 10)).toHaveLength(0);
  });
});

// ── detectPatterns ────────────────────────────────────────────────────────────
describe('detectPatterns', () => {
  it('identifies Doji on a tiny-body candle', () => {
    // Body = 0.1, range = 10 → bodyRatio = 0.01 < 0.1
    const O = [100, 105.0]; const H = [110, 115]; const L = [90, 95]; const C = [100, 105.1];
    const result = detectPatterns(O, H, L, C);
    const doji = result.find((p) => p.name === 'DOJI');
    expect(doji).toBeDefined();
    expect(doji!.signal).toBe('neutral');
  });

  it('identifies Bullish Marubozu on a strong up candle with no shadows', () => {
    // open = low, close = high → body = range
    const O = [100]; const H = [120]; const L = [100]; const C = [120];
    const result = detectPatterns(O, H, L, C);
    expect(result.find((p) => p.name === 'MARUBOZU_BULL')).toBeDefined();
  });

  it('identifies Bearish Marubozu on a strong down candle with no shadows', () => {
    const O = [120]; const H = [120]; const L = [100]; const C = [100];
    const result = detectPatterns(O, H, L, C);
    expect(result.find((p) => p.name === 'MARUBOZU_BEAR')).toBeDefined();
  });

  it('identifies Bullish Engulfing pattern', () => {
    // Bar 0: bearish (open 110, close 100, small body)
    // Bar 1: bullish larger (open 98, close 115)
    const O = [110, 98]; const H = [112, 116]; const L = [99, 97]; const C = [100, 115];
    const result = detectPatterns(O, H, L, C);
    expect(result.find((p) => p.name === 'BULLISH_ENGULFING')).toBeDefined();
  });

  it('identifies Bearish Engulfing pattern', () => {
    // Bar 0: bullish (open 100, close 110)
    // Bar 1: bearish larger (open 112, close 98)
    const O = [100, 112]; const H = [111, 113]; const L = [99, 97]; const C = [110, 98];
    const result = detectPatterns(O, H, L, C);
    expect(result.find((p) => p.name === 'BEARISH_ENGULFING')).toBeDefined();
  });

  it('returns empty array on flat/no-range candles', () => {
    const O = [100, 100]; const H = [100, 100]; const L = [100, 100]; const C = [100, 100];
    expect(detectPatterns(O, H, L, C)).toHaveLength(0);
  });

  it('each pattern has index, name, signal, description', () => {
    const O = [100]; const H = [120]; const L = [100]; const C = [120];
    const result = detectPatterns(O, H, L, C);
    if (result.length > 0) {
      const p = result[0];
      expect(typeof p.index).toBe('number');
      expect(typeof p.name).toBe('string');
      expect(['bullish', 'bearish', 'neutral']).toContain(p.signal);
      expect(typeof p.description).toBe('string');
    }
  });
});
