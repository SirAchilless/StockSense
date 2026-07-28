// Shared types across web and api — expanded as features are built.
//
// This package is intentionally dependency-free so it can be imported from
// any other workspace package without circular references. F&O types that
// match @stocksense/market-data's interfaces are duplicated here; both are
// validated by tests to stay in sync.

export type ApiResponse<T> =
  | { data: T; error?: never; meta?: ResponseMeta }
  | { data?: never; error: ApiError; meta?: ResponseMeta };

export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  source: string;
  asOf: string;
  cachedAt: string;
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

// Market data types (skeleton — fleshed out in step 1.4)
export type IndexSymbol = 'NIFTY50' | 'BANKNIFTY' | 'SENSEX' | 'INDIAVIX';

export type MarketStatus = 'open' | 'closed' | 'pre-open' | 'post-close';

// ── F&O types (mirrors packages/market-data/src/interfaces/fno-provider.interface.ts) ──

export type ParticipantCategory = 'FII' | 'DII' | 'PRO' | 'CLIENT';
export type InstrumentType = 'INDEX_FUTURES' | 'STOCK_FUTURES' | 'INDEX_OPTIONS' | 'STOCK_OPTIONS';
export type OITrendClassification =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'SHORT_UNWINDING'
  | 'LONG_UNWINDING';

export interface RolloverData {
  symbol: string;
  expiryNear: string;
  expiryNext: string;
  rolloverPct: number;
  rolloverCostBps: number;
  historicalAvgRolloverPct: number;
  historicalAvgRolloverCostBps: number;
}

export interface ParticipantOI {
  date: string;
  category: ParticipantCategory;
  instrumentType: InstrumentType;
  longOI: number;
  shortOI: number;
  netOI: number;
}

export interface CostOfCarry {
  symbol: string;
  expiry: string;
  spotPrice: number;
  futuresPrice: number;
  costOfCarryPct: number;
  daysToExpiry: number;
}

export interface OITrend {
  symbol: string;
  expiry: string;
  currentOI: number;
  previousOI: number;
  oiChange: number;
  priceChange: number;
  classification: OITrendClassification;
}

export interface PCRData {
  symbol: string;
  expiry: string | 'ALL';
  pcrOI: number;
  pcrVolume: number;
  timestamp: string;
}
