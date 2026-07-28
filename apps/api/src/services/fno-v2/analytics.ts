// Pure, unit-testable analytics for Phase 3.2.
// These functions contain NO IO, NO fetching, NO AI.
// They are deterministic and shared between the provider and the route layer.

import type { OITrendClassification } from '@stocksense/market-data';

/**
 * Classify an OI + price change pair into one of four build-up / unwinding
 * states. Pure — no side effects.
 */
export function classifyOITrend(oiChange: number, priceChange: number): OITrendClassification {
  if (oiChange > 0 && priceChange > 0) return 'LONG_BUILDUP';
  if (oiChange > 0 && priceChange < 0) return 'SHORT_BUILDUP';
  if (oiChange < 0 && priceChange > 0) return 'SHORT_UNWINDING';
  return 'LONG_UNWINDING'; // oiChange < 0 && priceChange < 0 (and zero-change edge case)
}

/**
 * Annualised cost of carry, as a percent.
 * Formula per C.7: ((futuresPrice - spotPrice) / spotPrice) * (365 / daysToExpiry) * 100
 */
export function computeCostOfCarry(
  spotPrice: number,
  futuresPrice: number,
  daysToExpiry: number,
): number {
  if (!Number.isFinite(spotPrice) || spotPrice <= 0) return 0;
  if (!Number.isFinite(futuresPrice) || !Number.isFinite(daysToExpiry)) return 0;
  if (daysToExpiry <= 0) return 0;
  return ((((futuresPrice - spotPrice) / spotPrice) * 365) / daysToExpiry) * 100;
}

/**
 * Convert a per-annum cost-of-carry percent into an approximate rollover cost
 * expressed in basis points for the period between two near-expiry contracts.
 *
 * rolloverCostBps = (coNext - coCurrent) scaled to the holding period in bp.
 * We approximate the holding period as (daysToNextExpiry - daysToNearExpiry)/365
 * and express the difference as bps of the notional (1bp = 0.01%).
 */
export function computeRolloverCostBps(
  nearCoCPct: number,
  nextCoCPct: number,
  daysBetweenExpiries: number,
): number {
  if (daysBetweenExpiries <= 0) return 0;
  const annualDiffPct = nextCoCPct - nearCoCPct;
  const periodDiffPct = (annualDiffPct * daysBetweenExpiries) / 365;
  return +(periodDiffPct * 100).toFixed(2); // pct → bps
}

/** Format helpers used server-side for meta labels. */
export const PCR_THRESHOLDS = {
  BEARISH: 0.7,
  BULLISH: 1.0,
} as const;

export function classifyPCR(pcr: number): 'bearish' | 'neutral' | 'bullish' {
  if (pcr < PCR_THRESHOLDS.BEARISH) return 'bearish';
  if (pcr > PCR_THRESHOLDS.BULLISH) return 'bullish';
  return 'neutral';
}
