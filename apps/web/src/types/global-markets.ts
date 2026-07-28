export type GlobalCategory = 'equity' | 'commodity' | 'forex' | 'crypto';

export interface GlobalQuote {
  symbol: string;
  name: string;
  category: GlobalCategory;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
}

export interface GlobalAINote {
  note: string;
  confidence: number;
  dataAvailable: boolean;
  disclaimer: string;
}

export interface GlobalMarketsData {
  quotes: GlobalQuote[];
  aiNote: GlobalAINote | null;
}
