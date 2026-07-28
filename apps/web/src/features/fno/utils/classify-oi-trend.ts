// Pure OI-trend classification (C.7).
// Mirrors the server-side classifier so UI badges agree with the API.
import type { OITrendClassification } from '@stocksense/shared-types';

export function classifyOITrend(
  oiChange: number,
  priceChange: number,
): OITrendClassification {
  if (oiChange > 0 && priceChange > 0) return 'LONG_BUILDUP';
  if (oiChange > 0 && priceChange < 0) return 'SHORT_BUILDUP';
  if (oiChange < 0 && priceChange > 0) return 'SHORT_UNWINDING';
  return 'LONG_UNWINDING';
}
