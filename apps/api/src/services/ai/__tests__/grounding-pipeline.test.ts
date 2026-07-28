import { describe, it, expect } from 'vitest';
import { runResearchPipeline, DISCLAIMER } from '../grounding-pipeline';
import { MockAIAdapter } from '../mock-ai-adapter';
import { MockMarketDataAdapter } from '../../market-data/mock-adapter';

const marketDataProvider = new MockMarketDataAdapter();
const aiProvider = new MockAIAdapter();

describe('runResearchPipeline', () => {
  it('returns schema-valid response with full fixture data', async () => {
    const result = await runResearchPipeline({ symbol: 'RELIANCE', marketDataProvider, aiProvider });

    expect(result.symbol).toBe('RELIANCE');
    expect(result.disclaimer).toBe(DISCLAIMER);
    expect(typeof result.dataAsOf).toBe('string');
    expect(new Date(result.dataAsOf).toString()).not.toBe('Invalid Date');

    const r = result.response;
    expect(typeof r.businessSummary).toBe('string');
    expect(r.businessSummary.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(typeof r.dataAvailable).toBe('boolean');
    expect(Array.isArray(r.missingFields)).toBe(true);

    // All ratio fields present or explicitly null (never undefined)
    for (const key of ['pe', 'pb', 'roe', 'roce', 'eps', 'debtToEquity'] as const) {
      expect(r.ratios[key] === null || typeof r.ratios[key] === 'number').toBe(true);
    }
  });

  it('returns dataAvailable=false and low confidence when no data provided', async () => {
    // Patch mock adapter to return empty fundamentals
    const emptyProvider = {
      ...marketDataProvider,
      getStockFundamentals: async () => ({
        symbol: 'UNKNOWN',
        name: 'Unknown',
        sector: null,
        industry: null,
        marketCap: null,
        pe: null, pb: null, roe: null, roce: null, eps: null,
        debtToEquity: null, dividendYield: null,
        week52High: null, week52Low: null,
        dataAsOf: new Date().toISOString(),
      }),
      getStockQuote: async () => ({
        symbol: 'UNKNOWN', name: 'Unknown',
        price: 0, change: 0, changePercent: 0,
        dayHigh: 0, dayLow: 0, volume: 0, previousClose: 0,
        lastUpdated: new Date().toISOString(),
      }),
    };

    const result = await runResearchPipeline({ symbol: 'UNKNOWN', marketDataProvider: emptyProvider, aiProvider });
    expect(result.response.dataAvailable).toBe(false);
    expect(result.response.confidence).toBeLessThan(0.5);
    // Must never fabricate ratios when data is null
    for (const key of ['pe', 'pb', 'roe', 'roce', 'eps', 'debtToEquity'] as const) {
      expect(result.response.ratios[key]).toBeNull();
    }
  });

  it('always attaches the disclaimer', async () => {
    const result = await runResearchPipeline({ symbol: 'TCS', marketDataProvider, aiProvider });
    expect(result.disclaimer).toContain('not investment advice');
    expect(result.disclaimer).toContain('SEBI');
  });
});
