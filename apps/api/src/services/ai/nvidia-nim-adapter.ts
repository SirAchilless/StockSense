import axios from 'axios';
import type { AIProvider, GroundedPromptRequest, ResearchResponse, ChatResponse, GlobalNoteResponse, NewsSentimentBatchResponse, PortfolioAnalysisResponse } from './types';
import { ResearchResponseSchema, ChatResponseSchema, GlobalNoteResponseSchema, NewsSentimentBatchResponseSchema, PortfolioAnalysisResponseSchema } from './types';

const SYSTEM_PROMPT_RESEARCH = `You are a financial research assistant for Indian equity markets.

CRITICAL RULES — violating any of these will result in rejection:
1. Only use the data provided in the <market_data> block below. NEVER invent or estimate values.
2. If a field value is missing or unknown, return null for that field. DO NOT fill in plausible-looking numbers.
3. Return ONLY valid JSON matching the exact schema provided. No preamble, no explanation, no markdown code fences.
4. If the provided data is insufficient for a useful summary, set dataAvailable to false and explain in businessSummary.
5. Confidence (0.0–1.0) reflects how complete the provided data is — not your confidence in the market view.`;

const SYSTEM_PROMPT_CHAT = `You are a financial assistant for Indian equity markets.

CRITICAL RULES:
1. Only use data from the <context> block. Never invent prices, ratios, or any numeric values.
2. If the user asks about data not in the context, say you don't have that data rather than estimating.
3. If your reply contains target prices, entry/exit suggestions, or any recommendation-shaped content, set disclaimer to true.
4. Return ONLY valid JSON matching the exact schema. No preamble.`;

const RESEARCH_SCHEMA_DESCRIPTION = `{
  "businessSummary": "string — what the company does, key revenue drivers",
  "ratios": {
    "pe": "number or null",
    "pb": "number or null",
    "roe": "number or null",
    "roce": "number or null",
    "eps": "number or null",
    "debtToEquity": "number or null"
  },
  "bullCase": "string — 2-3 sentence bull thesis grounded in provided data",
  "bearCase": "string — 2-3 sentence bear thesis grounded in provided data",
  "confidence": "number 0.0–1.0 based on data completeness",
  "dataAvailable": "boolean — false if data is insufficient",
  "missingFields": ["array of field names that were null due to missing data"]
}`;

const CHAT_SCHEMA_DESCRIPTION = `{
  "reply": "string — your response to the user",
  "confidence": "number 0.0–1.0",
  "dataAvailable": "boolean",
  "disclaimer": "boolean — true if reply contains recommendation-shaped content"
}`;

