import { describe, it, expect } from 'vitest';
import {
  blackScholes,
  impliedVolatility,
  computeMaxPain,
  computePCR,
  computeIVPercentile,
  findATMStrike,
  strikeInterval,
} from '../options-greeks';

// ── Black-Scholes ──────────────────────────────────────────────────────────────

describe('blackScholes', () => {
  const base = {
    underlyingPrice: 22000,
    strikePrice: 22000,
    timeToExpiry: 7 / 365,
    riskFreeRate: 0.065,
    volatility: 0.15,
  };

  it('ATM call and put satisfy put-call parity', () => {
    const call = blackScholes({ ...base, optionType: 'call' });
    const put = blackScholes({ ...base, optionType: 'put' });
    // C - P = S - K * e^(-rT)
    const discountedK = base.strikePrice * Math.exp(-base.riskFreeRate * base.timeToExpiry);
    const pcp = call.price - put.price;
    const expected = base.underlyingPrice - discountedK;
    expect(Math.abs(pcp - expected)).toBeLessThan(0.01);
  });

  it('ATM call delta is approximately 0.5', () => {
    const call = blackScholes({ ...base, optionType: 'call' });
    expect(call.delta).toBeGreaterThan(0.45);
    expect(call.delta).toBeLessThan(0.55);
  });

  it('ATM put delta is approximately -0.5', () => {
    const put = blackScholes({ ...base, optionType: 'put' });
    expect(put.delta).toBeGreaterThan(-0.55);
    expect(put.delta).toBeLessThan(-0.45);
  });

  it('call delta + |put delta| = 1 (for same strike)', () => {
    const call = blackScholes({ ...base, optionType: 'call' });
    const put = blackScholes({ ...base, optionType: 'put' });
    expect(Math.abs(call.delta + Math.abs(put.delta) - 1)).toBeLessThan(0.001);
  });

  it('deep ITM call has delta close to 1', () => {
    const call = blackScholes({ ...base, strikePrice: 18000, optionType: 'call' });
    expect(call.delta).toBeGreaterThan(0.95);
  });

  it('deep OTM call has delta close to 0', () => {
    const call = blackScholes({ ...base, strikePrice: 26000, optionType: 'call' });
    expect(call.delta).toBeLessThan(0.05);
  });

  it('theta is negative for both call and put', () => {
    const call = blackScholes({ ...base, optionType: 'call' });
    const put = blackScholes({ ...base, optionType: 'put' });
    expect(call.theta).toBeLessThan(0);
    expect(put.theta).toBeLessThan(0);
  });

  it('vega is positive for both call and put', () => {
    const call = blackScholes({ ...base, optionType: 'call' });
    const put = blackScholes({ ...base, optionType: 'put' });
    expect(call.vega).toBeGreaterThan(0);
    expect(put.vega).toBeGreaterThan(0);
  });

  it('gamma is positive for both call and put', () => {
    const call = blackScholes({ ...base, optionType: 'call' });
    const put = blackScholes({ ...base, optionType: 'put' });
    expect(call.gamma).toBeGreaterThan(0);
    expect(put.gamma).toBeGreaterThan(0);
  });

  it('returns intrinsic value when T = 0', () => {
    const call = blackScholes({ ...base, strikePrice: 21000, timeToExpiry: 0, optionType: 'call' });
    expect(call.price).toBe(1000); // S - K = 22000 - 21000
  });

  it('iv field reflects input volatility in percent', () => {
    const call = blackScholes({ ...base, volatility: 0.18, optionType: 'call' });
    expect(call.iv).toBeCloseTo(18, 1);
  });
});

// ── Implied Volatility ────────────────────────────────────────────────────────

describe('impliedVolatility', () => {
  it('recovers input volatility from Black-Scholes price', () => {
    const sigma = 0.15;
    const g = blackScholes({
      underlyingPrice: 22000, strikePrice: 22000,
      timeToExpiry: 7 / 365, riskFreeRate: 0.065,
      volatility: sigma, optionType: 'call',
    });
    const recovered = impliedVolatility(g.price, 22000, 22000, 7 / 365, 0.065, 'call');
    expect(recovered).not.toBeNull();
    expect(Math.abs(recovered! - 15)).toBeLessThan(0.1);
  });

  it('returns null for zero market price', () => {
    expect(impliedVolatility(0, 22000, 22000, 7 / 365, 0.065, 'call')).toBeNull();
  });

  it('returns null for expired option', () => {
    expect(impliedVolatility(100, 22000, 22000, 0, 0.065, 'call')).toBeNull();
  });
});

// ── Max Pain ──────────────────────────────────────────────────────────────────

describe('computeMaxPain', () => {
  it('returns the strike with minimum total payout to option holders', () => {
    // Scenario: concentrated OI at 22000
    const strikes = [
      { strikePrice: 21500, callOI: 500, putOI: 5000 },
      { strikePrice: 22000, callOI: 3000, putOI: 3000 },
      { strikePrice: 22500, callOI: 5000, putOI: 500 },
    ];
    const mp = computeMaxPain(strikes);
    // Max pain should be at 22000 where call and put OI are balanced
    expect(mp).toBe(22000);
  });

  it('returns 0 for empty input', () => {
    expect(computeMaxPain([])).toBe(0);
  });

  it('returns the single strike for single-element input', () => {
    expect(computeMaxPain([{ strikePrice: 22000, callOI: 100, putOI: 100 }])).toBe(22000);
  });
});

// ── PCR ───────────────────────────────────────────────────────────────────────

describe('computePCR', () => {
  it('calculates PCR correctly', () => {
    expect(computePCR(150000, 100000)).toBeCloseTo(1.5, 3);
  });

  it('returns 0 when callOI is 0', () => {
    expect(computePCR(150000, 0)).toBe(0);
  });
});

// ── IV Percentile ─────────────────────────────────────────────────────────────

describe('computeIVPercentile', () => {
  it('returns 50 when IV is at midpoint', () => {
    expect(computeIVPercentile(15, 10, 20)).toBe(50);
  });

  it('returns 0 at low end', () => {
    expect(computeIVPercentile(10, 10, 20)).toBe(0);
  });

  it('returns 100 at high end', () => {
    expect(computeIVPercentile(20, 10, 20)).toBe(100);
  });

  it('clamps above 100', () => {
    expect(computeIVPercentile(25, 10, 20)).toBe(100);
  });

  it('returns 50 when range is degenerate', () => {
    expect(computeIVPercentile(15, 15, 15)).toBe(50);
  });
});

// ── ATM Strike ────────────────────────────────────────────────────────────────

describe('findATMStrike', () => {
  it('rounds to nearest 50 for NIFTY-style interval', () => {
    expect(findATMStrike(22453, 50)).toBe(22450);
    expect(findATMStrike(22476, 50)).toBe(22500);
  });

  it('rounds to nearest 100 for BANKNIFTY-style interval', () => {
    expect(findATMStrike(48321, 100)).toBe(48300);
    expect(findATMStrike(48380, 100)).toBe(48400);
  });
});

// ── Strike Interval ───────────────────────────────────────────────────────────

describe('strikeInterval', () => {
  it('returns 50 for NIFTY', () => expect(strikeInterval('NIFTY')).toBe(50));
  it('returns 100 for BANKNIFTY', () => expect(strikeInterval('BANKNIFTY')).toBe(100));
  it('returns 20 for stock options', () => expect(strikeInterval('RELIANCE')).toBe(20));
});
