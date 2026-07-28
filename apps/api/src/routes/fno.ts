import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { getFnoProvider, ALL_FNO_SYMBOLS } from '../services/fno';
import { getAIProvider } from '../services/ai';
import { runFnoPipeline } from '../services/ai/grounding-pipeline';

export const fnoRouter = Router();
fnoRouter.use(authenticate);

const analysisLimiter = rateLimit({ windowMs: 60_000, max: 10 });

// GET /fno/symbols
fnoRouter.get('/symbols', (_req, res) => {
  res.json({ data: { symbols: [...ALL_FNO_SYMBOLS] } });
});

// GET /fno/rollover/:symbol — rollover data only (no AI)
fnoRouter.get('/rollover/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!(ALL_FNO_SYMBOLS as readonly string[]).includes(symbol)) {
    res.status(404).json({ error: { code: 'SYMBOL_NOT_SUPPORTED', message: `${symbol} is not supported for F&O data.` } });
    return;
  }
  try {
    const data = await getFnoProvider().getRolloverData(symbol);
    res.json({ data });
  } catch (err) {
    console.error('[fno/rollover]', err);
    res.status(502).json({ error: { code: 'PROVIDER_ERROR', message: 'Failed to fetch rollover data.' } });
  }
});

// GET /fno/fii-positions — FII/DII derivative positioning (no AI)
fnoRouter.get('/fii-positions', async (_req, res) => {
  try {
    const data = await getFnoProvider().getFiiDerPositions();
    res.json({ data });
  } catch (err) {
    console.error('[fno/fii-positions]', err);
    res.status(502).json({ error: { code: 'PROVIDER_ERROR', message: 'Failed to fetch FII/DII positions.' } });
  }
});

// GET /fno/participant-oi — participant-wise open interest (no AI)
fnoRouter.get('/participant-oi', async (_req, res) => {
  try {
    const data = await getFnoProvider().getParticipantOI();
    res.json({ data });
  } catch (err) {
    console.error('[fno/participant-oi]', err);
    res.status(502).json({ error: { code: 'PROVIDER_ERROR', message: 'Failed to fetch participant OI data.' } });
  }
});

// GET /fno/analysis/:symbol — full F&O intelligence + AI interpretation
fnoRouter.get('/analysis/:symbol', analysisLimiter, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!(ALL_FNO_SYMBOLS as readonly string[]).includes(symbol)) {
    res.status(404).json({ error: { code: 'SYMBOL_NOT_SUPPORTED', message: `${symbol} is not supported for F&O data.` } });
    return;
  }
  try {
    const result = await runFnoPipeline({
      symbol,
      fnoProvider: getFnoProvider(),
      aiProvider: getAIProvider(),
    });
    res.json({
      data: {
        rollover: result.rollover,
        fiiPositions: result.fiiPositions,
        participantOI: result.participantOI,
        interpretation: result.interpretation,
        disclaimer: result.disclaimer,
        dataAsOf: result.dataAsOf,
      },
    });
  } catch (err) {
    console.error('[fno/analysis]', err);
    res.status(502).json({ error: { code: 'PROVIDER_ERROR', message: 'Failed to generate F&O analysis. Please try again.' } });
  }
});
