// Types for the Phase 3.2 F&O module — imported from the shared package,
// never duplicated, per C.6.
import type {
  RolloverData,
  ParticipantOI,
  CostOfCarry,
  OITrend,
  PCRData,
  ResponseMeta,
} from '@stocksense/shared-types';

export type { RolloverData, ParticipantOI, CostOfCarry, OITrend, PCRData, ResponseMeta };

export type FnOMetric =
  | 'rollover'
  | 'participant_oi'
  | 'cost_of_carry'
  | 'oi_trends'
  | 'pcr'
  | 'market_wide_pcr';

export interface FnOAICommentary {
  commentary: string;
  confidence: number;
  dataAvailable: boolean;
  disclaimer: string;
  dataAsOf: string;
  metricsIncluded: FnOMetric[];
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: ResponseMeta;
  error?: { code: string; message: string; retryable: boolean };
}
