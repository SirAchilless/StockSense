import { describe, it, expect } from 'vitest';
import { MockNewsAdapter } from '../mock-news-adapter';
import type { NewsItem } from '../types';

const adapter = new MockNewsAdapter();

function isValidNewsItem(item: NewsItem): boolean {
  return (
    typeof item.id === 'string' && item.id.length > 0 &&
    typeof item.title === 'string' && item.title.length > 0 &&
    typeof item.summary === 'string' &&
    typeof item.url === 'string' &&
    typeof item.source === 'string' &&
    typeof item.publishedAt === 'string' &&
    !isNaN(new Date(item.publishedAt).getTime()) &&
    Array.isArray(item.affectedSymbols) &&
    Array.isArray(item.affectedSectors)
  );
}

describe('MockNewsAdapter', () => {
  describe('getMarketNews', () => {
    it('returns an array of NewsItems', async () => {
      const items = await adapter.getMarketNews();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it('every item has the required shape', async () => {
      const items = await adapter.getMarketNews();
      for (const item of items) {
        expect(isValidNewsItem(item)).toBe(true);
      }
    });

    it('respects the limit parameter', async () => {
      const items = await adapter.getMarketNews(3);
      expect(items.length).toBeLessThanOrEqual(3);
    });

    it('sentiment is one of bullish/bearish/neutral or null', async () => {
      const items = await adapter.getMarketNews();
      const valid = ['bullish', 'bearish', 'neutral', null];
      for (const item of items) {
        expect(valid).toContain(item.sentiment);
      }
    });

    it('impact is one of high/medium/low or null', async () => {
      const items = await adapter.getMarketNews();
      const valid = ['high', 'medium', 'low', null];
      for (const item of items) {
        expect(valid).toContain(item.impact);
      }
    });

    it('sentimentScore is between -1 and +1 when set', async () => {
      const items = await adapter.getMarketNews();
      for (const item of items) {
        if (item.sentimentScore !== null) {
          expect(item.sentimentScore).toBeGreaterThanOrEqual(-1);
          expect(item.sentimentScore).toBeLessThanOrEqual(1);
        }
      }
    });

    it('all IDs are unique', async () => {
      const items = await adapter.getMarketNews();
      const ids = items.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getSymbolNews', () => {
    it('returns items mentioning RELIANCE', async () => {
      const items = await adapter.getSymbolNews('RELIANCE');
      expect(items.length).toBeGreaterThan(0);
      const allMentionReliance = items.every(
        (n) =>
          n.affectedSymbols.includes('RELIANCE') ||
          n.title.toUpperCase().includes('RELIANCE') ||
          n.summary.toUpperCase().includes('RELIANCE')
      );
      expect(allMentionReliance).toBe(true);
    });

    it('returns empty array for unknown symbol', async () => {
      const items = await adapter.getSymbolNews('XXXX_NONEXISTENT');
      expect(items).toHaveLength(0);
    });

    it('respects the limit parameter', async () => {
      const items = await adapter.getSymbolNews('RELIANCE', 1);
      expect(items.length).toBeLessThanOrEqual(1);
    });
  });
});
