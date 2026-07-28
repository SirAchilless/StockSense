import { describe, it, expect } from 'vitest';
import { sma, ema, rsi, macd } from '../indicators';

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
