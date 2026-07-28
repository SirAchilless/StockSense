export type OITrendClassification =
  'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'LONG_UNWINDING' | 'SHORT_UNWINDING';

export function classifyOITrend(input: {
  oiChange: number;
  priceChange: number;
}): OITrendClassification {
  if (input.oiChange > 0 && input.priceChange > 0) return 'LONG_BUILDUP';
  if (input.oiChange > 0 && input.priceChange < 0) return 'SHORT_BUILDUP';
  if (input.oiChange < 0 && input.priceChange > 0) return 'SHORT_UNWINDING';
  return 'LONG_UNWINDING';
}
