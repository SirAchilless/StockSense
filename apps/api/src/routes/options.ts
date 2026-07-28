import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { getOptionChainProvider, ALL_OPTION_SYMBOLS } from '../services/options';
import { getAIProvider } from '../services/ai';
import { runOptionChainPipeline } from '../services/ai/grounding-pipeline';

export const optionsRouter = Router();
optionsRouter.use(authenticate);

// AI option chain analysis is rate-limited — hits the AI provider
const analysisLimiter = rateLimit({ windowMs: 60_000, max: 10 });

// GET /options/symbols — list supported symbols
optionsRouter.get('/symbols', (_req, res) => {
  res.json({ data: { symbols: [...ALL_OPTION_SYMBOLS] } });
});

// GET /options/expiries/:symbol
optionsRouter.get('/expiries/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!(ALL_OPTION_SYMBOLS as readonly string[]).includes(symbol)) {
    res.status(404).json({ error: { code: 'SYMBOL_NOT_SUPPORTED', message: `${symbol} is not supported for option chain data.` } });
    return;
  }
  try {
    const provider = getOptionChainProvider();
    const expiries = await provider.getAvailableExpiries(symbol);
    res.json({ data: { symbol, expiries } });
  } catch (err) {
    console.error('[options/expiries]', err);
    res.status(502).json({ error: { code: 'PROVIDER_ERROR', message: 'Failed to fetch expiries.' } });
  }
});

// GET /options/chain/:symbol?expiry=YYYY-MM-DD
// Returns the full option chain (data layer only, no AI)
optionsRouter.get('/chain/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!(ALL_OPTION_SYMBOLS as readonly string[]).includes(symbol)) {
    res.status(404).json({ error: { code: 'SYMBOL_NOT_SUPPORTED', message: `${symbol} is not supported for option chain data.` } });
    return;
  }

  const expiry = typeof req.query.expiry === 'string' ? req.query.expiry : undefined;

  try {
    const provider = getOptionChainProvider();
    const chain = await provider.getOptionChain(symbol, expiry);
    res.json({ data: chain });
  } catch (err) {
    console.error('[options/chain]', err);
    res.status(502).json({ error: { code: 'PROVIDER_ERROR', message: 'Failed to fetch option chain.' } });
  }
});

// GET /options/analysis/:symbol?expiry=YYYY-MM-DD
// Returns option chain + AI interpretation (grounded — AI never emits the numeric values)
optionsRouter.get('/analysis/:symbol', analysisLimiter, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!(ALL_OPTION_SYMBOLS as readonly string[]).includes(symbol)) {
    res.status(404).json({ error: { code: 'SYMBOL_NOT_SUPPORTED', message: `${symbol} is not supported for option chain data.` } });
    return;
  }

  const expiry = typeof req.query.expiry === 'string' ? req.query.expiry : undefined;

  try {
    const provider = getOptionChainProvider();
    const chain = await provider.getOptionChain(symbol, expiry);

    const result = await runOptionChainPipeline({
      chain,
      aiProvider: getAIProvider(),
    });

    res.json({
      data: {
        chain: result.chain,
        interpretation: result.interpretation,
        disclaimer: result.disclaimer,
      },
    });
  } catch (err) {
    console.error('[options/analysis]', err);
    res.status(502).json({ error: { code: 'PROVIDER_ERROR', message: 'Failed to generate option chain analysis. Please try again.' } });
  }
});
