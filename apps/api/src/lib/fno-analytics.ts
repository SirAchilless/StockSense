// F&O analytics — deterministic computations for Phase 3.2
//
// All numeric metrics (rollover %, cost of carry, FII net OI, participant
// positioning ratios) are computed HERE, never by the AI layer.  The AI only
// narrates over these grounded numbers — scenario-framed, never directive.

import type { FuturesOI, RolloverData, FiiDerPositionDay, FiiDerPositionSummary, ParticipantOIRow, ParticipantOIData } from '../services/fno/types';

// ── Rollover analytics ────────────────────────────────────────────────────────

export interface RolloverInput {
  symbol: string;
  spotPrice: number;
  currentExpiry: string;
  nextExpiry: string;
  daysToCurrentExpiry: number;
  currentMonthOI: number;   // expiring month OI (contracts)
  nextMonthOI: number;
  currentMonthCoC: number;  // annualised cost of carry (current)
  nextMonthCoC: number;
  threeMonthAvgRollover: number; // 3-month historical average rollover %
  allExpiries: FuturesOI[];
}

export function computeRolloverMetrics(input: RolloverInput): Omit<RolloverData, 'dataAsOf'> {
  const totalFuturesOI = input.currentMonthOI + input.nextMonthOI;
  const rolloverPercent =
    totalFuturesOI > 0 ? +((input.nextMonthOI / totalFuturesOI) * 100).toFixed(2) : 0;
  const rolloverVsAvgDiff = +(rolloverPercent - input.threeMonthAvgRollover).toFixed(2);

  return {
    symbol: input.symbol,
    spotPrice: input.spotPrice,
    currentExpiry: input.currentExpiry,
    nextExpiry: input.nextExpiry,
    daysToCurrentExpiry: input.daysToCurrentExpiry,
    currentMonthOI: input.currentMonthOI,
    nextMonthOI: input.nextMonthOI,
    totalFuturesOI,
    rolloverPercent,
    costOfCarryCurrent: input.currentMonthCoC,
    costOfCarryNext: input.nextMonthCoC,
    threeMonthAvgRollover: input.threeMonthAvgRollover,
    rolloverVsAvgDiff,
    allExpiries: input.allExpiries,
  };
}

// ── Cost of carry ─────────────────────────────────────────────────────────────
// CoC = (futuresPrice - spotPrice) / spotPrice * (365 / daysToExpiry) * 100
// Positive CoC = contango (bullish carry), negative = backwardation (bearish carry).

export function computeCostOfCarry(
  futuresPrice: number,
  spotPrice: number,
  daysToExpiry: number,
): number {
  if (spotPrice <= 0 || daysToExpiry <= 0) return 0;
  return +((((futuresPrice - spotPrice) / spotPrice) * (365 / daysToExpiry)) * 100).toFixed(3);
}

// ── FII derived position summary ──────────────────────────────────────────────

export function computeFiiDerSummary(series: FiiDerPositionDay[]): Omit<FiiDerPositionSummary, 'dataAsOf'> {
  if (series.length === 0) {
    return {
      series: [],
      latestDate: '',
      fiiNetFuturesBuy5d: 0,
      fiiNetOptionsBuy5d: 0,
      diiNetFuturesBuy5d: 0,
      latestFiiIndexFutNetOI: 0,
      latestFiiStockFutNetOI: 0,
      latestFiiIndexPCR: 0,
    };
  }

  const last5 = series.slice(-5);
  const latest = series[series.length - 1];

  const fiiNetFuturesBuy5d = +last5.reduce((s, d) => s + d.fiiIndexFutNetBuy + d.fiiStockFutNetBuy, 0).toFixed(2);
  const fiiNetOptionsBuy5d = +last5.reduce((s, d) => s + d.fiiIndexOptNetBuy + d.fiiStockOptNetBuy, 0).toFixed(2);
  const diiNetFuturesBuy5d = +last5.reduce((s, d) => s + d.diiIndexFutNetBuy, 0).toFixed(2);

  const latestFiiIndexPCR =
    latest.fiiIndexCallOI > 0
      ? +(latest.fiiIndexPutOI / latest.fiiIndexCallOI).toFixed(4)
      : 0;

  return {
    series,
    latestDate: latest.date,
    fiiNetFuturesBuy5d,
    fiiNetOptionsBuy5d,
    diiNetFuturesBuy5d,
    latestFiiIndexFutNetOI: latest.fiiIndexFutNetOI,
    latestFiiStockFutNetOI: latest.fiiStockFutNetOI,
    latestFiiIndexPCR,
  };
}

// ── Participant OI derived metrics ────────────────────────────────────────────

export interface ParticipantDerivedMetrics {
  fiiLongShortRatio: number;       // (long / short) for index futures
  fiiNetLongPct: number;           // net long as % of total OI
  clientVsFiiContra: boolean;      // true when CLIENT and FII are on opposite sides
  proNetLong: number;
  clientNetLong: number;
}

export function computeParticipantMetrics(rows: ParticipantOIRow[]): ParticipantDerivedMetrics {
  const fii = rows.find((r) => r.category === 'FII');
  const client = rows.find((r) => r.category === 'CLIENT');
  const pro = rows.find((r) => r.category === 'PRO');

  const totalFiiOI = (fii?.indexFutLong ?? 0) + (fii?.indexFutShort ?? 0);
  const fiiLongShortRatio =
    fii && fii.indexFutShort > 0
      ? +(fii.indexFutLong / fii.indexFutShort).toFixed(4)
      : 0;
  const fiiNetLongPct =
    totalFiiOI > 0
      ? +((fii?.indexFutNetLong ?? 0) / totalFiiOI * 100).toFixed(2)
      : 0;

  const fiiNetLong = fii?.indexFutNetLong ?? 0;
  const clientNetLong = client?.indexFutNetLong ?? 0;
  // Contra indicator: FII and CLIENT positions are significantly opposite
  const clientVsFiiContra = fiiNetLong > 0 && clientNetLong < -1000
    || fiiNetLong < 0 && clientNetLong > 1000;

  return {
    fiiLongShortRatio,
    fiiNetLongPct,
    clientVsFiiContra,
    proNetLong: pro?.indexFutNetLong ?? 0,
    clientNetLong,
  };
}
