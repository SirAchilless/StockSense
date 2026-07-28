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
});
