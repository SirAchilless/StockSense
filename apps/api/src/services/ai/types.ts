import { z } from 'zod';

// ──────────────────────────────
// Output schema (zod)
// ──────────────────────────────
export const ResearchResponseSchema = z.object({
  businessSummary: z.string().min(1),
  ratios: z.object({
    pe: z.number().nullable(),
    pb: z.number().nullable(),
    roe: z.number().nullable(),
    roce: z.number().nullable(),
    eps: z.number().nullable(),
    debtToEquity: z.number().nullable(),
  }),
  bullCase: z.string().min(1),
  bearCase: z.string().min(1),
  confidence: z.number().min(0).max(1),
  dataAvailable: z.boolean(),
  missingFields: z.array(z.string()),
});

export type ResearchResponse = z.infer<typeof ResearchResponseSchema>;

export const ChatResponseSchema = z.object({
  reply: z.string().min(1),
  confidence: z.number().min(0).max(1),
  dataAvailable: z.boolean(),
  disclaimer: z.boolean(), // true if the reply contains recommendation-shaped content
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const GlobalNoteResponseSchema = z.object({
  note: z.string().min(1),
  confidence: z.number().min(0).max(1),
  dataAvailable: z.boolean(),
});

export type GlobalNoteResponse = z.infer<typeof GlobalNoteResponseSchema>;

// ── News Sentiment ────────────────────────────────────────────────────────────
export const NewsItemSentimentSchema = z.object({
  id: z.string(),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  impact: z.enum(['high', 'medium', 'low']),
  sentimentScore: z.number().min(-1).max(1),
  affectedSymbols: z.array(z.string()),
  affectedSectors: z.array(z.string()),
  sentimentRationale: z.string().min(1),
});

export const NewsSentimentBatchResponseSchema = z.object({
  items: z.array(NewsItemSentimentSchema),
  confidence: z.number().min(0).max(1),
  dataAvailable: z.boolean(),
});

export type NewsItemSentiment = z.infer<typeof NewsItemSentimentSchema>;
export type NewsSentimentBatchResponse = z.infer<typeof NewsSentimentBatchResponseSchema>;

// ──────────────────────────────
// Grounded prompt request
// ──────────────────────────────
export interface GroundedPromptRequest {
  useCase: 'research' | 'chat' | 'global_note' | 'news_sentiment';
  symbol?: string;
  marketData?: Record<string, unknown>;  // pre-fetched, injected verbatim
  userMessage?: string;                  // for chat use case
}

// ──────────────────────────────
// Provider interface
// ──────────────────────────────
export interface AIProvider {
  generateResearch(req: GroundedPromptRequest): Promise<ResearchResponse>;
  generateChatReply(req: GroundedPromptRequest): Promise<ChatResponse>;
  generateGlobalNote(req: GroundedPromptRequest): Promise<GlobalNoteResponse>;
  generateNewsSentiment(req: GroundedPromptRequest): Promise<NewsSentimentBatchResponse>;
}
