import { describe, it, expect } from 'vitest';
import { MockFnoAdapter } from '../mock-fno-adapter';

const adapter = new MockFnoAdapter();

describe('MockFnoAdapter', () => {
  it('returns supported symbols including NIFTY and BANKNIFTY', () => {
    const syms = adapter.getSupportedSymbols();
    expect(syms).toContain('NIFTY');
    expect(syms).toContain('BANKNIFTY');
    expect(syms.length).toBeGreaterThan(10);
  });

  describe('getRolloverData', () => {
    it('returns a valid rollover object for NIFTY', async () => {
      const r = await adapter.getRolloverData('NIFTY');
      expect(r.symbol).toBe('NIFTY');
      expect(r.spotPrice).toBeGreaterThan(0);
    });

    it('rolloverPercent is between 0 and 100', async () => {
      const r = await adapter.getRolloverData('NIFTY');
      expect(r.rolloverPercent).toBeGreaterThanOrEqual(0);
      expect(r.rolloverPercent).toBeLessThanOrEqual(100);
    });

    it('totalFuturesOI = currentMonthOI + nextMonthOI', async () => {
      const r = await adapter.getRolloverData('NIFTY');
      expect(r.totalFuturesOI).toBeCloseTo(r.currentMonthOI + r.nextMonthOI, 0);
    });

    it('threeMonthAvgRollover is positive', async () => {
      const r = await adapter.getRolloverData('NIFTY');
      expect(r.threeMonthAvgRollover).toBeGreaterThan(0);
    });

    it('daysToCurrentExpiry is non-negative', async () => {
      const r = await adapter.getRolloverData('NIFTY');
      expect(r.daysToCurrentExpiry).toBeGreaterThanOrEqual(0);
    });

    it('allExpiries has at least 3 entries', async () => {
      const r = await adapter.getRolloverData('NIFTY');
      expect(r.allExpiries.length).toBeGreaterThanOrEqual(3);
    });

    it('each allExpiry has valid OI and ltp', async () => {
      const r = await adapter.getRolloverData('NIFTY');
      for (const e of r.allExpiries) {
        expect(e.openInterest).toBeGreaterThanOrEqual(0);
        expect(e.ltp).toBeGreaterThan(0);
      }
    });

    it('costOfCarryCurrent and Next are numbers', async () => {
      const r = await adapter.getRolloverData('BANKNIFTY');
      expect(typeof r.costOfCarryCurrent).toBe('number');
      expect(typeof r.costOfCarryNext).toBe('number');
    });

    it('works for a stock symbol (RELIANCE)', async () => {
      const r = await adapter.getRolloverData('RELIANCE');
      expect(r.symbol).toBe('RELIANCE');
      expect(r.spotPrice).toBeGreaterThan(0);
    });

    it('dataAsOf is an ISO timestamp', async () => {
      const r = await adapter.getRolloverData('NIFTY');
      expect(() => new Date(r.dataAsOf)).not.toThrow();
    });
  });

  describe('getFiiDerPositions', () => {
    it('returns a series with trading days', async () => {
      const f = await adapter.getFiiDerPositions();
      expect(f.series.length).toBeGreaterThan(0);
    });

    it('latestDate is a date string', async () => {
      const f = await adapter.getFiiDerPositions();
      expect(f.latestDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('fiiNetFuturesBuy5d is a number', async () => {
      const f = await adapter.getFiiDerPositions();
      expect(typeof f.fiiNetFuturesBuy5d).toBe('number');
    });

    it('latestFiiIndexFutNetOI is an integer', async () => {
      const f = await adapter.getFiiDerPositions();
      expect(Number.isFinite(f.latestFiiIndexFutNetOI)).toBe(true);
    });

    it('latestFiiIndexPCR is a positive number', async () => {
      const f = await adapter.getFiiDerPositions();
      expect(f.latestFiiIndexPCR).toBeGreaterThan(0);
    });

    it('each series day has fiiIndexFutLongOI > 0', async () => {
      const f = await adapter.getFiiDerPositions();
      for (const d of f.series) {
        expect(d.fiiIndexFutLongOI).toBeGreaterThan(0);
      }
    });
  });

  describe('getParticipantOI', () => {
    it('returns 4 participant categories', async () => {
      const p = await adapter.getParticipantOI();
      expect(p.rows.length).toBe(4);
    });

    it('categories are FII, DII, PRO, CLIENT', async () => {
      const p = await adapter.getParticipantOI();
      const cats = p.rows.map((r) => r.category).sort();
      expect(cats).toEqual(['CLIENT', 'DII', 'FII', 'PRO']);
    });

    it('every row has positive long and short OI', async () => {
      const p = await adapter.getParticipantOI();
      for (const r of p.rows) {
        expect(r.indexFutLong).toBeGreaterThan(0);
        expect(r.indexFutShort).toBeGreaterThan(0);
      }
    });

    it('FII index futures netLong = long - short', async () => {
      const p = await adapter.getParticipantOI();
      const fii = p.rows.find((r) => r.category === 'FII')!;
      expect(fii.indexFutNetLong).toBe(fii.indexFutLong - fii.indexFutShort);
    });

    it('date is a YYYY-MM-DD string', async () => {
      const p = await adapter.getParticipantOI();
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getCostOfCarry', () => {
    it('returns array with at least 2 expiries for NIFTY', async () => {
      const items = await adapter.getCostOfCarry('NIFTY');
      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    it('each item has positive spotPrice and futuresPrice', async () => {
      const items = await adapter.getCostOfCarry('BANKNIFTY');
      for (const item of items) {
        expect(item.spotPrice).toBeGreaterThan(0);
        expect(item.futuresPrice).toBeGreaterThan(0);
      }
    });

    it('costOfCarryPct is a number', async () => {
      const items = await adapter.getCostOfCarry('NIFTY');
      for (const item of items) {
        expect(typeof item.costOfCarryPct).toBe('number');
      }
    });
  });

  describe('getOITrends', () => {
    it('returns array of OI trends for NIFTY', async () => {
      const trends = await adapter.getOITrends('NIFTY');
      expect(trends.length).toBeGreaterThan(0);
    });

    it('each trend has a valid classification', async () => {
      const trends = await adapter.getOITrends('NIFTY');
      const valid = ['LONG_BUILDUP', 'SHORT_BUILDUP', 'LONG_UNWINDING', 'SHORT_UNWINDING'];
      for (const t of trends) {
        expect(valid).toContain(t.classification);
      }
    });

    it('oiChange = currentOI - previousOI', async () => {
      const trends = await adapter.getOITrends('NIFTY');
      for (const t of trends) {
        expect(t.oiChange).toBeCloseTo(t.currentOI - t.previousOI, 0);
      }
    });
  });

  describe('getPCR', () => {
    it('returns PCRData with positive pcrOI for NIFTY', async () => {
      const pcr = await adapter.getPCR('NIFTY');
      expect(pcr.symbol).toBe('NIFTY');
      expect(pcr.pcrOI).toBeGreaterThan(0);
    });

    it('pcrOI and pcrVolume are numbers', async () => {
      const pcr = await adapter.getPCR('BANKNIFTY');
      expect(typeof pcr.pcrOI).toBe('number');
      expect(typeof pcr.pcrVolume).toBe('number');
    });

    it('expiry defaults to ALL when not provided', async () => {
      const pcr = await adapter.getPCR('NIFTY');
      expect(pcr.expiry).toBe('ALL');
    });
  });

  describe('getMarketWidePCR', () => {
    it('returns PCR for all index symbols', async () => {
      const pcrs = await adapter.getMarketWidePCR();
      expect(pcrs.length).toBeGreaterThanOrEqual(4);
    });

    it('all symbols are known index symbols', async () => {
      const pcrs = await adapter.getMarketWidePCR();
      const indexSyms = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];
      for (const p of pcrs) {
        expect(indexSyms).toContain(p.symbol);
      }
    });
  });

  describe('getMarketWideRollover', () => {
    it('returns rollover data for all supported symbols', async () => {
      const rollovers = await adapter.getMarketWideRollover();
      expect(rollovers.length).toBe(adapter.getSupportedSymbols().length);
    });

    it('each rollover has a valid rolloverPercent', async () => {
      const rollovers = await adapter.getMarketWideRollover();
      for (const r of rollovers) {
        expect(r.rolloverPercent).toBeGreaterThanOrEqual(0);
        expect(r.rolloverPercent).toBeLessThanOrEqual(100);
      }
    });
  });
});
