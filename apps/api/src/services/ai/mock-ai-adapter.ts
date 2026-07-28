import type { AIProvider, GroundedPromptRequest, ResearchResponse, ChatResponse, GlobalNoteResponse, NewsSentimentBatchResponse } from './types';

export class MockAIAdapter implements AIProvider {
  async generateResearch(req: GroundedPromptRequest): Promise<ResearchResponse> {
    const data = req.marketData ?? {};
    const fundamentals = (data.fundamentals ?? {}) as Record<string, unknown>;
    const quote = (data.quote ?? {}) as Record<string, unknown>;
    // hasData is true only when there is meaningful financial content — not just
    // structural keys like symbol/name/dataAsOf that are always present
    const hasFinancialData = [
      fundamentals.pe, fundamentals.pb, fundamentals.roe, fundamentals.roce,
      fundamentals.eps, fundamentals.debtToEquity, fundamentals.marketCap,
      fundamentals.sector,
    ].some(v => v != null);
    const hasQuotePrice = typeof quote.price === 'number' && (quote.price as number) > 0;
    const hasData = hasFinancialData || hasQuotePrice;
    const hasRatios = fundamentals.pe != null || fundamentals.roe != null;

    return {
      businessSummary: hasData
        ? `${req.symbol ?? 'This company'} is a leading Indian company operating in its sector. Based on the provided data, it shows key financial metrics and market positioning.`
        : 'Insufficient data available to generate a business summary.',
      ratios: {
        pe: typeof fundamentals.pe === 'number' ? fundamentals.pe : null,
        pb: typeof fundamentals.pb === 'number' ? fundamentals.pb : null,
        roe: typeof fundamentals.roe === 'number' ? fundamentals.roe : null,
        roce: typeof fundamentals.roce === 'number' ? fundamentals.roce : null,
        eps: typeof fundamentals.eps === 'number' ? fundamentals.eps : null,
        debtToEquity: typeof fundamentals.debtToEquity === 'number' ? fundamentals.debtToEquity : null,
      },
      bullCase: hasData
        ? 'Based on the provided financials, the company demonstrates strong fundamentals that may support growth.'
        : 'Insufficient data to construct a bull case.',
      bearCase: hasData
        ? 'Key risks include market conditions and sector headwinds as reflected in the provided data.'
        : 'Insufficient data to construct a bear case.',
      confidence: hasRatios ? 0.75 : hasData ? 0.4 : 0.1,
      dataAvailable: hasData,
      missingFields: Object.entries({
        pe: fundamentals.pe, pb: fundamentals.pb, roe: fundamentals.roe,
        roce: fundamentals.roce, eps: fundamentals.eps, debtToEquity: fundamentals.debtToEquity,
      }).filter(([, v]) => v == null).map(([k]) => k),
    };
  }

  async generateChatReply(req: GroundedPromptRequest): Promise<ChatResponse> {
    const hasData = Object.keys(req.marketData ?? {}).length > 0;
    return {
      reply: hasData
        ? `Based on the available data: ${req.userMessage ?? ''} — here is what I can tell you from the provided context.`
        : "I don't have enough data to answer that question. Please view a stock's research page first.",
      confidence: hasData ? 0.7 : 0.1,
      dataAvailable: hasData,
      disclaimer: false,
    };
  }

  async generateGlobalNote(req: GroundedPromptRequest): Promise<GlobalNoteResponse> {
    const quotes = (req.marketData?.quotes ?? []) as Array<{ name: string; changePercent: number }>;
    const hasData = quotes.length > 0;
    if (!hasData) {
      return { note: 'Insufficient global market data to generate a note.', confidence: 0.1, dataAvailable: false };
    }
    const movers = quotes
      .filter((q) => Math.abs(q.changePercent) > 0.5)
      .slice(0, 3)
      .map((q) => `${q.name} (${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`)
      .join(', ');
    return {
      note: movers
        ? `Key global moves today: ${movers}. These may influence Indian market sentiment at open through FII flows, commodity pricing, and risk appetite.`
        : 'Global markets are relatively flat today; limited directional impact on Indian equities is expected.',
      confidence: 0.8,
      dataAvailable: true,
    };
  }

  async generateNewsSentiment(req: GroundedPromptRequest): Promise<NewsSentimentBatchResponse> {
    const articles = (req.marketData?.articles ?? []) as Array<{
      id: string; title: string; summary: string;
    }>;

    if (!articles.length) {
      return { items: [], confidence: 0.1, dataAvailable: false };
    }

    // Deterministic mock: score based on presence of positive/negative keywords
    const BULLISH_KW = ['rises', 'record', 'beats', 'growth', 'profit', 'high', 'gains', 'up', 'rally', 'positive', 'strong'];
    const BEARISH_KW = ['falls', 'miss', 'down', 'concern', 'pressure', 'weak', 'cut', 'lower', 'decline', 'loss', 'risk'];

    const items = articles.map((article) => {
      const text = `${article.title} ${article.summary}`.toLowerCase();
      const bullScore = BULLISH_KW.filter((kw) => text.includes(kw)).length;
      const bearScore = BEARISH_KW.filter((kw) => text.includes(kw)).length;
      const net = bullScore - bearScore;

      const sentiment = net > 1 ? 'bullish' : net < -1 ? 'bearish' : 'neutral';
      const sentimentScore = Math.min(1, Math.max(-1, net * 0.2));
      const impact = Math.abs(net) >= 3 ? 'high' : Math.abs(net) >= 1 ? 'medium' : 'low';

      // Extract capitalised words as potential symbols (rough heuristic for mock)
      const symbolCandidates = (article.title.match(/\b[A-Z]{2,10}\b/g) ?? [])
        .filter((w) => !['THE', 'AND', 'FOR', 'RBI', 'PMI', 'FII', 'DII', 'YOY', 'QOQ', 'SEBI', 'NSE', 'BSE'].includes(w));

      return {
        id: article.id,
        sentiment: sentiment as 'bullish' | 'bearish' | 'neutral',
        impact: impact as 'high' | 'medium' | 'low',
        sentimentScore,
        affectedSymbols: symbolCandidates.slice(0, 3),
        affectedSectors: [],
        sentimentRationale: `Mock sentiment based on keyword analysis (bull: ${bullScore}, bear: ${bearScore}).`,
      };
    });

    return { items, confidence: 0.65, dataAvailable: true };
  }
}
