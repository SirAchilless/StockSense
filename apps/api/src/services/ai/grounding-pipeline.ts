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
