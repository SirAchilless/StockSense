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
