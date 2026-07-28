import type { MarketDataProvider } from '../market-data/types';
import type { AIProvider } from './types';
import type { ResearchResponse } from './types';

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

// Regulation-compliant disclaimer (Constraint 2.2 — exact, non-negotiable text).
// Every AI-generated response that could be interpreted as research / advice
// MUST include this exact string. It is enforced at component level on the
// frontend via the <AIDisclaimer/> component and echoed here for API consumers.
export const DISCLAIMER =
  'For informational purposes only. Not investment advice. AI-generated content with no human analyst review. Not SEBI-registered advisory.';

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

export interface ChatPipelineResult {
  reply: string;
  confidence: number;
  dataAvailable: boolean;
  // Optional disclaimer text (not a boolean) — appended only when the AI
  // flags the reply as recommendation-shaped. Returns undefined otherwise.
  disclaimer?: string;
}

export async function runChatPipeline(input: ChatPipelineInput): Promise<ChatPipelineResult> {
  const { userMessage, context, aiProvider } = input;
  const response = await aiProvider.generateChatReply({
    useCase: 'chat',
    userMessage,
    marketData: context,
  });
  return {
    reply: response.reply,
    confidence: response.confidence,
    dataAvailable: response.dataAvailable,
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

// ── F&O Intelligence Pipeline (Phase 3.2) ─────────────────────────────────────
// Grounding: rollover %, cost of carry, FII/DII net OI, participant metrics are
// all computed deterministically (lib/fno-analytics.ts) before the AI call.
// The AI only narrates — scenario-framed, never directive, never re-emitting numbers.
import type { FnoDataProvider, RolloverData, FiiDerPositionSummary, ParticipantOIData } from '../fno/types';
import type { FnoInterpretationResponse } from './types';
import { computeParticipantMetrics } from '../../lib/fno-analytics';

export interface FnoPipelineInput {
  symbol: string;
  fnoProvider: FnoDataProvider;
  aiProvider: AIProvider;
}

export interface FnoPipelineResult {
  rollover: RolloverData;
  fiiPositions: FiiDerPositionSummary;
  participantOI: ParticipantOIData;
  interpretation: FnoInterpretationResponse;
  disclaimer: string;
  dataAsOf: string;
}

export async function runFnoPipeline(input: FnoPipelineInput): Promise<FnoPipelineResult> {
  const { symbol, fnoProvider, aiProvider } = input;
  const dataAsOf = new Date().toISOString();

  // Step 1: fetch all three data sources concurrently
  const [rollover, fiiPositions, participantOI] = await Promise.all([
    fnoProvider.getRolloverData(symbol),
    fnoProvider.getFiiDerPositions(),
    fnoProvider.getParticipantOI(),
  ]);

  // Step 2: derive participant metrics deterministically
  const participantMetrics = computeParticipantMetrics(participantOI.rows);

  // Step 2b: validate (Constraint 2.3 VALIDATE step)
  const missing: string[] = [];
  if (!(rollover.rolloverPercent >= 0 && rollover.rolloverPercent <= 100)) missing.push('rolloverPercent');
  if (fiiPositions.series.length === 0) missing.push('fiiPositions.series');
  if (participantOI.rows.length === 0) missing.push('participantOI.rows');
  if (missing.length > 0) {
    // Must NOT call AI when data is incomplete. Return typed error shape.
    return {
      rollover,
      fiiPositions,
      participantOI,
      interpretation: {
        rolloverNote: 'Data unavailable.',
        fiiPositioningNote: 'Data unavailable.',
        diiPositioningNote: 'Data unavailable.',
        costOfCarryNote: 'Data unavailable.',
        overallNote: `Data unavailable: missing/invalid ${missing.join(', ')}.`,
        confidence: 0,
        dataAvailable: false,
      },
      disclaimer: DISCLAIMER,
      dataAsOf,
    };
  }

  // Step 3: build grounded prompt payload — only computed numbers, never raw series
  const marketData = {
    symbol: rollover.symbol,
    rolloverPercent: rollover.rolloverPercent,
    threeMonthAvgRollover: rollover.threeMonthAvgRollover,
    rolloverVsAvgDiff: rollover.rolloverVsAvgDiff,
    currentExpiry: rollover.currentExpiry,
    nextExpiry: rollover.nextExpiry,
    daysToCurrentExpiry: rollover.daysToCurrentExpiry,
    costOfCarryCurrent: rollover.costOfCarryCurrent,
    costOfCarryNext: rollover.costOfCarryNext,
    fiiIndexFutNetOI: fiiPositions.latestFiiIndexFutNetOI,
    fiiStockFutNetOI: fiiPositions.latestFiiStockFutNetOI,
    fiiNetFuturesBuy5d: fiiPositions.fiiNetFuturesBuy5d,
    fiiNetOptionsBuy5d: fiiPositions.fiiNetOptionsBuy5d,
    fiiIndexPCR: fiiPositions.latestFiiIndexPCR,
    diiNetFuturesBuy5d: fiiPositions.diiNetFuturesBuy5d,
    fiiLongShortRatio: participantMetrics.fiiLongShortRatio,
    fiiNetLongPct: participantMetrics.fiiNetLongPct,
    clientVsFiiContra: participantMetrics.clientVsFiiContra,
    proNetLong: participantMetrics.proNetLong,
    fetchedAt: dataAsOf,
  };

  // Step 4: AI narrates over grounded numbers only
  const interpretation = await aiProvider.generateFnoInterpretation({
    useCase: 'fno_intelligence',
    symbol,
    marketData,
  });

  return { rollover, fiiPositions, participantOI, interpretation, disclaimer: DISCLAIMER, dataAsOf };
}

// ── F&O v2 AI Commentary Pipeline (Phase 3.2 C.4) ─────────────────────────────
// Reuses the AIProvider interface — no separate inference client. Follows the
// strict 6-step pipeline: FETCH → VALIDATE → SERIALIZE → PROMPT → RESPOND → DISCLAIM.
import type { FnOProvider } from '@stocksense/market-data';
import { DataUnavailableError } from '../../lib/errors';

export interface FnoAICommentaryInput {
  symbol: string;
  metrics: string[];
  fnoProvider: FnOProvider;
  aiProvider: AIProvider;
}

export interface FnoAICommentaryResult {
  commentary: string;
  confidence: number;
  dataAvailable: boolean;
  disclaimer: string;
  dataAsOf: string;
  metricsIncluded: string[];
}

const SYSTEM_PROMPT_FNO =
  'You are analysing F&O market data for an Indian equity/derivative symbol. ' +
  'Reason ONLY over the data block provided below. Do not reference any price, OI, ' +
  'PCR, rollover, or participant figure that is not present in the data. ' +
  'If a conclusion cannot be drawn from the data provided, say so explicitly. ' +
  'Do not issue buy, sell, target, or stop-loss recommendations. ' +
  'Keep the response concise (150–250 words), scenario-framed, and educational.';

export async function runFnoAICommentary(input: FnoAICommentaryInput): Promise<FnoAICommentaryResult> {
  const { symbol, metrics, fnoProvider, aiProvider } = input;
  const dataAsOf = new Date().toISOString();

  // Step 1: FETCH
  const fetched: Record<string, unknown> = { symbol, asOf: dataAsOf };
  if (metrics.includes('rollover')) fetched.rollover = await fnoProvider.getRolloverData(symbol);
  if (metrics.includes('participant_oi')) fetched.participantOI = await fnoProvider.getParticipantOI(dataAsOf.slice(0, 10));
  if (metrics.includes('cost_of_carry')) fetched.costOfCarry = await fnoProvider.getCostOfCarry(symbol);
  if (metrics.includes('oi_trends')) fetched.oiTrends = await fnoProvider.getOITrends(symbol);
  if (metrics.includes('pcr')) fetched.pcr = await fnoProvider.getPCR(symbol);
  if (metrics.includes('market_wide_pcr')) fetched.marketWidePCR = await fnoProvider.getMarketWidePCR();

  // Step 2: VALIDATE — reject on any missing/invalid numeric field (do NOT call AI)
  const validateNumber = (v: unknown, _field: string): boolean =>
    typeof v === 'number' && Number.isFinite(v);
  const errors: string[] = [];

  if (metrics.includes('rollover')) {
    const r = fetched.rollover as { rolloverPct?: number } | undefined;
    if (!r || !validateNumber(r.rolloverPct, 'rolloverPct') || (r.rolloverPct as number) < 0 || (r.rolloverPct as number) > 100) {
      errors.push('rolloverPct');
    }
  }
  if (metrics.includes('pcr')) {
    const p = fetched.pcr as { pcrOI?: number } | undefined;
    if (!p || !validateNumber(p.pcrOI, 'pcrOI') || (p.pcrOI as number) <= 0) errors.push('pcrOI');
  }
  if (metrics.includes('participant_oi')) {
    const po = fetched.participantOI as unknown[] | undefined;
    if (!Array.isArray(po) || po.length === 0) errors.push('participantOI');
  }

  if (errors.length > 0) {
    throw new DataUnavailableError(`Missing/invalid F&O data fields: ${errors.join(', ')}`, {
      details: { fields: errors },
    });
  }

  // Step 3: SERIALIZE
  const marketData = JSON.parse(JSON.stringify(fetched)); // safe structured clone

  // Step 4-5: PROMPT + RESPOND — reuse the same AIProvider interface via a
  // generic completion helper (falls back to mock if no NVIDIA key set).
  const result = await aiProvider.generateFnoInterpretation({
    useCase: 'fno_intelligence',
    symbol,
    marketData: { ...marketData, _system: SYSTEM_PROMPT_FNO },
  });

  // Step 6: DISCLAIM applied at the response boundary
  return {
    commentary: [result.rolloverNote, result.fiiPositioningNote, result.diiPositioningNote,
      result.costOfCarryNote, result.overallNote].filter(Boolean).join('\n\n'),
    confidence: result.confidence,
    dataAvailable: result.dataAvailable,
    disclaimer: DISCLAIMER,
    dataAsOf,
    metricsIncluded: metrics,
  };
}
