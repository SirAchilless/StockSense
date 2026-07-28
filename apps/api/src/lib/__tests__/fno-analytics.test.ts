import { describe, it, expect } from 'vitest';
import {
  computeRolloverMetrics,
  computeCostOfCarry,
  computeFiiDerSummary,
  computeParticipantMetrics,
} from '../fno-analytics';
import type { FiiDerPositionDay, ParticipantOIRow } from '../../services/fno/types';

// ── computeCostOfCarry ────────────────────────────────────────────────────────

describe('computeCostOfCarry', () => {
  it('returns positive value for contango (futures > spot)', () => {
    const coc = computeCostOfCarry(22510, 22453, 7);
    expect(coc).toBeGreaterThan(0);
  });

  it('returns negative value for backwardation (futures < spot)', () => {
    const coc = computeCostOfCarry(22400, 22453, 7);
    expect(coc).toBeLessThan(0);
  });

  it('returns 0 when spot is 0', () => {
    expect(computeCostOfCarry(22453, 0, 7)).toBe(0);
  });

  it('returns 0 when daysToExpiry is 0', () => {
    expect(computeCostOfCarry(22510, 22453, 0)).toBe(0);
  });

  it('annualises correctly: 1% 30-day basis ≈ 12.17% annualised', () => {
    const spot = 10000;
    const futures = spot * 1.01; // 1% premium
    const coc = computeCostOfCarry(futures, spot, 30);
    expect(Math.abs(coc - 12.17)).toBeLessThan(0.5);
  });
});

// ── computeRolloverMetrics ────────────────────────────────────────────────────

describe('computeRolloverMetrics', () => {
  const base = {
    symbol: 'NIFTY',
    spotPrice: 22453,
    currentExpiry: '2026-07-31',
    nextExpiry: '2026-08-28',
    daysToCurrentExpiry: 3,
    currentMonthOI: 400_000,
    nextMonthOI: 600_000,
    currentMonthCoC: 4.2,
    nextMonthCoC: 5.1,
    threeMonthAvgRollover: 67.4,
    allExpiries: [],
  };

  it('computes total OI as sum of current + next', () => {
    const m = computeRolloverMetrics(base);
    expect(m.totalFuturesOI).toBe(1_000_000);
  });

  it('computes rollover percent correctly', () => {
    const m = computeRolloverMetrics(base);
    expect(m.rolloverPercent).toBeCloseTo(60, 1);
  });

  it('rollover vs avg diff is rollover - avg', () => {
    const m = computeRolloverMetrics(base);
    expect(m.rolloverVsAvgDiff).toBeCloseTo(60 - 67.4, 1);
  });

  it('handles zero total OI gracefully', () => {
    const m = computeRolloverMetrics({ ...base, currentMonthOI: 0, nextMonthOI: 0 });
    expect(m.rolloverPercent).toBe(0);
    expect(m.totalFuturesOI).toBe(0);
  });

  it('rolloverPercent is 0..100', () => {
    const m = computeRolloverMetrics(base);
    expect(m.rolloverPercent).toBeGreaterThanOrEqual(0);
    expect(m.rolloverPercent).toBeLessThanOrEqual(100);
  });

  it('passes through symbol and spot price', () => {
    const m = computeRolloverMetrics(base);
    expect(m.symbol).toBe('NIFTY');
    expect(m.spotPrice).toBe(22453);
  });
});

// ── computeFiiDerSummary ──────────────────────────────────────────────────────

function makeDayStub(date: string, fiiNetFut = 2000, diiNetFut = 500): FiiDerPositionDay {
  return {
    date,
    fiiIndexFutLongOI: 280_000,
    fiiIndexFutShortOI: 240_000,
    fiiIndexFutNetOI: 40_000,
    fiiIndexFutNetBuy: fiiNetFut,
    fiiStockFutLongOI: 420_000,
    fiiStockFutShortOI: 380_000,
    fiiStockFutNetOI: 40_000,
    fiiStockFutNetBuy: 1000,
    fiiIndexCallOI: 180_000,
    fiiIndexPutOI: 210_000,
    fiiIndexOptNetBuy: 300,
    fiiStockOptNetBuy: 100,
    diiIndexFutLongOI: 120_000,
    diiIndexFutShortOI: 110_000,
    diiIndexFutNetOI: 10_000,
    diiIndexFutNetBuy: diiNetFut,
  };
}

