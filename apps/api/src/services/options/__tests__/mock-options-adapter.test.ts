import { describe, it, expect } from 'vitest';
import { MockOptionChainAdapter } from '../mock-options-adapter';

const adapter = new MockOptionChainAdapter();

describe('MockOptionChainAdapter', () => {
  it('returns supported symbols list including NIFTY and BANKNIFTY', () => {
    const symbols = adapter.getSupportedSymbols();
    expect(symbols).toContain('NIFTY');
    expect(symbols).toContain('BANKNIFTY');
    expect(symbols.length).toBeGreaterThan(5);
  });

  describe('getAvailableExpiries', () => {
    it('returns 8 weekly expiries for NIFTY', async () => {
      const expiries = await adapter.getAvailableExpiries('NIFTY');
      expect(expiries).toHaveLength(8);
    });

    it('returns 4 expiries for RELIANCE', async () => {
      const expiries = await adapter.getAvailableExpiries('RELIANCE');
      expect(expiries).toHaveLength(4);
    });

    it('expiry dates are in YYYY-MM-DD format', async () => {
      const expiries = await adapter.getAvailableExpiries('NIFTY');
      for (const e of expiries) {
        expect(e).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('all expiries are Thursdays', async () => {
      const expiries = await adapter.getAvailableExpiries('NIFTY');
      for (const e of expiries) {
        const day = new Date(e).getUTCDay();
        expect(day).toBe(4); // Thursday
      }
    });
  });

  describe('getOptionChain', () => {
    it('returns a chain for NIFTY', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      expect(chain.symbol).toBe('NIFTY');
      expect(chain.underlyingPrice).toBeGreaterThan(0);
      expect(chain.strikes.length).toBe(25); // 12 below + ATM + 12 above
    });

    it('ATM strike is close to underlying price', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      expect(Math.abs(chain.atmStrike - chain.underlyingPrice)).toBeLessThan(50);
    });

    it('exactly one strike is marked isATM', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      const atmStrikes = chain.strikes.filter((s) => s.isATM);
      expect(atmStrikes).toHaveLength(1);
    });

    it('PCR is a positive number', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      expect(chain.pcrOI).toBeGreaterThan(0);
    });

    it('max pain strike is within the strike range', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      const strikePrices = chain.strikes.map((s) => s.strikePrice);
      expect(strikePrices).toContain(chain.maxPainStrike);
    });

    it('ivPercentile is between 0 and 100', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      expect(chain.ivPercentile).toBeGreaterThanOrEqual(0);
      expect(chain.ivPercentile).toBeLessThanOrEqual(100);
    });

    it('every call strike has delta 0..1', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      for (const row of chain.strikes) {
        expect(row.call.delta).toBeGreaterThanOrEqual(-0.001); // allow tiny float errors
        expect(row.call.delta).toBeLessThanOrEqual(1.001);
      }
    });

    it('every put strike has delta -1..0', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      for (const row of chain.strikes) {
        expect(row.put.delta).toBeGreaterThanOrEqual(-1.001);
        expect(row.put.delta).toBeLessThanOrEqual(0.001);
      }
    });

    it('lot size is correct for NIFTY', async () => {
      const chain = await adapter.getOptionChain('NIFTY');
      expect(chain.lotSize).toBe(50);
    });

    it('lot size is correct for BANKNIFTY', async () => {
      const chain = await adapter.getOptionChain('BANKNIFTY');
      expect(chain.lotSize).toBe(15);
    });

    it('accepts a custom expiry from the available list', async () => {
      const expiries = await adapter.getAvailableExpiries('NIFTY');
      const chain = await adapter.getOptionChain('NIFTY', expiries[1]);
      expect(chain.expiry).toBe(expiries[1]);
    });

    it('falls back to nearest expiry when given expiry is not in list', async () => {
      const expiries = await adapter.getAvailableExpiries('NIFTY');
      const chain = await adapter.getOptionChain('NIFTY', '2099-12-31');
      expect(chain.expiry).toBe(expiries[0]);
    });

    it('returns a chain for RELIANCE stock options', async () => {
      const chain = await adapter.getOptionChain('RELIANCE');
      expect(chain.symbol).toBe('RELIANCE');
      expect(chain.lotSize).toBe(250);
    });
  });
});
