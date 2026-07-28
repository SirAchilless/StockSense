import { describe, it, expect } from 'vitest';
import { MockMarketDataAdapter } from '../mock-adapter';

const adapter = new MockMarketDataAdapter();

describe('MockMarketDataAdapter', () => {
  it('getIndexQuotes returns correct shape for all 4 indices', async () => {
    const quotes = await adapter.getIndexQuotes(['NIFTY50', 'BANKNIFTY', 'SENSEX', 'INDIAVIX']);
    expect(quotes).toHaveLength(4);
    for (const q of quotes) {
      expect(q).toMatchObject({
        symbol: expect.any(String),
        name: expect.any(String),
        price: expect.any(Number),
        change: expect.any(Number),
        changePercent: expect.any(Number),
        dayHigh: expect.any(Number),
        dayLow: expect.any(Number),
        previousClose: expect.any(Number),
        lastUpdated: expect.any(String),
      });
      expect(q.dayHigh).toBeGreaterThanOrEqual(q.dayLow);
      expect(new Date(q.lastUpdated).toString()).not.toBe('Invalid Date');
    }
  });

  it('getMarketStatus returns valid status', async () => {
    const status = await adapter.getMarketStatus();
    expect(['open', 'closed', 'pre-open', 'post-close']).toContain(status.status);
    if (status.nextOpenAt) {
      expect(new Date(status.nextOpenAt).toString()).not.toBe('Invalid Date');
    }
  });

  it('getStockQuote returns correct shape', async () => {
    const quote = await adapter.getStockQuote('RELIANCE');
    expect(quote.symbol).toBe('RELIANCE');
    expect(quote.price).toBeGreaterThan(0);
    expect(typeof quote.volume).toBe('number');
  });

  it('getStockFundamentals returns correct shape with nullable fields', async () => {
    const fund = await adapter.getStockFundamentals('TCS');
    expect(fund.symbol).toBe('TCS');
    // pe can be null but if present should be a number
    if (fund.pe !== null) expect(typeof fund.pe).toBe('number');
    if (fund.roe !== null) expect(typeof fund.roe).toBe('number');
  });

  it('getOHLC returns sorted bars with correct structure', async () => {
    const bars = await adapter.getOHLC('INFY', '1M');
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(bar.high).toBeGreaterThanOrEqual(bar.low);
      expect(bar.high).toBeGreaterThanOrEqual(bar.open);
      expect(bar.high).toBeGreaterThanOrEqual(bar.close);
    }
    // Verify sorted ascending by time
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i].time >= bars[i - 1].time).toBe(true);
    }
  });
});
