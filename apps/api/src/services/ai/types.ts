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

// ──────────────────────────────
// Grounded prompt request
// ──────────────────────────────
export interface GroundedPromptRequest {
  useCase: 'research' | 'chat';
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
}
