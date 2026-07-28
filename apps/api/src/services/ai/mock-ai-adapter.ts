import type { AIProvider, GroundedPromptRequest, ResearchResponse, ChatResponse } from './types';

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
}
