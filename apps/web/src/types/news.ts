export type SentimentLabel = 'bullish' | 'bearish' | 'neutral';
export type ImpactLevel = 'high' | 'medium' | 'low';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl: string | null;
  sentiment: SentimentLabel | null;
  impact: ImpactLevel | null;
  sentimentScore: number | null;
  affectedSymbols: string[];
  affectedSectors: string[];
  sentimentRationale: string | null;
}

export interface NewsResponse {
  articles: NewsItem[];
  count: number;
  sentimentScored: boolean;
  fetchedAt: string;
}

export interface SymbolNewsResponse extends NewsResponse {
  symbol: string;
}
