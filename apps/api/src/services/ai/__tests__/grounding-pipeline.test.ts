import { describe, it, expect } from 'vitest';
import { runResearchPipeline, runPortfolioAnalysisPipeline, DISCLAIMER } from '../grounding-pipeline';
import { MockAIAdapter } from '../mock-ai-adapter';
import { MockMarketDataAdapter } from '../../market-data/mock-adapter';
import { calculateHoldingPnL } from '../../../lib/pnl';

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
      // not under test — delegate to real mock
      getIndexQuotes: marketDataProvider.getIndexQuotes.bind(marketDataProvider),
      getMarketStatus: marketDataProvider.getMarketStatus.bind(marketDataProvider),
      getOHLC: marketDataProvider.getOHLC.bind(marketDataProvider),
      getGlobalQuotes: marketDataProvider.getGlobalQuotes.bind(marketDataProvider),
      getMarketBreadth: marketDataProvider.getMarketBreadth.bind(marketDataProvider),
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
    // Exact SEBI compliance disclaimer (Constraint 2.2)
    expect(result.disclaimer).toMatch(/Not investment advice/i);
    expect(result.disclaimer).toContain('SEBI');
    expect(result.disclaimer).toBe(DISCLAIMER);
  });
});

describe('runPortfolioAnalysisPipeline', () => {
  const makeHolding = (symbol: string, quantity: number, buyPrice: number, currentPrice: number) => ({
    id: symbol,
    ...calculateHoldingPnL({ symbol, quantity, buyPrice, currentPrice }),
  });

  it('computes grounded metrics and attaches the disclaimer', async () => {
    const holdings = [
      makeHolding('TCS', 10, 3000, 3600),      // +20% → strong
      makeHolding('HDFCBANK', 20, 1500, 1350), // -10% → weak
      makeHolding('RELIANCE', 5, 2400, 2400),  // flat → neutral
    ];
    const result = await runPortfolioAnalysisPipeline({ holdings, marketDataProvider, aiProvider });

    expect(result.disclaimer).toBe(DISCLAIMER);
    expect(result.metrics.holdingCount).toBe(3);
    expect(result.metrics.sectorCount).toBeGreaterThanOrEqual(2); // mock maps distinct sectors
    expect(result.metrics.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.metrics.riskScore).toBeLessThanOrEqual(100);
    expect(result.metrics.diversificationScore).toBeGreaterThanOrEqual(0);
    expect(result.metrics.diversificationScore).toBeLessThanOrEqual(100);
    // Per-holding flags reflect deterministic P&L, not AI output
    const bySymbol = Object.fromEntries(result.metrics.holdings.map((h) => [h.symbol, h.flag]));
    expect(bySymbol.TCS).toBe('strong');
    expect(bySymbol.HDFCBANK).toBe('weak');
    expect(bySymbol.RELIANCE).toBe('neutral');
    // One narrative note per holding
    expect(result.analysis.holdingNotes).toHaveLength(3);
    expect(result.analysis.dataAvailable).toBe(true);
  });

  it('keeps commentary scenario-framed, not directive (acceptance 2.5)', async () => {
    const holdings = [makeHolding('TCS', 10, 3000, 3600)];
    const result = await runPortfolioAnalysisPipeline({ holdings, marketDataProvider, aiProvider });

    const allText = [
      result.analysis.overallAssessment,
      result.analysis.riskCommentary,
      result.analysis.diversificationCommentary,
      ...result.analysis.holdingNotes.map((n) => n.note),
    ].join(' ').toLowerCase();

    // Must not issue directive trade commands
    for (const directive of ['you should buy', 'you should sell', 'sell now', 'buy now', 'exit now', 'set a stoploss', 'set a target']) {
      expect(allText).not.toContain(directive);
    }
    // Must use scenario framing
    expect(allText).toContain('if');
  });

  it('reports dataAvailable=false for an empty portfolio', async () => {
    const result = await runPortfolioAnalysisPipeline({ holdings: [], marketDataProvider, aiProvider });
    expect(result.metrics.holdingCount).toBe(0);
    expect(result.metrics.riskScore).toBe(0);
    expect(result.analysis.dataAvailable).toBe(false);
    expect(result.disclaimer).toBe(DISCLAIMER);
  });
});
