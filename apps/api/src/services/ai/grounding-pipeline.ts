import type { MarketDataProvider } from '../market-data/types';
import type { AIProvider } from './types';
import type { ResearchResponse, ChatResponse } from './types';

export interface ResearchPipelineInput {
  symbol: string;
  marketDataProvider: MarketDataProvider;
  aiProvider: AIProvider;
}

export interface ResearchPipelineResult {
  response: ResearchResponse;
  dataAsOf: string;
  disclaimer: string;
  symbol: string;
}

export const DISCLAIMER = 'AI-generated research for informational purposes only. This is not investment advice. No human analyst review. StockSense is not a SEBI-registered investment adviser or research analyst.';

export async function runResearchPipeline(input: ResearchPipelineInput): Promise<ResearchPipelineResult> {
  const { symbol, marketDataProvider, aiProvider } = input;

  // Step 1-2: Identify + fetch required data
  const [quote, fundamentals] = await Promise.all([
    marketDataProvider.getStockQuote(symbol),
    marketDataProvider.getStockFundamentals(symbol),
  ]);

  // Step 3: Validate — note missing fields so downstream AI can report them honestly
  const missingFields: string[] = [];
  if (!quote.price) missingFields.push('currentPrice');
  if (!fundamentals.sector) missingFields.push('sector');
  if (!fundamentals.pe) missingFields.push('pe');
  if (!fundamentals.pb) missingFields.push('pb');
  if (!fundamentals.roe) missingFields.push('roe');
  if (!fundamentals.roce) missingFields.push('roce');
  if (!fundamentals.eps) missingFields.push('eps');
  if (fundamentals.debtToEquity === null) missingFields.push('debtToEquity');
  if (missingFields.length > 0) {
    console.info(`[research/${symbol}] missing fields: ${missingFields.join(', ')}`);
  }

  // Step 4: Inject — build structured prompt context
  const marketData = {
    quote: {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      volume: quote.volume,
      previousClose: quote.previousClose,
    },
    fundamentals: {
      name: fundamentals.name,
      sector: fundamentals.sector,
      industry: fundamentals.industry,
      marketCap: fundamentals.marketCap,
      pe: fundamentals.pe,
      pb: fundamentals.pb,
      roe: fundamentals.roe,
      roce: fundamentals.roce,
      eps: fundamentals.eps,
      debtToEquity: fundamentals.debtToEquity,
      dividendYield: fundamentals.dividendYield,
      week52High: fundamentals.week52High,
      week52Low: fundamentals.week52Low,
    },
    fetchedAt: new Date().toISOString(),
  };

  // Step 5-6: Generate + parse/validate (retries handled inside adapter)
  const response = await aiProvider.generateResearch({ useCase: 'research', symbol, marketData });

  // Step 7: Attach metadata
  return {
    response,
    dataAsOf: fundamentals.dataAsOf,
    disclaimer: DISCLAIMER,
    symbol,
  };
}

// ── Global Markets Note Pipeline ─────────────────────────────────────────
import type { GlobalQuote } from '../market-data/types';
import type { GlobalNoteResponse } from './types';

export interface GlobalNotePipelineInput {
  quotes: GlobalQuote[];
  aiProvider: AIProvider;
}

export async function runGlobalNotePipeline(
  input: GlobalNotePipelineInput
): Promise<GlobalNoteResponse & { disclaimer: string }> {
  const { quotes, aiProvider } = input;
  const marketData = {
    quotes: quotes.map((q) => ({
      symbol: q.symbol,
      name: q.name,
      category: q.category,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      currency: q.currency,
      lastUpdated: q.lastUpdated,
    })),
    fetchedAt: new Date().toISOString(),
  };
  const result = await aiProvider.generateGlobalNote({ useCase: 'global_note', marketData });
  return { ...result, disclaimer: DISCLAIMER };
}

export interface ChatPipelineInput {
  userMessage: string;
  context: Record<string, unknown>;
  aiProvider: AIProvider;
}

export async function runChatPipeline(input: ChatPipelineInput): Promise<ChatResponse & { disclaimer?: string }> {
  const { userMessage, context, aiProvider } = input;
  const response = await aiProvider.generateChatReply({
    useCase: 'chat',
    userMessage,
    marketData: context,
  });
  return {
    ...response,
    disclaimer: response.disclaimer ? DISCLAIMER : undefined,
  };
}

// ── News Sentiment Pipeline ───────────────────────────────────────────────────
import type { NewsItem } from '../news/types';

export interface NewsSentimentPipelineInput {
  articles: NewsItem[];
  aiProvider: AIProvider;
}

export interface ScoredNewsItem extends NewsItem {
  // All sentiment fields guaranteed non-null after pipeline
  sentiment: NonNullable<NewsItem['sentiment']>;
  impact: NonNullable<NewsItem['impact']>;
  sentimentScore: NonNullable<NewsItem['sentimentScore']>;
  sentimentRationale: NonNullable<NewsItem['sentimentRationale']>;
}

// Process articles in batches to stay within token limits
const BATCH_SIZE = 8;

export async function runNewsSentimentPipeline(
  input: NewsSentimentPipelineInput
): Promise<ScoredNewsItem[]> {
  const { articles, aiProvider } = input;
  if (!articles.length) return [];

  const results: ScoredNewsItem[] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    // Step 1: build minimal, token-efficient article payload
    const articlePayload = batch.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary.slice(0, 300), // truncate for prompt efficiency
    }));

    // Step 2: run through AI grounding pipeline
    const response = await aiProvider.generateNewsSentiment({
      useCase: 'news_sentiment',
      marketData: { articles: articlePayload, fetchedAt: new Date().toISOString() },
    });

    // Step 3: merge AI scores back onto original article objects
    const scoreMap = new Map(response.items.map((item) => [item.id, item]));
    for (const article of batch) {
      const score = scoreMap.get(article.id);
      results.push({
        ...article,
        sentiment: score?.sentiment ?? 'neutral',
        impact: score?.impact ?? 'low',
        sentimentScore: score?.sentimentScore ?? 0,
        affectedSymbols: score?.affectedSymbols ?? [],
        affectedSectors: score?.affectedSectors ?? [],
        sentimentRationale: score?.sentimentRationale ?? 'Sentiment could not be determined.',
      });
    }
  }

  return results;
}

