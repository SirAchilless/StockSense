// Internal types for the v2 F&O service.
// The public FnOProvider interface lives in @stocksense/market-data.

export type FnOMetric =
  | 'rollover'
  | 'participant_oi'
  | 'cost_of_carry'
  | 'oi_trends'
  | 'pcr'
  | 'market_wide_pcr';

export interface FnOAICommentaryRequest {
  symbol: string;
  metrics: FnOMetric[];
}
