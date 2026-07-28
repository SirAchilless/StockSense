import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { getMarketDataProvider } from '../services/market-data';
import { getAIProvider, runChatPipeline, DISCLAIMER } from '../services/ai';
import { prisma } from '../lib/prisma';

export const chatRouter = Router();
chatRouter.use(authenticate);

const chatLimiter = rateLimit({ windowMs: 60_000, max: 20 });

const SendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  threadId: z.string().cuid().optional(),
  // Optional symbol context — if provided, market data is fetched and injected
  symbol: z
    .string()
    .max(20)
    .regex(/^[A-Z0-9&\-]+$/)
    .optional(),
});

// POST /chat/message
// Creates or continues a thread. Returns the assistant reply + threadId.
chatRouter.post('/message', chatLimiter, async (req, res) => {
  const parsed = SendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const userId = (req.user as { id: string }).id;
  const { message, threadId, symbol } = parsed.data;

  try {
    // ── Thread resolution ──────────────────────────────────────────────────
    let thread = threadId
      ? await prisma.chatThread.findFirst({ where: { id: threadId, userId } })
      : null;

    if (threadId && !thread) {
      res.status(404).json({ error: 'Thread not found.' });
      return;
    }

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          userId,
          symbol: symbol ?? null,
          // Use first 60 chars of user message as thread title
          title: message.slice(0, 60),
        },
      });
    }

    // ── Context assembly (grounding pipeline) ─────────────────────────────
    // Determine which symbol to load context for:
    // 1. Explicit symbol in this request
    // 2. Symbol scoped to the thread
    // 3. None — chat proceeds with empty context and AI says so
    const contextSymbol = symbol ?? thread.symbol ?? null;
    let context: Record<string, unknown> = {};

    if (contextSymbol) {
      const provider = getMarketDataProvider();
      const [quote, fundamentals] = await Promise.all([
        provider.getStockQuote(contextSymbol).catch(() => null),
        provider.getStockFundamentals(contextSymbol).catch(() => null),
      ]);

      if (quote || fundamentals) {
        context = {
          symbol: contextSymbol,
          quote: quote ?? null,
          fundamentals: fundamentals ?? null,
          fetchedAt: new Date().toISOString(),
        };
      }
    }

    // Fetch last 6 messages for conversational continuity (3 turns)
    const history = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 6,
    });

    const contextWithHistory: Record<string, unknown> = {
      ...context,
      conversationHistory: history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
    };

    // ── Run grounding pipeline ─────────────────────────────────────────────
    const aiProvider = getAIProvider();
    const result = await runChatPipeline({
      userMessage: message,
      context: contextWithHistory,
      aiProvider,
    });

    // ── Persist both messages atomically ──────────────────────────────────
    const [, assistantMsg] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: { threadId: thread.id, role: 'user', content: message, disclaimer: false },
      }),
      prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: 'assistant',
          content: result.reply,
          disclaimer: result.disclaimer ? true : false,
          confidence: result.confidence,
        },
      }),
    ]);

    res.json({
      data: {
        threadId: thread.id,
        messageId: assistantMsg.id,
        reply: result.reply,
        confidence: result.confidence,
        dataAvailable: result.dataAvailable,
        disclaimer: result.disclaimer ? DISCLAIMER : null,
        contextSymbol: contextSymbol ?? null,
      },
    });
  } catch (err) {
    console.error('[chat/message]', err);
    res.status(502).json({ error: 'Chat unavailable. Please try again.' });
  }
});

// GET /chat/threads — list user's threads (latest first)
chatRouter.get('/threads', async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const threads = await prisma.chatThread.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { id: true, title: true, symbol: true, updatedAt: true },
  });
  res.json({ data: threads });
});

// GET /chat/threads/:threadId/messages — load message history
chatRouter.get('/threads/:threadId/messages', async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const thread = await prisma.chatThread.findFirst({
    where: { id: req.params.threadId, userId },
  });
  if (!thread) {
    res.status(404).json({ error: 'Thread not found.' });
    return;
  }
  const messages = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ data: { thread, messages } });
});
