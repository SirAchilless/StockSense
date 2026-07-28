import axios from 'axios';
import crypto from 'crypto';
import type { NewsProvider, NewsItem } from './types';

// Public Indian financial news RSS feeds — no API key required
const RSS_SOURCES: Array<{ url: string; name: string }> = [
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', name: 'Economic Times' },
  { url: 'https://www.moneycontrol.com/rss/marketoutlook.xml',                  name: 'Moneycontrol' },
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',                       name: 'NDTV Profit' },
  { url: 'https://www.business-standard.com/rss/markets-106.rss',               name: 'Business Standard' },
];

// Minimal XML parser — extracts <item> blocks without a heavy dependency
function parseRssItems(xml: string): Array<{ title: string; description: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string }> = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string): string => {
      // Handle CDATA and plain text
      const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i');
      const m = re.exec(block);
      return (m?.[1] ?? m?.[2] ?? '').trim();
    };
    const title       = get('title');
    const description = get('description');
    const link        = get('link');
    const pubDate     = get('pubDate');

    if (title && link) {
      items.push({ title, description, link, pubDate });
    }
  }
  return items;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function stableId(url: string): string {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
}

async function fetchSource(source: { url: string; name: string }): Promise<NewsItem[]> {
  try {
    const { data } = await axios.get<string>(source.url, {
      timeout: 5000,
      headers: { 'User-Agent': 'StockSense/1.0 (+https://stocksense.app)' },
      responseType: 'text',
    });

    const raw = parseRssItems(data);
    return raw.map((item) => {
      const summary = stripHtml(item.description).slice(0, 500);
      let publishedAt: string;
      try {
        publishedAt = new Date(item.pubDate).toISOString();
      } catch {
        publishedAt = new Date().toISOString();
      }
      return {
        id: stableId(item.link),
        title: stripHtml(item.title),
        summary: summary || stripHtml(item.title),
        url: item.link,
        source: source.name,
        publishedAt,
        imageUrl: null,
        // Sentiment fields — filled after the AI pass
        sentiment: null,
        impact: null,
        sentimentScore: null,
        affectedSymbols: [],
        affectedSectors: [],
        sentimentRationale: null,
      } satisfies NewsItem;
    });
  } catch (err) {
    console.warn(`[rss-news] Failed to fetch ${source.name}: ${(err as Error).message}`);
    return [];
  }
}

export class RssNewsAdapter implements NewsProvider {
  private cache: { items: NewsItem[]; fetchedAt: number } | null = null;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5-minute cache

  private async fetchAll(): Promise<NewsItem[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.cacheTtlMs) {
      return this.cache.items;
    }

    const results = await Promise.allSettled(RSS_SOURCES.map(fetchSource));
    const all = results
      .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    // Deduplicate by id, sort newest first
    const seen = new Set<string>();
    const unique = all.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    this.cache = { items: unique, fetchedAt: Date.now() };
    return unique;
  }

  async getMarketNews(limit = 15): Promise<NewsItem[]> {
    const all = await this.fetchAll();
    return all.slice(0, limit);
  }

  async getSymbolNews(symbol: string, limit = 8): Promise<NewsItem[]> {
    const all = await this.fetchAll();
    const sym = symbol.toUpperCase();
    // Filter by symbol presence in title (pre-sentiment-pass we have no affectedSymbols from RSS)
    const filtered = all.filter(
      (n) =>
        n.title.toUpperCase().includes(sym) ||
        n.summary.toUpperCase().includes(sym)
    );
    return filtered.slice(0, limit);
  }
}
