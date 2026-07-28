import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { getMarketDataProvider } from '../services/market-data';
import { sma, ema, rsi, macd } from '../lib/indicators';
import type { Timeframe } from '../services/market-data/types';

export const technicalRouter = Router();
technicalRouter.use(authenticate);

const technicalLimiter = rateLimit({ windowMs: 60_000, max: 30 });

const TimeframeSchema = z.enum(['1D', '1W', '1M', '1Y']);

// GET /technical/:symbol?timeframe=1D|1W|1M|1Y
technicalRouter.get('/:symbol', technicalLimiter, async (req, res) => {
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

  const timeframeParsed = TimeframeSchema.safeParse(req.query.timeframe ?? '1M');
  if (!timeframeParsed.success) {
    res.status(400).json({ error: 'timeframe must be one of: 1D, 1W, 1M, 1Y' });
    return;
  }

  const symbol = symbolParsed.data;
  const timeframe = timeframeParsed.data as Timeframe;

  try {
    const provider = getMarketDataProvider();
    const bars = await provider.getOHLC(symbol, timeframe);

    if (!bars.length) {
      res.status(404).json({ error: 'No OHLC data found for this symbol and timeframe.' });
      return;
    }

    const closes = bars.map((b) => b.close);

    // Compute all indicators — each returns an array aligned with `bars`
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const ema20 = ema(closes, 20);
    const rsi14 = rsi(closes, 14);
    const macdData = macd(closes, 12, 26, 9);

    // Build per-bar indicator series (null where not yet computable)
    const indicatorSeries = bars.map((bar, i) => ({
      time: bar.time,
      sma20: sma20[i],
      sma50: sma50[i],
      ema20: ema20[i],
      rsi14: rsi14[i],
      macd: macdData[i].macd,
      macdSignal: macdData[i].signal,
      macdHistogram: macdData[i].histogram,
    }));

    res.json({
      data: {
        symbol,
        timeframe,
        bars,
        indicators: indicatorSeries,
      },
    });
  } catch (err) {
    console.error(`[technical/${symbol}]`, err);
    res.status(502).json({ error: 'Failed to fetch technical data. Please try again.' });
  }
});
