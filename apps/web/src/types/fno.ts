export interface FuturesOI {
  symbol: string;
  expiry: string;
  openInterest: number;
  oiChange: number;
  ltp: number;
  basis: number;
  costOfCarry: number;
  volume: number;
}

export interface RolloverData {
  symbol: string;
  spotPrice: number;
  currentExpiry: string;
  nextExpiry: string;
  daysToCurrentExpiry: number;
  currentMonthOI: number;
  nextMonthOI: number;
  totalFuturesOI: number;
  rolloverPercent: number;
  costOfCarryCurrent: number;
  costOfCarryNext: number;
  threeMonthAvgRollover: number;
  rolloverVsAvgDiff: number;
  allExpiries: FuturesOI[];
  dataAsOf: string;
}

export interface FiiDerPositionDay {
  date: string;
  fiiIndexFutLongOI: number;
  fiiIndexFutShortOI: number;
  fiiIndexFutNetOI: number;
  fiiIndexFutNetBuy: number;
  fiiStockFutLongOI: number;
  fiiStockFutShortOI: number;
  fiiStockFutNetOI: number;
  fiiStockFutNetBuy: number;
  fiiIndexCallOI: number;
  fiiIndexPutOI: number;
  fiiIndexOptNetBuy: number;
  fiiStockOptNetBuy: number;
  diiIndexFutLongOI: number;
  diiIndexFutShortOI: number;
  diiIndexFutNetOI: number;
  diiIndexFutNetBuy: number;
}

export interface FiiDerPositionSummary {
  series: FiiDerPositionDay[];
  latestDate: string;
  fiiNetFuturesBuy5d: number;
  fiiNetOptionsBuy5d: number;
  diiNetFuturesBuy5d: number;
  latestFiiIndexFutNetOI: number;
  latestFiiStockFutNetOI: number;
  latestFiiIndexPCR: number;
  dataAsOf: string;
}

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

export interface FnoInterpretation {
  rolloverNote: string;
  fiiPositioningNote: string;
  diiPositioningNote: string;
  costOfCarryNote: string;
  overallNote: string;
  confidence: number;
  dataAvailable: boolean;
}

export interface FnoAnalysisResult {
  rollover: RolloverData;
  fiiPositions: FiiDerPositionSummary;
  participantOI: ParticipantOIData;
  interpretation: FnoInterpretation;
  disclaimer: string;
  dataAsOf: string;
}
