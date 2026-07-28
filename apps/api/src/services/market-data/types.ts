export type IndexSymbol = 'NIFTY50' | 'BANKNIFTY' | 'SENSEX' | 'INDIAVIX';

export type MarketStatus = 'open' | 'closed' | 'pre-open' | 'post-close';

export interface IndexQuote {
  symbol: IndexSymbol;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  lastUpdated: string; // ISO timestamp
}

export interface MarketStatusInfo {
  status: MarketStatus;
  nextOpenAt: string | null;   // ISO timestamp, null if currently open
  previousClose: string | null; // ISO timestamp of last close
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  previousClose: number;
  lastUpdated: string;
}

export interface StockFundamentals {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roce: number | null;
  eps: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  week52High: number | null;
  week52Low: number | null;
  dataAsOf: string;
}

export interface OHLCBar {
  time: string; // ISO date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1D' | '1W' | '1M' | '1Y';

// ── Global market instruments ─────────────────────────────────────────────
export type GlobalSymbol =
  | 'DOW'      // Dow Jones Industrial Average
  | 'NASDAQ'   // NASDAQ Composite
  | 'SP500'    // S&P 500
  | 'NIKKEI'   // Nikkei 225
  | 'HANGSENG' // Hang Seng
  | 'DAX'      // DAX 40
  | 'CRUDE_OIL'
  | 'GOLD'
  | 'SILVER'
  | 'USD_INR'
  | 'DXY'      // US Dollar Index
  | 'BTC_USD'
  | 'ETH_USD';

export const GLOBAL_SYMBOLS: GlobalSymbol[] = [
  'DOW', 'NASDAQ', 'SP500', 'NIKKEI', 'HANGSENG', 'DAX',
  'CRUDE_OIL', 'GOLD', 'SILVER', 'USD_INR', 'DXY', 'BTC_USD', 'ETH_USD',
];

export type GlobalCategory = 'equity' | 'commodity' | 'forex' | 'crypto';

export interface GlobalQuote {
  symbol: GlobalSymbol;
  name: string;
  category: GlobalCategory;
  price: number;
  change: number;
  changePercent: number;
  currency: string;    // 'USD', 'INR', etc.
  lastUpdated: string; // ISO timestamp
}

// ── Market Breadth ────────────────────────────────────────────────────────

export interface AdvanceDecline {
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
  advanceDeclineRatio: number; // advances / declines, null when declines = 0
}

export interface BreadthStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  advances: number;
  declines: number;
}

export interface FiiDiiActivity {
  date: string;           // YYYY-MM-DD
  fiiNetBuy: number;      // crores INR; negative = net sell
  diiNetBuy: number;
  fiiGrossBuy: number;
  fiiGrossSell: number;
  diiGrossBuy: number;
  diiGrossSell: number;
}

export interface MarketBreadthData {
  advanceDecline: AdvanceDecline;
  topGainers: BreadthStock[];   // top 10 by changePercent ascending (best first)
  topLosers: BreadthStock[];    // top 10 by changePercent descending (worst first)
  sectorPerformance: SectorPerformance[];
  fiiDii: FiiDiiActivity[];     // last 5 trading days
  dataAsOf: string;
}

export interface MarketDataProvider {
  getIndexQuotes(symbols: IndexSymbol[]): Promise<IndexQuote[]>;
  getMarketStatus(): Promise<MarketStatusInfo>;
  getStockQuote(symbol: string): Promise<StockQuote>;
  getStockFundamentals(symbol: string): Promise<StockFundamentals>;
  getOHLC(symbol: string, timeframe: Timeframe): Promise<OHLCBar[]>;
  getGlobalQuotes(symbols: GlobalSymbol[]): Promise<GlobalQuote[]>;
  getMarketBreadth(): Promise<MarketBreadthData>;
}
