import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { getNewsProvider } from '../services/news';
import { getAIProvider } from '../services/ai';
import { runNewsSentimentPipeline } from '../services/ai/grounding-pipeline';

export const newsRouter = Router();
newsRouter.use(authenticate);

// Generous limit — news fetches real RSS, not heavy AI per article by default
const newsLimiter = rateLimit({ windowMs: 60_000, max: 20 });
// Sentiment scoring hits AI provider — tighter limit
const sentimentLimiter = rateLimit({ windowMs: 60_000, max: 5 });

const limitSchema = z.coerce.number().int().min(1).max(50).default(10);

// GET /news?limit=10&sentiment=true
// Returns latest market news. Pass sentiment=true to run the AI scoring pass.
newsRouter.get('/', newsLimiter, async (req, res) => {
  const limitResult  = limitSchema.safeParse(req.query.limit);
  const withSentiment = req.query.sentiment === 'true';
  const limit = limitResult.success ? limitResult.data : 10;

  try {
    const provider = getNewsProvider();
    let articles = await provider.getMarketNews(limit);

    if (withSentiment && articles.length > 0) {
      const aiProvider = getAIProvider();
      // Only score articles that haven't been scored yet
      const unscored = articles.filter((a) => a.sentiment === null);
      const scored   = articles.filter((a) => a.sentiment !== null);

      if (unscored.length > 0) {
        const sentimentResults = await runNewsSentimentPipeline({ articles: unscored, aiProvider });
        // Merge back in original order
        const scoredMap = new Map(sentimentResults.map((a) => [a.id, a]));
        articles = articles.map((a) => scoredMap.get(a.id) ?? a);
        void scored; // already scored items kept as-is via articles reassignment
      }
    }

    res.json({
      data: {
        articles,
        count: articles.length,
        sentimentScored: withSentiment,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[news/market]', err);
    res.status(502).json({ error: 'Failed to fetch news. Please try again.' });
  }
});

// GET /news/:symbol?limit=5&sentiment=true
// Returns news items related to a specific NSE symbol.
newsRouter.get('/:symbol', sentimentLimiter, async (req, res) => {
  const symbolParam = req.params.symbol?.toUpperCase().trim();
  const symbolParsed = z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9&\-]+$/)
    .safeParse(symbolParam);

  if (!symbolParsed.success) {
    res.status(400).json({ error: 'Invalid symbol' });
    return;
  }

  const limitResult  = limitSchema.safeParse(req.query.limit);
  const withSentiment = req.query.sentiment === 'true';
  const limit  = limitResult.success ? limitResult.data : 5;
  const symbol = symbolParsed.data;

  try {
    const provider = getNewsProvider();
    let articles = await provider.getSymbolNews(symbol, limit);

    if (withSentiment && articles.length > 0) {
      const aiProvider = getAIProvider();
      const unscored = articles.filter((a) => a.sentiment === null);
      if (unscored.length > 0) {
        const sentimentResults = await runNewsSentimentPipeline({ articles: unscored, aiProvider });
        const scoredMap = new Map(sentimentResults.map((a) => [a.id, a]));
        articles = articles.map((a) => scoredMap.get(a.id) ?? a);
      }
    }

    res.json({
      data: {
        symbol,
        articles,
        count: articles.length,
        sentimentScored: withSentiment,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error(`[news/${symbolParam}]`, err);
    res.status(502).json({ error: 'Failed to fetch symbol news. Please try again.' });
  }
});
