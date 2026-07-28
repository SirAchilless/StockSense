import type { NewsProvider } from './types';
import { MockNewsAdapter } from './mock-news-adapter';
import { RssNewsAdapter } from './rss-news-adapter';

export { MockNewsAdapter } from './mock-news-adapter';
export { RssNewsAdapter } from './rss-news-adapter';
export type { NewsProvider, NewsItem, SentimentLabel, ImpactLevel } from './types';

let _instance: NewsProvider | null = null;

export function getNewsProvider(): NewsProvider {
  if (_instance) return _instance;

  const provider = process.env.NEWS_PROVIDER ?? 'mock';
  if (provider === 'rss') {
    _instance = new RssNewsAdapter();
    console.log('[news] Using RssNewsAdapter');
  } else {
    _instance = new MockNewsAdapter();
    console.log('[news] Using MockNewsAdapter');
  }
  return _instance;
}
