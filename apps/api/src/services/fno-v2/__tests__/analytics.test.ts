import { describe, it, expect } from 'vitest';
import { classifyOITrend, computeCostOfCarry, classifyPCR } from '../analytics';

describe('classifyOITrend (C.7)', () => {
  it('LONG_BUILDUP when oiChange > 0 and priceChange > 0', () => {
    expect(classifyOITrend(1000, 1.5)).toBe('LONG_BUILDUP');
  });
  it('SHORT_BUILDUP when oiChange > 0 and priceChange < 0', () => {
    expect(classifyOITrend(1000, -1.2)).toBe('SHORT_BUILDUP');
  });
  it('SHORT_UNWINDING when oiChange < 0 and priceChange > 0', () => {
    expect(classifyOITrend(-500, 0.8)).toBe('SHORT_UNWINDING');
  });
  it('LONG_UNWINDING when oiChange < 0 and priceChange < 0', () => {
    expect(classifyOITrend(-500, -0.9)).toBe('LONG_UNWINDING');
  });
});

describe('computeCostOfCarry (C.7)', () => {
  it('returns annualised percentage for known inputs', () => {
    // Futures at 10100, spot at 10000, 30 days to expiry
    // (100/10000) * (365/30) * 100 = 0.01 * 12.1667 * 100 = 12.1667%
    const coc = computeCostOfCarry(10000, 10100, 30);
    expect(coc).toBeCloseTo(12.1667, 2);
  });

  it('returns negative (backwardation) when futures < spot', () => {
    const coc = computeCostOfCarry(10000, 9900, 30);
    expect(coc).toBeLessThan(0);
  });

  it('returns 0 when daysToExpiry <= 0', () => {
    expect(computeCostOfCarry(100, 101, 0)).toBe(0);
  });

  it('returns 0 when spotPrice is non-positive', () => {
    expect(computeCostOfCarry(0, 100, 30)).toBe(0);
  });
});

describe('classifyPCR', () => {
  it('bearish when pcr < 0.7', () => expect(classifyPCR(0.5)).toBe('bearish'));
  it('bullish when pcr > 1.0', () => expect(classifyPCR(1.3)).toBe('bullish'));
  it('neutral in [0.7, 1.0]', () => {
    expect(classifyPCR(0.7)).toBe('neutral');
    expect(classifyPCR(0.9)).toBe('neutral');
    expect(classifyPCR(1.0)).toBe('neutral');
  });
});
