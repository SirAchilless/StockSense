import { describe, it, expect } from 'vitest';
import { calculateHoldingPnL, calculatePortfolioSummary } from '../pnl';

describe('calculateHoldingPnL', () => {
  it('computes gain correctly', () => {
    const result = calculateHoldingPnL({
      symbol: 'RELIANCE', quantity: 10, buyPrice: 2000, currentPrice: 2500
    });
    expect(result.invested).toBe(20000);
    expect(result.currentValue).toBe(25000);
    expect(result.unrealizedPnL).toBe(5000);
    expect(result.unrealizedPnLPct).toBeCloseTo(25);
  });

  it('computes loss correctly', () => {
    const result = calculateHoldingPnL({
      symbol: 'TCS', quantity: 5, buyPrice: 4000, currentPrice: 3500
    });
    expect(result.unrealizedPnL).toBe(-2500);
    expect(result.unrealizedPnLPct).toBeCloseTo(-12.5);
  });

  it('computes daily change when previousClose provided', () => {
    const result = calculateHoldingPnL({
      symbol: 'INFY', quantity: 20, buyPrice: 1500, currentPrice: 1600, previousClose: 1550
    });
    expect(result.dailyChange).toBe(1000); // 20 * (1600 - 1550)
  });

  it('daily change is 0 when previousClose not provided', () => {
    const result = calculateHoldingPnL({
      symbol: 'WIPRO', quantity: 10, buyPrice: 500, currentPrice: 520
    });
    expect(result.dailyChange).toBe(0);
  });
});

describe('calculatePortfolioSummary', () => {
  it('aggregates multiple holdings correctly', () => {
    const holdings = [
      calculateHoldingPnL({ symbol: 'A', quantity: 10, buyPrice: 100, currentPrice: 120 }),
      calculateHoldingPnL({ symbol: 'B', quantity: 5, buyPrice: 200, currentPrice: 180 }),
    ];
    const summary = calculatePortfolioSummary(holdings);
    expect(summary.totalInvested).toBe(2000);    // 1000 + 1000
    expect(summary.currentValue).toBe(2100);     // 1200 + 900
    expect(summary.totalPnL).toBe(100);
    expect(summary.totalPnLPct).toBeCloseTo(5);
  });
});
