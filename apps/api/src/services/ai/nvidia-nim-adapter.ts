import axios from 'axios';
import type { AIProvider, GroundedPromptRequest, ResearchResponse, ChatResponse, GlobalNoteResponse } from './types';
import { ResearchResponseSchema, ChatResponseSchema, GlobalNoteResponseSchema } from './types';

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
}