// ── Option Chain Interpretation Pipeline (Phase 3.1) ─────────────────────────
// Grounding: PCR, max pain, IV percentile, and OI concentrations are computed
// deterministically by lib/options-greeks.ts. The AI only narrates over those
// numbers — scenario-framed, never directive.
import type { OptionChain } from '../options/types';
import type { OptionChainInterpretationResponse } from './types';

export interface OptionChainPipelineInput {
  chain: OptionChain;
  aiProvider: AIProvider;
}

export interface OptionChainPipelineResult {
  chain: OptionChain;
  interpretation: OptionChainInterpretationResponse;
  disclaimer: string;
}

export async function runOptionChainPipeline(
  input: OptionChainPipelineInput,
): Promise<OptionChainPipelineResult> {
  const { chain, aiProvider } = input;

  // Build top OI strike lists — used as AI grounding inputs, not invented by AI
  const sortedByCallOI = [...chain.strikes].sort((a, b) => b.call.oi - a.call.oi);
  const sortedByPutOI = [...chain.strikes].sort((a, b) => b.put.oi - a.put.oi);

  const marketData = {
    symbol: chain.symbol,
    underlyingPrice: chain.underlyingPrice,
    atmStrike: chain.atmStrike,
    expiry: chain.expiry,
    daysToExpiry: chain.daysToExpiry,
    pcrOI: chain.pcrOI,
    pcrVolume: chain.pcrVolume,
    maxPainStrike: chain.maxPainStrike,
    ivPercentile: chain.ivPercentile,
    totalCallOI: chain.totalCallOI,
    totalPutOI: chain.totalPutOI,
    // Top 4 OI concentrations for key-level notes
    topCallStrikes: sortedByCallOI.slice(0, 4).map((r) => ({
      strikePrice: r.strikePrice,
      oi: r.call.oi,
      oiChange: r.call.oiChange,
      iv: r.call.iv,
    })),
    topPutStrikes: sortedByPutOI.slice(0, 4).map((r) => ({
      strikePrice: r.strikePrice,
      oi: r.put.oi,
      oiChange: r.put.oiChange,
      iv: r.put.iv,
    })),
    fetchedAt: chain.dataAsOf,
  };

  const interpretation = await aiProvider.generateOptionChainInterpretation({
    useCase: 'option_chain',
    symbol: chain.symbol,
    marketData,
  });

  return { chain, interpretation, disclaimer: DISCLAIMER };
}

// ── Portfolio Analysis Pipeline (Phase 2.5) ───────────────────────────────────
// Grounding: risk/diversification scores and per-holding flags are computed
// deterministically (lib/portfolio-risk.ts) from the user's own holdings + P&L.
// The AI only narrates over those grounded numbers — it never emits them.
import type { HoldingPnL } from '../../lib/pnl';
import { calculatePortfolioRisk } from '../../lib/portfolio-risk';
import type { PortfolioRiskMetrics, RiskHoldingInput } from '../../lib/portfolio-risk';
import type { PortfolioAnalysisResponse } from './types';

export interface PortfolioAnalysisPipelineInput {
  holdings: HoldingPnL[];
  marketDataProvider: MarketDataProvider;
  aiProvider: AIProvider;
}

export interface PortfolioAnalysisPipelineResult {
  metrics: PortfolioRiskMetrics;
  analysis: PortfolioAnalysisResponse;
  disclaimer: string;
  dataAsOf: string;
}

export async function runPortfolioAnalysisPipeline(
  input: PortfolioAnalysisPipelineInput,
): Promise<PortfolioAnalysisPipelineResult> {
  const { holdings, marketDataProvider, aiProvider } = input;
  const dataAsOf = new Date().toISOString();

  // Step 1-2: fetch the sector for each unique symbol (grounding input for concentration).
  // Missing sectors degrade gracefully to 'Unknown' rather than being guessed.
  const uniqueSymbols = [...new Set(holdings.map((h) => h.symbol))];
  const sectorResults = await Promise.allSettled(
    uniqueSymbols.map((sym) => marketDataProvider.getStockFundamentals(sym)),
  );
  const sectorMap = new Map<string, string | null>();
  sectorResults.forEach((r, i) => {
    if (r.status === 'fulfilled') sectorMap.set(uniqueSymbols[i], r.value.sector);
  });

  // Step 3: build grounded inputs and compute metrics deterministically.
  const riskInputs: RiskHoldingInput[] = holdings.map((h) => ({
    symbol: h.symbol,
    currentValue: h.currentValue,
    unrealizedPnLPct: h.unrealizedPnLPct,
    sector: sectorMap.get(h.symbol) ?? null,
  }));
  const metrics = calculatePortfolioRisk(riskInputs);

  // Step 4-6: inject only the computed metrics into the AI prompt, generate narrative.
  const analysis = await aiProvider.generatePortfolioAnalysis({
    useCase: 'portfolio_analysis',
    marketData: { metrics, fetchedAt: dataAsOf },
  });

  // Step 7: attach disclaimer (recommendation-shaped output).
  return { metrics, analysis, disclaimer: DISCLAIMER, dataAsOf };
}
