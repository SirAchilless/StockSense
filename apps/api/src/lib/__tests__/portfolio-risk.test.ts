import { describe, it, expect } from 'vitest';
import {
  calculatePortfolioRisk,
  flagHolding,
  riskLevelFromScore,
  type RiskHoldingInput,
} from '../portfolio-risk';

describe('flagHolding', () => {
  it('flags strong at or above +10%', () => {
    expect(flagHolding(10)).toBe('strong');
    expect(flagHolding(25.5)).toBe('strong');
  });
  it('flags weak at or below -10%', () => {
    expect(flagHolding(-10)).toBe('weak');
    expect(flagHolding(-42)).toBe('weak');
  });
  it('flags neutral in between', () => {
    expect(flagHolding(0)).toBe('neutral');
    expect(flagHolding(9.9)).toBe('neutral');
    expect(flagHolding(-9.9)).toBe('neutral');
  });
});

describe('riskLevelFromScore', () => {
  it('maps score bands to levels', () => {
    expect(riskLevelFromScore(0)).toBe('low');
    expect(riskLevelFromScore(33)).toBe('low');
    expect(riskLevelFromScore(34)).toBe('moderate');
    expect(riskLevelFromScore(66)).toBe('moderate');
    expect(riskLevelFromScore(67)).toBe('high');
    expect(riskLevelFromScore(100)).toBe('high');
  });
});

describe('calculatePortfolioRisk', () => {
  it('returns empty, low-risk metrics for no holdings', () => {
    const m = calculatePortfolioRisk([]);
    expect(m.holdingCount).toBe(0);
    expect(m.riskScore).toBe(0);
    expect(m.diversificationScore).toBe(0);
    expect(m.riskLevel).toBe('low');
    expect(m.holdings).toEqual([]);
  });

  it('scores a single-holding portfolio as maximally concentrated / risky', () => {
    const holdings: RiskHoldingInput[] = [
      { symbol: 'TCS', currentValue: 100000, unrealizedPnLPct: 12, sector: 'Information Technology' },
    ];
    const m = calculatePortfolioRisk(holdings);
    expect(m.concentrationHHI).toBeCloseTo(1);
    expect(m.sectorHHI).toBeCloseTo(1);
    expect(m.largestPositionPct).toBeCloseTo(100);
    expect(m.diversificationScore).toBe(0);
    expect(m.riskScore).toBe(100);
    expect(m.riskLevel).toBe('high');
    expect(m.holdings[0].flag).toBe('strong');
    expect(m.effectiveHoldings).toBeCloseTo(1);
  });

  it('computes weights, HHI and effective holdings for an equal 4-name, 4-sector book', () => {
    const holdings: RiskHoldingInput[] = [
      { symbol: 'TCS', currentValue: 25000, unrealizedPnLPct: 5, sector: 'IT' },
      { symbol: 'HDFCBANK', currentValue: 25000, unrealizedPnLPct: -3, sector: 'Banking' },
      { symbol: 'RELIANCE', currentValue: 25000, unrealizedPnLPct: 15, sector: 'Energy' },
      { symbol: 'SUNPHARMA', currentValue: 25000, unrealizedPnLPct: -12, sector: 'Pharma' },
    ];
    const m = calculatePortfolioRisk(holdings);
    // Each weight = 0.25 → HHI = 4 * 0.0625 = 0.25
    expect(m.concentrationHHI).toBeCloseTo(0.25);
    expect(m.sectorHHI).toBeCloseTo(0.25);
    expect(m.largestPositionPct).toBeCloseTo(25);
    expect(m.effectiveHoldings).toBeCloseTo(4);
    // diversification = (1-0.25)*60 + (1-0.25)*40 = 45 + 30 = 75
    expect(m.diversificationScore).toBe(75);
    // risk = 0.25*45 + 0.25*30 + 0.25*25 = 11.25 + 7.5 + 6.25 = 25 → low
    expect(m.riskScore).toBe(25);
    expect(m.riskLevel).toBe('low');
    expect(m.sectorCount).toBe(4);
  });

  it('treats a null sector as Unknown and aggregates sector weights', () => {
    const holdings: RiskHoldingInput[] = [
      { symbol: 'A', currentValue: 60000, unrealizedPnLPct: 0, sector: 'IT' },
      { symbol: 'B', currentValue: 30000, unrealizedPnLPct: 0, sector: 'IT' },
      { symbol: 'C', currentValue: 10000, unrealizedPnLPct: 0, sector: null },
    ];
    const m = calculatePortfolioRisk(holdings);
    const it = m.sectorAllocation.find((s) => s.sector === 'IT');
    const unknown = m.sectorAllocation.find((s) => s.sector === 'Unknown');
    expect(it?.weightPct).toBeCloseTo(90);
    expect(unknown?.weightPct).toBeCloseTo(10);
    // Holdings sorted by weight desc → largest first
    expect(m.holdings[0].symbol).toBe('A');
    expect(m.largestPositionPct).toBeCloseTo(60);
  });

  it('a concentrated book scores riskier than a spread one', () => {
    const concentrated = calculatePortfolioRisk([
      { symbol: 'A', currentValue: 90000, unrealizedPnLPct: 0, sector: 'IT' },
      { symbol: 'B', currentValue: 10000, unrealizedPnLPct: 0, sector: 'IT' },
    ]);
    const spread = calculatePortfolioRisk([
      { symbol: 'A', currentValue: 20000, unrealizedPnLPct: 0, sector: 'IT' },
      { symbol: 'B', currentValue: 20000, unrealizedPnLPct: 0, sector: 'Banking' },
      { symbol: 'C', currentValue: 20000, unrealizedPnLPct: 0, sector: 'Energy' },
      { symbol: 'D', currentValue: 20000, unrealizedPnLPct: 0, sector: 'Pharma' },
      { symbol: 'E', currentValue: 20000, unrealizedPnLPct: 0, sector: 'FMCG' },
    ]);
    expect(concentrated.riskScore).toBeGreaterThan(spread.riskScore);
    expect(spread.diversificationScore).toBeGreaterThan(concentrated.diversificationScore);
  });
});
