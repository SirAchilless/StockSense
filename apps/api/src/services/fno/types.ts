import { z } from 'zod';

// ── Rollover metrics ──────────────────────────────────────────────────────────
// Rollover = percentage of open interest that "rolled" from expiring to next
// month's futures contract.  Computed deterministically from OI data.

export interface FuturesOI {
  symbol: string;
  expiry: string; // YYYY-MM-DD
  openInterest: number; // contracts
  oiChange: number; // OI change from previous session
  ltp: number; // last traded price
  basis: number; // ltp - spotPrice (premium/discount)
  costOfCarry: number; // annualised CoC in % = (basis / spotPrice) * (365 / daysToExpiry) * 100
  volume: number;
}

export interface RolloverData {
  symbol: string;
  spotPrice: number;
  currentExpiry: string; // expiry being rolled from
  nextExpiry: string; // expiry being rolled into
  daysToCurrentExpiry: number;
  currentMonthOI: number;
  nextMonthOI: number;
  totalFuturesOI: number;
  rolloverPercent: number; // nextMonthOI / totalFuturesOI * 100
  costOfCarryCurrent: number; // annualised %
  costOfCarryNext: number;
  threeMonthAvgRollover: number; // historical average (mock: fixed per symbol)
  rolloverVsAvgDiff: number; // rolloverPercent - threeMonthAvgRollover
  allExpiries: FuturesOI[];
  dataAsOf: string;
}

// ── FII/DII F&O positioning ──────────────────────────────────────────────────
// Granular: FII index futures, stock futures, index options (calls + puts
// separately), stock options, and DII index futures.

export interface FiiDerPositionDay {
  date: string; // YYYY-MM-DD
  // Index Futures
  fiiIndexFutLongOI: number; // contracts
  fiiIndexFutShortOI: number;
  fiiIndexFutNetOI: number; // long - short
  fiiIndexFutNetBuy: number; // crores INR
  // Stock Futures
  fiiStockFutLongOI: number;
  fiiStockFutShortOI: number;
  fiiStockFutNetOI: number;
  fiiStockFutNetBuy: number;
  // Index Options
  fiiIndexCallOI: number;
  fiiIndexPutOI: number;
  fiiIndexOptNetBuy: number;
  // Stock Options
  fiiStockOptNetBuy: number;
  // DII (mainly mutual funds + insurance)
  diiIndexFutLongOI: number;
  diiIndexFutShortOI: number;
  diiIndexFutNetOI: number;
  diiIndexFutNetBuy: number;
}

export interface FiiDerPositionSummary {
  series: FiiDerPositionDay[]; // last 10 trading days, chronological
  latestDate: string;
  // Rolling sums (last 5 days) — derived deterministically
  fiiNetFuturesBuy5d: number;
  fiiNetOptionsBuy5d: number;
  diiNetFuturesBuy5d: number;
  // Latest OI snapshot
  latestFiiIndexFutNetOI: number;
  latestFiiStockFutNetOI: number;
  latestFiiIndexPCR: number; // fiiIndexCallOI / fiiIndexPutOI
  dataAsOf: string;
}

// ── Participant-wise OI (NSE format) ─────────────────────────────────────────

export type ParticipantCategory = 'FII' | 'DII' | 'PRO' | 'CLIENT';

export interface ParticipantOIRow {
  category: ParticipantCategory;
  indexFutLong: number;
  indexFutShort: number;
  indexFutNetLong: number;
  stockFutLong: number;
  stockFutShort: number;
  stockFutNetLong: number;
  indexCallOI: number;
  indexPutOI: number;
  stockCallOI: number;
  stockPutOI: number;
}

export interface ParticipantOIData {
  rows: ParticipantOIRow[];
  date: string;
  dataAsOf: string;
}

// ── Combined F&O intelligence ─────────────────────────────────────────────────

export interface FnoIntelligenceData {
  rollover: RolloverData;
  fiiDerPositions: FiiDerPositionSummary;
  participantOI: ParticipantOIData;
}

// ── PCR (Put-Call Ratio) data ─────────────────────────────────────────────────

export interface PCRData {
  symbol: string;
  expiry: string | 'ALL';
  pcrOI: number;
  pcrVolume: number;
  timestamp: string;
}

// ── OI Trend per expiry ───────────────────────────────────────────────────────

export type OITrendClassification =
  'LONG_BUILDUP' | 'SHORT_BUILDUP' | 'LONG_UNWINDING' | 'SHORT_UNWINDING';

export interface OITrend {
  symbol: string;
  expiry: string;
  currentOI: number;
  previousOI: number;
  oiChange: number;
  priceChange: number;
  classification: OITrendClassification;
}

// ── Cost of carry per expiry ──────────────────────────────────────────────────

export interface CostOfCarryItem {
  symbol: string;
  expiry: string;
  spotPrice: number;
  futuresPrice: number;
  costOfCarryPct: number; // annualized %
  daysToExpiry: number;
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface FnoDataProvider {
  getRolloverData(symbol: string): Promise<RolloverData>;
  getMarketWideRollover(): Promise<RolloverData[]>;
  getFiiDerPositions(): Promise<FiiDerPositionSummary>;
  getParticipantOI(): Promise<ParticipantOIData>;
  getCostOfCarry(symbol: string): Promise<CostOfCarryItem[]>;
  getOITrends(symbol: string, expiry?: string): Promise<OITrend[]>;
  getPCR(symbol: string, expiry?: string): Promise<PCRData>;
  getMarketWidePCR(): Promise<PCRData[]>;
  getSupportedSymbols(): string[];
}

// ── Supported F&O symbols ────────────────────────────────────────────────────

export const FNO_INDEX_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'] as const;
export const FNO_STOCK_SYMBOLS = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK',
  'SBIN',
  'WIPRO',
  'LT',
  'AXISBANK',
  'KOTAKBANK',
  'BAJFINANCE',
  'MARUTI',
  'TATAMOTORS',
  'SUNPHARMA',
  'HINDUNILVR',
] as const;
export const ALL_FNO_SYMBOLS: readonly string[] = [...FNO_INDEX_SYMBOLS, ...FNO_STOCK_SYMBOLS];

// ── AI interpretation schema (zod) ────────────────────────────────────────────
// Phase 3.2 AI narrates over deterministically-computed rollover %, CoC,
// FII/DII net OI, and participant positioning.  Never emits or overrides them.

export const FnoInterpretationResponseSchema = z.object({
  rolloverNote: z.string().min(1),
  fiiPositioningNote: z.string().min(1),
  diiPositioningNote: z.string().min(1),
  costOfCarryNote: z.string().min(1),
  overallNote: z.string().min(1),
  confidence: z.number().min(0).max(1),
  dataAvailable: z.boolean(),
});

export type FnoInterpretationResponse = z.infer<typeof FnoInterpretationResponseSchema>;
