export type SentimentLabel = 'bullish' | 'bearish' | 'neutral';
export type ImpactLevel = 'high' | 'medium' | 'low';

export interface NewsItem {
  id: string;           // stable hash of url
  title: string;
  summary: string;      // first 400 chars of article body, or description field
  url: string;
  source: string;       // "Economic Times", "Moneycontrol", etc.
  publishedAt: string;  // ISO timestamp
  imageUrl: string | null;
  // Set after sentiment pass (null = not yet scored)
  sentiment: SentimentLabel | null;
  impact: ImpactLevel | null;
  sentimentScore: number | null;  // -1 to +1
  affectedSymbols: string[];
  affectedSectors: string[];
  sentimentRationale: string | null;
}

export interface NewsProvider {
  getMarketNews(limit?: number): Promise<NewsItem[]>;
  getSymbolNews(symbol: string, limit?: number): Promise<NewsItem[]>;
}
