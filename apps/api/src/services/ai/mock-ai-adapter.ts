import type { AIProvider, GroundedPromptRequest, ResearchResponse, ChatResponse, GlobalNoteResponse, NewsSentimentBatchResponse, PortfolioAnalysisResponse, OptionChainInterpretationResponse } from './types';

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

  async generatePortfolioAnalysis(req: GroundedPromptRequest): Promise<PortfolioAnalysisResponse> {
    const metrics = (req.marketData?.metrics ?? {}) as {
      riskScore?: number;
      riskLevel?: string;
      diversificationScore?: number;
      largestPositionPct?: number;
      holdingCount?: number;
      sectorCount?: number;
      effectiveHoldings?: number;
      holdings?: Array<{ symbol: string; weightPct: number; unrealizedPnLPct: number; flag: string; sector: string }>;
      sectorAllocation?: Array<{ sector: string; weightPct: number }>;
    };
    const holdings = metrics.holdings ?? [];

    if (!holdings.length) {
      return {
        overallAssessment: 'No holdings are available to analyse. Add holdings or import a portfolio to receive an assessment.',
        riskCommentary: 'Insufficient data to assess portfolio risk.',
        diversificationCommentary: 'Insufficient data to assess diversification.',
        holdingNotes: [],
        confidence: 0.1,
        dataAvailable: false,
      };
    }

    const riskLevel = metrics.riskLevel ?? 'moderate';
    const riskScore = metrics.riskScore ?? 0;
    const divScore = metrics.diversificationScore ?? 0;
    const topSector = metrics.sectorAllocation?.[0];
    const largest = holdings[0];

    // Scenario-framed language only — no directive buy/sell/target/stoploss instructions.
    const overallAssessment =
      `This portfolio holds ${metrics.holdingCount ?? holdings.length} position(s) across ` +
      `${metrics.sectorCount ?? 1} sector(s), with an effective breadth of roughly ` +
      `${(metrics.effectiveHoldings ?? 0).toFixed(1)} equally-weighted names. Based only on current ` +
      `composition, its computed risk score is ${riskScore}/100 (${riskLevel}) and its diversification ` +
      `score is ${divScore}/100.`;

    const riskCommentary =
      topSector
        ? `The largest single position, ${largest.symbol}, represents about ${largest.weightPct.toFixed(1)}% of value, ` +
          `and ${topSector.sector} accounts for roughly ${topSector.weightPct.toFixed(1)}% of the book. ` +
          `If ${topSector.sector} were to face a broad drawdown, the portfolio may see an outsized impact given this concentration; ` +
          `were exposure spread across more names or sectors, that scenario would likely have a smaller effect.`
        : `If the portfolio's largest positions were to decline together, the impact may be amplified by their combined weight.`;

    const diversificationCommentary =
      divScore >= 67
        ? 'Holdings are relatively well spread; a shock to any single name or sector would likely have a contained effect on the whole.'
        : divScore >= 34
          ? 'Diversification is moderate. If additional uncorrelated names or sectors were added, concentration-driven swings may soften.'
          : 'Concentration is high. If the dominant position or sector moved sharply, the portfolio would likely move with it; broadening exposure may reduce that sensitivity.';

    const holdingNotes = holdings.map((h) => {
      const scenario =
        h.flag === 'strong'
          ? `is currently up ${h.unrealizedPnLPct.toFixed(1)}%. If the move that drove this reverses, the unrealised gain may compress — its ${h.weightPct.toFixed(1)}% weight sizes that scenario.`
          : h.flag === 'weak'
            ? `is currently down ${Math.abs(h.unrealizedPnLPct).toFixed(1)}%. If weakness persists, it may continue to drag on returns; if the thesis recovers, the ${h.weightPct.toFixed(1)}% weight sets the potential rebound contribution.`
            : `is roughly flat (${h.unrealizedPnLPct.toFixed(1)}%). Its ${h.weightPct.toFixed(1)}% weight determines how much any future move would move the overall portfolio.`;
      return { symbol: h.symbol, note: `${h.symbol} (${h.sector}) ${scenario}` };
    });

    return {
      overallAssessment,
      riskCommentary,
      diversificationCommentary,
      holdingNotes,
      confidence: 0.7,
      dataAvailable: true,
    };
  }

  async generateOptionChainInterpretation(req: GroundedPromptRequest): Promise<OptionChainInterpretationResponse> {
    const data = (req.marketData ?? {}) as {
      symbol?: string;
      pcrOI?: number;
      pcrVolume?: number;
      maxPainStrike?: number;
      underlyingPrice?: number;
      atmStrike?: number;
      daysToExpiry?: number;
      ivPercentile?: number;
      totalCallOI?: number;
      totalPutOI?: number;
      topCallStrikes?: Array<{ strikePrice: number; oi: number }>;
      topPutStrikes?: Array<{ strikePrice: number; oi: number }>;
    };

    const { symbol = 'underlying', pcrOI = 1, maxPainStrike = 0, underlyingPrice = 0,
            daysToExpiry = 7, ivPercentile = 50, topCallStrikes = [], topPutStrikes = [] } = data;

    if (!underlyingPrice) {
      return {
        marketBiasNote: 'Insufficient option chain data to determine market bias.',
        maxPainNote: 'Max pain data unavailable.',
        ivNote: 'IV data unavailable.',
        keyLevelNotes: [],
        confidence: 0.1,
        dataAvailable: false,
      };
    }

    // PCR interpretation: >1.2 = moderately bearish OI bias, <0.8 = moderately bullish
    const pcrLabel = pcrOI > 1.3 ? 'elevated (bearish bias)' : pcrOI < 0.8 ? 'low (bullish bias)' : 'near neutral';
    const marketBiasNote =
      `The PCR OI for ${symbol} stands at ${pcrOI.toFixed(2)}, which is ${pcrLabel}. ` +
      `If this ratio persists into expiry, it may suggest that put sellers are positioned for support, ` +
      `though a rapid move below key put OI strikes could trigger dealer delta-hedging and amplify downside.`;

    const mpDiff = maxPainStrike > 0 ? +(maxPainStrike - underlyingPrice).toFixed(0) : 0;
    const mpDir = mpDiff > 0 ? 'above' : mpDiff < 0 ? 'below' : 'at';
    const maxPainNote =
      `Max pain is computed at ${maxPainStrike.toLocaleString('en-IN')}, which is ${Math.abs(mpDiff)} points ${mpDir} the current spot. ` +
      `With ${daysToExpiry} day(s) remaining, if spot gravitates toward max pain as time value decays, ` +
      `it may imply limited directional move from here; a sharp break away from this level would benefit ` +
      `option buyers significantly.`;

    const ivLabel = ivPercentile >= 75 ? 'high relative to recent history' : ivPercentile <= 25 ? 'low (compressed)' : 'moderate';
    const ivNote =
      `IV percentile is at ${ivPercentile}, indicating that options are currently priced ${ivLabel}. ` +
      (ivPercentile >= 75
        ? 'If implied volatility reverts toward its mean, option buyers would see time value erode faster than usual; sellers tend to benefit in high-IV environments if the move fails to materialise.'
        : ivPercentile <= 25
          ? 'Low IV typically makes buying options cheaper in premium terms; if a catalyst emerges and realised volatility picks up, option buyers could see significant gains in extrinsic value.'
          : 'Moderate IV suggests option pricing is broadly in line with recent norms; no strong directional premium signal from volatility alone.');

    // Key level notes from top OI concentrations
    const keyLevelNotes = [
      ...topCallStrikes.slice(0, 2).map((s) => ({
        strikePrice: s.strikePrice,
        note: `${s.strikePrice.toLocaleString('en-IN')} CE has the highest call OI (${s.oi.toLocaleString('en-IN')} contracts), acting as a potential resistance zone. If spot approaches this level and OI does not unwind, sellers may defend it; a breakout with volume could accelerate the move.`,
      })),
      ...topPutStrikes.slice(0, 2).map((s) => ({
        strikePrice: s.strikePrice,
        note: `${s.strikePrice.toLocaleString('en-IN')} PE has the highest put OI (${s.oi.toLocaleString('en-IN')} contracts), acting as a potential support zone. Unwinding of this OI may signal weakening support; addition of OI on a down-move could indicate increased hedging by large players.`,
      })),
    ];

    return {
      marketBiasNote,
      maxPainNote,
      ivNote,
      keyLevelNotes,
      confidence: 0.72,
      dataAvailable: true,
    };
  }
}