describe('computeFiiDerSummary', () => {
  it('returns empty summary for empty series', () => {
    const s = computeFiiDerSummary([]);
    expect(s.latestDate).toBe('');
    expect(s.fiiNetFuturesBuy5d).toBe(0);
  });

  it('latestDate is the last date in series', () => {
    const series = [makeDayStub('2026-07-24'), makeDayStub('2026-07-25')];
    const s = computeFiiDerSummary(series);
    expect(s.latestDate).toBe('2026-07-25');
  });

  it('5d net buy sums last 5 sessions', () => {
    const series = Array.from({ length: 7 }, (_, i) =>
      makeDayStub(`2026-07-${String(i + 20).padStart(2, '0')}`, 1000, 200),
    );
    const s = computeFiiDerSummary(series);
    // last 5 days: fiiIndexFutNetBuy + fiiStockFutNetBuy = 1000 + 1000 = 2000 each day × 5
    expect(s.fiiNetFuturesBuy5d).toBeCloseTo(10_000, 0);
    expect(s.diiNetFuturesBuy5d).toBeCloseTo(1_000, 0);
  });

  it('latestFiiIndexPCR is putOI / callOI', () => {
    const series = [makeDayStub('2026-07-25')];
    const s = computeFiiDerSummary(series);
    // 210_000 / 180_000
    expect(s.latestFiiIndexPCR).toBeCloseTo(210_000 / 180_000, 3);
  });

  it('PCR is 0 when callOI is 0', () => {
    const day = makeDayStub('2026-07-25');
    day.fiiIndexCallOI = 0;
    const s = computeFiiDerSummary([day]);
    expect(s.latestFiiIndexPCR).toBe(0);
  });
});

// ── computeParticipantMetrics ─────────────────────────────────────────────────

function makeParticipantRows(): ParticipantOIRow[] {
  return [
    {
      category: 'FII',
      indexFutLong: 284_000, indexFutShort: 238_000, indexFutNetLong: 46_000,
      stockFutLong: 425_000, stockFutShort: 378_000, stockFutNetLong: 47_000,
      indexCallOI: 182_000, indexPutOI: 214_000, stockCallOI: 95_000, stockPutOI: 88_000,
    },
    {
      category: 'DII',
      indexFutLong: 122_000, indexFutShort: 108_000, indexFutNetLong: 14_000,
      stockFutLong: 98_000, stockFutShort: 91_000, stockFutNetLong: 7_000,
      indexCallOI: 42_000, indexPutOI: 38_000, stockCallOI: 28_000, stockPutOI: 24_000,
    },
    {
      category: 'PRO',
      indexFutLong: 380_000, indexFutShort: 392_000, indexFutNetLong: -12_000,
      stockFutLong: 560_000, stockFutShort: 574_000, stockFutNetLong: -14_000,
      indexCallOI: 620_000, indexPutOI: 580_000, stockCallOI: 310_000, stockPutOI: 295_000,
    },
    {
      category: 'CLIENT',
      indexFutLong: 890_000, indexFutShort: 938_000, indexFutNetLong: -48_000,
      stockFutLong: 1_240_000, stockFutShort: 1_295_000, stockFutNetLong: -55_000,
      indexCallOI: 1_100_000, indexPutOI: 1_050_000, stockCallOI: 680_000, stockPutOI: 640_000,
    },
  ];
}

describe('computeParticipantMetrics', () => {
  it('computes FII long/short ratio correctly', () => {
    const m = computeParticipantMetrics(makeParticipantRows());
    expect(m.fiiLongShortRatio).toBeCloseTo(284_000 / 238_000, 3);
  });

  it('computes FII net long pct correctly', () => {
    const m = computeParticipantMetrics(makeParticipantRows());
    const totalFii = 284_000 + 238_000;
    expect(m.fiiNetLongPct).toBeCloseTo((46_000 / totalFii) * 100, 1);
  });

  it('detects contra signal when FII long and CLIENT short', () => {
    const rows = makeParticipantRows();
    // FII net long = 46_000 > 0, CLIENT net long = -48_000 < -1000 → contra = true
    const m = computeParticipantMetrics(rows);
    expect(m.clientVsFiiContra).toBe(true);
  });

  it('no contra when both same direction', () => {
    const rows = makeParticipantRows();
    const fii = rows.find((r) => r.category === 'FII')!;
    fii.indexFutNetLong = -5_000; // flip FII to net short
    const m = computeParticipantMetrics(rows);
    // FII net long = -5000 < 0, CLIENT net long = -48000 < 0 → same direction
    expect(m.clientVsFiiContra).toBe(false);
  });

  it('handles missing FII row gracefully', () => {
    const rows = makeParticipantRows().filter((r) => r.category !== 'FII');
    const m = computeParticipantMetrics(rows);
    expect(m.fiiLongShortRatio).toBe(0);
    expect(m.fiiNetLongPct).toBe(0);
  });

  it('proNetLong reflects PRO net position', () => {
    const m = computeParticipantMetrics(makeParticipantRows());
    expect(m.proNetLong).toBe(-12_000);
  });
});
