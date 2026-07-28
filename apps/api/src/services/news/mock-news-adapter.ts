import type { NewsProvider, NewsItem } from './types';

const MOCK_NEWS: NewsItem[] = [
  {
    id: 'mock-001',
    title: 'Reliance Industries Q4 profit rises 7% YoY, beats estimates',
    summary:
      'Reliance Industries reported a 7% year-on-year rise in net profit to ₹19,407 crore for the March quarter, beating analyst estimates. The conglomerate was driven by strong retail and digital services segments.',
    url: 'https://example.com/reliance-q4',
    source: 'Economic Times',
    publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    imageUrl: null,
    sentiment: 'bullish',
    impact: 'high',
    sentimentScore: 0.72,
    affectedSymbols: ['RELIANCE'],
    affectedSectors: ['Energy', 'Retail'],
    sentimentRationale: 'Strong earnings beat with positive guidance for Jio and retail segments.',
  },
  {
    id: 'mock-002',
    title: 'Nifty 50 closes at record high driven by banking stocks',
    summary:
      'The Nifty 50 index closed at an all-time high of 24,350 points on Monday, led by banking and financial stocks. HDFC Bank, ICICI Bank, and Kotak Mahindra Bank were the top contributors.',
    url: 'https://example.com/nifty-record',
    source: 'Moneycontrol',
    publishedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    imageUrl: null,
    sentiment: 'bullish',
    impact: 'high',
    sentimentScore: 0.65,
    affectedSymbols: ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'],
    affectedSectors: ['Banking', 'Financial Services'],
    sentimentRationale: 'Broad market rally with institutional buying in banking heavyweights.',
  },
  {
    id: 'mock-003',
    title: 'RBI holds repo rate at 6.5%, signals caution on inflation',
    summary:
      'The Reserve Bank of India kept the repo rate unchanged at 6.5% in its June MPC meeting, citing elevated core inflation and global uncertainty. Markets had priced in a 25bp cut.',
    url: 'https://example.com/rbi-rates',
    source: 'Business Standard',
    publishedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    imageUrl: null,
    sentiment: 'neutral',
    impact: 'high',
    sentimentScore: -0.1,
    affectedSymbols: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK'],
    affectedSectors: ['Banking', 'Real Estate', 'Automobile'],
    sentimentRationale: 'Rate hold was expected but guidance was more hawkish than anticipated, moderately negative for rate-sensitive sectors.',
  },
  {
    id: 'mock-004',
    title: 'TCS misses Q1 revenue estimates; attrition falls to 12.1%',
    summary:
      'Tata Consultancy Services reported a Q1 revenue growth of 4.2% in constant currency terms, below analyst estimates of 5.5%. Attrition fell to 12.1% from 13.8% a quarter ago.',
    url: 'https://example.com/tcs-q1',
    source: 'Mint',
    publishedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    imageUrl: null,
    sentiment: 'bearish',
    impact: 'medium',
    sentimentScore: -0.45,
    affectedSymbols: ['TCS', 'INFY', 'WIPRO', 'HCLTECH'],
    affectedSectors: ['IT', 'Technology'],
    sentimentRationale: 'Revenue miss likely to weigh on sector sentiment, particularly discretionary tech spending outlook.',
  },
  {
    id: 'mock-005',
    title: 'India manufacturing PMI hits 6-month high at 58.4 in June',
    summary:
      'India\'s Manufacturing Purchasing Managers\' Index (PMI) climbed to 58.4 in June, the highest in six months, signalling strong expansion in factory output and new orders.',
    url: 'https://example.com/pmi-june',
    source: 'Reuters India',
    publishedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    imageUrl: null,
    sentiment: 'bullish',
    impact: 'medium',
    sentimentScore: 0.55,
    affectedSymbols: ['TATASTEEL', 'HINDALCO', 'MARUTI', 'M&M'],
    affectedSectors: ['Manufacturing', 'Automobile', 'Metals'],
    sentimentRationale: 'Stronger macro data positive for cyclical and manufacturing-oriented sectors.',
  },
  {
    id: 'mock-006',
    title: 'Oil edges down on demand concerns; ONGC, Reliance in focus',
    summary:
      'Brent crude fell 1.2% to $81.3/bbl amid softer-than-expected China manufacturing data, raising demand concerns. ONGC and Reliance may face near-term margin pressure.',
    url: 'https://example.com/oil-demand',
    source: 'Financial Express',
    publishedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    imageUrl: null,
    sentiment: 'bearish',
    impact: 'medium',
    sentimentScore: -0.38,
    affectedSymbols: ['ONGC', 'RELIANCE', 'BPCL', 'IOC'],
    affectedSectors: ['Energy', 'Oil & Gas'],
    sentimentRationale: 'Lower crude prices reduce upstream realizations for ONGC; refining margins mixed for BPCL and Reliance.',
  },
  {
    id: 'mock-007',
    title: 'SEBI proposes new F&O framework; exchanges to implement by October',
    summary:
      'SEBI has released a consultation paper proposing changes to the futures and options framework, including higher lot sizes, intraday margin collection, and weekly expiry rationalisation.',
    url: 'https://example.com/sebi-fo',
    source: 'Economic Times',
    publishedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    imageUrl: null,
    sentiment: 'neutral',
    impact: 'medium',
    sentimentScore: -0.12,
    affectedSymbols: ['NSE', 'BSE'],
    affectedSectors: ['Financial Services', 'Exchanges'],
    sentimentRationale: 'Regulatory changes may reduce retail F&O volumes short-term but improve market stability.',
  },
  {
    id: 'mock-008',
    title: 'ITC Hotels demerger record date set for August 12',
    summary:
      'ITC Limited announced that the record date for its hotel business demerger has been set for August 12. Shareholders will receive one ITC Hotels share for every ten ITC shares held.',
    url: 'https://example.com/itc-demerger',
    source: 'Business Standard',
    publishedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    imageUrl: null,
    sentiment: 'bullish',
    impact: 'medium',
    sentimentScore: 0.48,
    affectedSymbols: ['ITC'],
    affectedSectors: ['FMCG', 'Hospitality'],
    sentimentRationale: 'Value unlocking from the demerger likely to re-rate ITC\'s sum-of-parts valuation.',
  },
];

export class MockNewsAdapter implements NewsProvider {
  async getMarketNews(limit = 10): Promise<NewsItem[]> {
    return MOCK_NEWS.slice(0, limit);
  }

  async getSymbolNews(symbol: string, limit = 5): Promise<NewsItem[]> {
    const sym = symbol.toUpperCase();
    const filtered = MOCK_NEWS.filter(
      (n) =>
        n.affectedSymbols.includes(sym) ||
        n.title.toUpperCase().includes(sym) ||
        n.summary.toUpperCase().includes(sym)
    );
    return filtered.slice(0, limit);
  }
}
