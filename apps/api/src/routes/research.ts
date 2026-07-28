import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { getMarketDataProvider } from '../services/market-data';
import { getAIProvider, runResearchPipeline } from '../services/ai';
import { prisma } from '../lib/prisma';

export const researchRouter = Router();
researchRouter.use(authenticate);

const researchLimiter = rateLimit({ windowMs: 60_000, max: 10 });

// GET /research/:symbol
researchRouter.get('/:symbol', researchLimiter, async (req, res) => {
  const symbolParam = req.params.symbol?.toUpperCase().trim();
  const parsed = z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9&\-]+$/)
    .safeParse(symbolParam);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid symbol' });
    return;
  }
  const symbol = parsed.data;
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  try {
    // Check cache
    const cached = await prisma.researchSnapshot.findFirst({
      where: {
        symbol,
        createdAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cached) {
      res.json({ data: { ...(cached.response as object), cached: true } });
      return;
    }

    // Run grounding pipeline
    const result = await runResearchPipeline({
      symbol,
      marketDataProvider: getMarketDataProvider(),
      aiProvider: getAIProvider(),
    });

    // Cache result
    await prisma.researchSnapshot.create({
      data: {
        symbol,
        userId: req.user!.id,
        dataAsOf: result.dataAsOf,
        response: {
          symbol: result.symbol,
          response: result.response,
          dataAsOf: result.dataAsOf,
          disclaimer: result.disclaimer,
          cached: false,
        },
      },
    });

    res.json({
      data: {
        symbol: result.symbol,
        response: result.response,
        dataAsOf: result.dataAsOf,
        disclaimer: result.disclaimer,
        cached: false,
      },
    });
  } catch (err) {
    console.error(`[research/${symbol}]`, err);
    res.status(502).json({ error: 'Research generation failed. Please try again.' });
  }
});
