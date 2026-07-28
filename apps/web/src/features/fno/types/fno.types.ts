// Re-export existing types
export type {
  FuturesOI,
  RolloverData,
  FiiDerPositionDay,
  FiiDerPositionSummary,
  ParticipantCategory,
  ParticipantOIRow,
  ParticipantOIData,
  FnoInterpretation,
  FnoAnalysisResult,
} from '../../../types/fno';

// New types for Phase 3.2 additions
export interface PCRDataFrontend {
  symbol: string;
  expiry: string | 'ALL';
  pcrOI: number;
  pcrVolume: number;
  timestamp: string;
}

export type OITrendClassification =
  'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'LONG_UNWINDING' | 'SHORT_UNWINDING';

export interface OITrendFrontend {
  symbol: string;
  expiry: string;
  currentOI: number;
  previousOI: number;
  oiChange: number;
  priceChange: number;
  classification: OITrendClassification;
}

export interface CostOfCarryItemFrontend {
  symbol: string;
  expiry: string;
  spotPrice: number;
  futuresPrice: number;
  costOfCarryPct: number;
  daysToExpiry: number;
}
