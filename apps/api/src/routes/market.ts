import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { getMarketDataProvider, GLOBAL_SYMBOLS } from '../services/market-data';
import { getAIProvider, runGlobalNotePipeline } from '../services/ai';

export const marketRouter = Router();

const marketLimiter = rateLimit({ windowMs: 60_000, max: 60 });
marketRouter.use(marketLimiter);

// GET /market/indices — public (no auth needed for dashboard data)
marketRouter.get('/indices', async (_req, res) => {
  try {
    const provider = getMarketDataProvider();
    const [quotes, status] = await Promise.all([
      provider.getIndexQuotes(['NIFTY50', 'BANKNIFTY', 'SENSEX', 'INDIAVIX']),
      provider.getMarketStatus(),
    ]);
    res.json({ data: { quotes, status } });
  } catch (err) {
    console.error('[market/indices]', err);
    res.status(502).json({ error: 'Market data unavailable' });
  }
});

const globalLimiter = rateLimit({ windowMs: 60_000, max: 15 });

// GET /market/global — auth-gated; fetches all global instruments + AI note
marketRouter.get('/global', authenticate, globalLimiter, async (_req, res) => {
  try {
    const provider = getMarketDataProvider();
    const quotes = await provider.getGlobalQuotes(GLOBAL_SYMBOLS);

    // AI note is best-effort — don't fail the whole response if it errors
    let aiNote: { note: string; confidence: number; dataAvailable: boolean; disclaimer: string } | null = null;
    try {
      aiNote = await runGlobalNotePipeline({ quotes, aiProvider: getAIProvider() });
    } catch (aiErr) {
      console.warn('[market/global] AI note generation failed:', aiErr);
    }

    res.json({ data: { quotes, aiNote } });
  } catch (err) {
    console.error('[market/global]', err);
    res.status(502).json({ error: 'Global market data unavailable' });
  }
});
