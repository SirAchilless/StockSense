import { Router } from 'express';
import { getMarketDataProvider } from '../services/market-data';
import rateLimit from 'express-rate-limit';

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
