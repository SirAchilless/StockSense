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

export interface MarketDataProvider {
  getIndexQuotes(symbols: IndexSymbol[]): Promise<IndexQuote[]>;
  getMarketStatus(): Promise<MarketStatusInfo>;
  getStockQuote(symbol: string): Promise<StockQuote>;
  getStockFundamentals(symbol: string): Promise<StockFundamentals>;
  getOHLC(symbol: string, timeframe: Timeframe): Promise<OHLCBar[]>;
}
