// Phase 3.2 F&O provider contract.
//
// Per Constraint 2.1 this is the ONLY surface through which UI / business
// logic may consume F&O data. Concrete adapters (NSE public/delayed feed,
// paid vendor, mock, etc.) implement this interface; no vendor SDK, URL,
// or third-party import may appear outside packages/market-data and the
// backend service-injection layer.

export interface RolloverData {
  symbol: string;
  expiryNear: string;          // ISO date (yyyy-mm-dd)
  expiryNext: string;          // ISO date
  rolloverPct: number;         // 0–100
  rolloverCostBps: number;     // basis points (1bp = 0.01%)
  historicalAvgRolloverPct: number;
  historicalAvgRolloverCostBps: number;
}

export type ParticipantCategory = 'FII' | 'DII' | 'PRO' | 'CLIENT';
export type InstrumentType = 'INDEX_FUTURES' | 'STOCK_FUTURES' | 'INDEX_OPTIONS' | 'STOCK_OPTIONS';

export interface ParticipantOI {
  date: string;                // ISO date (yyyy-mm-dd)
  category: ParticipantCategory;
  instrumentType: InstrumentType;
  longOI: number;
  shortOI: number;
  netOI: number;               // longOI - shortOI (computed, never stored raw)
}

export interface CostOfCarry {
  symbol: string;
  expiry: string;              // ISO date
  spotPrice: number;
  futuresPrice: number;
  costOfCarryPct: number;      // annualised
  daysToExpiry: number;
}

export type OITrendClassification =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'SHORT_UNWINDING'
  | 'LONG_UNWINDING';

export interface OITrend {
  symbol: string;
  expiry: string;
  currentOI: number;
  previousOI: number;
  oiChange: number;
  priceChange: number;         // %
  classification: OITrendClassification;
}

export interface PCRData {
  symbol: string;              // 'NIFTY' | 'BANKNIFTY' | FINNIFTY | stock symbol | 'MARKET'
  expiry: string | 'ALL';
  pcrOI: number;
  pcrVolume: number;
  timestamp: string;           // ISO
}

export interface FnOProvider {
  getRolloverData(symbol: string): Promise<RolloverData>;
  getMarketWideRollover(): Promise<RolloverData[]>;
  getParticipantOI(date: string): Promise<ParticipantOI[]>;
  getCostOfCarry(symbol: string): Promise<CostOfCarry[]>;
  getOITrends(symbol: string, expiry?: string): Promise<OITrend[]>;
  getPCR(symbol: string, expiry?: string): Promise<PCRData>;
  getMarketWidePCR(): Promise<PCRData[]>;
}
