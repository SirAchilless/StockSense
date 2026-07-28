// Canonical F&O provider interface — single import surface for all F&O data.
// Concrete providers (NSE delayed, mock) live in apps/api/src/services/fno/
// and are injected at the service layer. No concrete provider import is
// permitted in the UI or business-logic layers.

export interface RolloverData {
  symbol: string;
  expiryNear: string; // ISO date
  expiryNext: string; // ISO date
  rolloverPct: number; // 0–100
  rolloverCostBps: number; // basis points
  historicalAvgRolloverPct: number;
  historicalAvgRolloverCostBps: number;
}

export interface ParticipantOI {
  date: string; // ISO date
  category: 'FII' | 'DII' | 'PRO' | 'CLIENT';
  instrumentType: 'INDEX_FUTURES' | 'STOCK_FUTURES' | 'INDEX_OPTIONS' | 'STOCK_OPTIONS';
  longOI: number;
  shortOI: number;
  netOI: number; // longOI - shortOI; computed, never stored raw
}

export interface CostOfCarry {
  symbol: string;
  expiry: string;
  spotPrice: number;
  futuresPrice: number;
  costOfCarryPct: number; // annualized
  daysToExpiry: number;
}

export interface OITrend {
  symbol: string;
  expiry: string;
  currentOI: number;
  previousOI: number;
  oiChange: number;
  priceChange: number;
  classification: 'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'LONG_UNWINDING' | 'SHORT_UNWINDING';
}

export interface PCRData {
  symbol: string; // 'NIFTY' | 'BANKNIFTY' | stock symbol
  expiry: string | 'ALL';
  pcrOI: number;
  pcrVolume: number;
  timestamp: string;
}

export type OITrendClassification =
  'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'LONG_UNWINDING' | 'SHORT_UNWINDING';

export interface FnOProvider {
  getRolloverData(symbol: string): Promise<RolloverData>;
  getMarketWideRollover(): Promise<RolloverData[]>;
  getParticipantOI(date: string): Promise<ParticipantOI[]>;
  getCostOfCarry(symbol: string): Promise<CostOfCarry[]>;
  getOITrends(symbol: string, expiry?: string): Promise<OITrend[]>;
  getPCR(symbol: string, expiry?: string): Promise<PCRData>;
  getMarketWidePCR(): Promise<PCRData[]>;
}