export class NvidiaNimAdapter implements AIProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly researchModel: string;
  private readonly chatModel: string;

  constructor() {
    const mode = process.env.NIM_MODE ?? 'cloud';
    if (mode === 'cloud') {
      if (!process.env.NIM_API_KEY) throw new Error('[ai] NIM_API_KEY is required when NIM_MODE=cloud');
      this.baseUrl = process.env.NIM_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
      this.apiKey = process.env.NIM_API_KEY;
    } else {
      this.baseUrl = process.env.NIM_BASE_URL ?? 'http://localhost:8000/v1';
      this.apiKey = undefined;
    }
    this.researchModel = process.env.NIM_RESEARCH_MODEL ?? 'meta/llama-3.1-70b-instruct';
    this.chatModel = process.env.NIM_CHAT_MODEL ?? 'meta/llama-3.1-8b-instruct';
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    return headers;
  }

  private async callChatCompletion(
    model: string,
    systemPrompt: string,
    userMessage: string
  ): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      },
      { headers: this.buildHeaders(), timeout: 30_000 }
    );
    return response.data.choices[0]?.message?.content ?? '';
  }

  async generateResearch(req: GroundedPromptRequest): Promise<ResearchResponse> {
    const userMessage = `
<market_data>
${JSON.stringify(req.marketData ?? {}, null, 2)}
</market_data>

Generate a research report for ${req.symbol ?? 'the provided stock'}.
Return JSON matching exactly this schema:
${RESEARCH_SCHEMA_DESCRIPTION}
`;
    // Retry once on schema validation failure
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.callChatCompletion(this.researchModel, SYSTEM_PROMPT_RESEARCH, userMessage);
      const parsed = ResearchResponseSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      if (attempt === 1) throw new Error(`AI response failed schema validation after 2 attempts`);
    }
    throw new Error('unreachable');
  }

  async generateChatReply(req: GroundedPromptRequest): Promise<ChatResponse> {
    const userMessage = `
<context>
${JSON.stringify(req.marketData ?? {}, null, 2)}
</context>

User: ${req.userMessage ?? ''}

Return JSON matching this schema:
${CHAT_SCHEMA_DESCRIPTION}
`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.callChatCompletion(this.chatModel, SYSTEM_PROMPT_CHAT, userMessage);
      const parsed = ChatResponseSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      if (attempt === 1) throw new Error(`Chat response failed schema validation after 2 attempts`);
    }
    throw new Error('unreachable');
  }

  async generateGlobalNote(req: GroundedPromptRequest): Promise<GlobalNoteResponse> {
    const SYSTEM_PROMPT_GLOBAL = `You are a financial analyst explaining global market moves to Indian retail investors.

CRITICAL RULES:
1. Only reference data present in the <global_markets> block. Never invent figures.
2. Write a concise 2-3 sentence note explaining what the global moves mean for Indian markets today (FII flows, commodity impact, risk-on/risk-off sentiment).
3. Return ONLY valid JSON. No preamble, no markdown.
4. If data is insufficient, set dataAvailable to false and explain briefly.`;

    const GLOBAL_NOTE_SCHEMA = `{
  "note": "string — 2-3 sentences explaining global moves and their relevance to Indian markets",
  "confidence": "number 0.0–1.0 based on data completeness",
  "dataAvailable": "boolean"
}`;

    const userMessage = `
<global_markets>
${JSON.stringify(req.marketData ?? {}, null, 2)}
</global_markets>

Write the India-relevance note. Return JSON matching exactly:
${GLOBAL_NOTE_SCHEMA}
`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.callChatCompletion(this.chatModel, SYSTEM_PROMPT_GLOBAL, userMessage);
      const parsed = GlobalNoteResponseSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      if (attempt === 1) throw new Error(`Global note failed schema validation after 2 attempts`);
    }
    throw new Error('unreachable');
  }

  async generateNewsSentiment(req: GroundedPromptRequest): Promise<NewsSentimentBatchResponse> {
    const SYSTEM_PROMPT_SENTIMENT = `You are a financial news sentiment analyst for Indian equity markets.

CRITICAL RULES:
1. Only analyse the article titles and summaries provided in the <articles> block. Do not invent information.
2. For each article, assess sentiment (bullish/bearish/neutral), impact (high/medium/low), a score from -1 to +1, affected NSE symbols, affected sectors, and a one-sentence rationale.
3. affectedSymbols must only contain real NSE ticker symbols (e.g. RELIANCE, TCS). If you cannot identify any, return an empty array.
4. affectedSectors must only contain sector names (e.g. Banking, IT, Energy). If none, return empty array.
5. Return ONLY valid JSON. No preamble, no markdown.`;

    const NEWS_SENTIMENT_SCHEMA = `{
  "items": [
    {
      "id": "string — same id as provided",
      "sentiment": "bullish | bearish | neutral",
      "impact": "high | medium | low",
      "sentimentScore": "number -1.0 to +1.0",
      "affectedSymbols": ["NSE ticker strings"],
      "affectedSectors": ["sector name strings"],
      "sentimentRationale": "string — one sentence explanation"
    }
  ],
  "confidence": "number 0.0–1.0",
  "dataAvailable": "boolean"
}`;

    const articles = req.marketData?.articles ?? [];
    const userMessage = `
<articles>
${JSON.stringify(articles, null, 2)}
</articles>

Analyse the sentiment of each article above. Return JSON matching exactly:
${NEWS_SENTIMENT_SCHEMA}
`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.callChatCompletion(this.researchModel, SYSTEM_PROMPT_SENTIMENT, userMessage);
      const parsed = NewsSentimentBatchResponseSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      if (attempt === 1) throw new Error(`News sentiment failed schema validation after 2 attempts`);
    }
    throw new Error('unreachable');
  }

  async generatePortfolioAnalysis(req: GroundedPromptRequest): Promise<PortfolioAnalysisResponse> {
    const SYSTEM_PROMPT_PORTFOLIO = `You are a portfolio analyst for Indian equity investors.

CRITICAL RULES:
1. Only use the pre-computed metrics in the <portfolio_metrics> block. The risk score, diversification score, weights, and per-holding flags are ALREADY CALCULATED — never recompute, override, or invent numeric values. Reference them as given.
2. Frame ALL commentary as scenarios ("if X, then Y may follow"), never as directives. Do NOT tell the user to buy, sell, add, trim, exit, or set targets/stoplosses. Describe conditions and their possible effects only.
3. Provide one scenario-framed note per holding in holdingNotes, using the same symbol strings provided.
4. Return ONLY valid JSON matching the exact schema. No preamble, no markdown.
5. If metrics are empty/insufficient, set dataAvailable to false and say so.`;

    const PORTFOLIO_SCHEMA = `{
  "overallAssessment": "string — 2-3 sentences summarising composition using the provided scores",
  "riskCommentary": "string — scenario-framed risk observations grounded in concentration/sector metrics",
  "diversificationCommentary": "string — scenario-framed diversification observations",
  "holdingNotes": [ { "symbol": "string (as provided)", "note": "string — scenario-framed, non-directive" } ],
  "confidence": "number 0.0–1.0 based on metric completeness",
  "dataAvailable": "boolean"
}`;

    const userMessage = `
<portfolio_metrics>
${JSON.stringify(req.marketData ?? {}, null, 2)}
</portfolio_metrics>

Write the portfolio analysis. Return JSON matching exactly:
${PORTFOLIO_SCHEMA}
`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.callChatCompletion(this.researchModel, SYSTEM_PROMPT_PORTFOLIO, userMessage);
      const parsed = PortfolioAnalysisResponseSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      if (attempt === 1) throw new Error(`Portfolio analysis failed schema validation after 2 attempts`);
    }
    throw new Error('unreachable');
  }
}
