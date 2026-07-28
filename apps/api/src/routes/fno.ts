import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { getFnoProvider, ALL_FNO_SYMBOLS } from '../services/fno';
import { getAIProvider } from '../services/ai';
import { runFnoPipeline } from '../services/ai/grounding-pipeline';
import { isDataUnavailableError } from '../lib/errors';

export const fnoRouter = Router();
fnoRouter.use(authenticate);

const analysisLimiter = rateLimit({ windowMs: 60_000, max: 10 });

function nowMeta() {
  const asOf = new Date().toISOString();
  return { source: 'nse-delayed', asOf, cachedAt: asOf };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function providerError(label: string, err: unknown, res: Response<any>) {
  if (isDataUnavailableError(err)) {
    res
      .status(503)
      .json({ error: { code: err.code, message: err.message, retryable: err.retryable } });
    return;
  }
  console.error(`[fno/${label}]`, err);
  res
    .status(502)
    .json({
      error: { code: 'PROVIDER_ERROR', message: `Failed to fetch ${label} data.`, retryable: true },
    });
}

const symbolSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[A-Z0-9]+$/, 'Invalid symbol format');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
  .optional();

function validateSymbol(symbol: string): string | null {
  const parsed = symbolSchema.safeParse(symbol.toUpperCase());
  return parsed.success ? parsed.data : null;
}

// GET /fno/symbols
fnoRouter.get('/symbols', (_req, res) => {
  res.json({ data: { symbols: [...ALL_FNO_SYMBOLS] } });
});

// GET /fno/rollover/market-wide — MUST be before /rollover/:symbol to avoid param conflict
fnoRouter.get('/rollover/market-wide', async (_req, res) => {
  try {
    const data = await getFnoProvider().getMarketWideRollover();
    res.json({ data, meta: nowMeta() });
  } catch (err) {
    providerError('rollover/market-wide', err, res);
  }
});

// GET /fno/rollover/:symbol
fnoRouter.get('/rollover/:symbol', async (req, res) => {
  const symbol = validateSymbol(req.params.symbol);
  if (!symbol) {
    res
      .status(400)
      .json({
        error: { code: 'INVALID_SYMBOL', message: 'Invalid symbol format.', retryable: false },
      });
    return;
  }
  if (!(ALL_FNO_SYMBOLS as readonly string[]).includes(symbol)) {
    res
      .status(404)
      .json({
        error: {
          code: 'SYMBOL_NOT_SUPPORTED',
          message: `${symbol} is not supported for F&O data.`,
          retryable: false,
        },
      });
    return;
  }
  try {
    const data = await getFnoProvider().getRolloverData(symbol);
    res.json({ data, meta: nowMeta() });
  } catch (err) {
    providerError('rollover', err, res);
  }
});

// GET /fno/fii-positions
fnoRouter.get('/fii-positions', async (_req, res) => {
  try {
    const data = await getFnoProvider().getFiiDerPositions();
    res.json({ data, meta: nowMeta() });
  } catch (err) {
    providerError('fii-positions', err, res);
  }
});

// GET /fno/participant-oi?date=YYYY-MM-DD
fnoRouter.get('/participant-oi', async (req, res) => {
  const dateParsed = dateSchema.safeParse(req.query.date as string | undefined);
  if (!dateParsed.success) {
    res
      .status(400)
      .json({
        error: {
          code: 'INVALID_DATE',
          message: 'date must be YYYY-MM-DD format.',
          retryable: false,
        },
      });
    return;
  }
  try {
    const data = await getFnoProvider().getParticipantOI();
    res.json({ data, meta: nowMeta() });
  } catch (err) {
    providerError('participant-oi', err, res);
  }
});

// GET /fno/cost-of-carry/:symbol
fnoRouter.get('/cost-of-carry/:symbol', async (req, res) => {
  const symbol = validateSymbol(req.params.symbol);
  if (!symbol) {
    res
      .status(400)
      .json({
        error: { code: 'INVALID_SYMBOL', message: 'Invalid symbol format.', retryable: false },
      });
    return;
  }
  if (!(ALL_FNO_SYMBOLS as readonly string[]).includes(symbol)) {
    res
      .status(404)
      .json({
        error: {
          code: 'SYMBOL_NOT_SUPPORTED',
          message: `${symbol} is not supported for F&O data.`,
          retryable: false,
        },
      });
    return;
  }
  try {
    const data = await getFnoProvider().getCostOfCarry(symbol);
    res.json({ data, meta: nowMeta() });
  } catch (err) {
    providerError('cost-of-carry', err, res);
  }
});

// GET /fno/oi-trends/:symbol?expiry=YYYY-MM-DD
fnoRouter.get('/oi-trends/:symbol', async (req, res) => {
  const symbol = validateSymbol(req.params.symbol);
  if (!symbol) {
    res
      .status(400)
      .json({
        error: { code: 'INVALID_SYMBOL', message: 'Invalid symbol format.', retryable: false },
      });
    return;
  }
  if (!(ALL_FNO_SYMBOLS as readonly string[]).includes(symbol)) {
    res
      .status(404)
      .json({
        error: {
          code: 'SYMBOL_NOT_SUPPORTED',
          message: `${symbol} is not supported for F&O data.`,
          retryable: false,
        },
      });
    return;
  }
  const expiry = req.query.expiry as string | undefined;
  if (expiry) {
    const expParsed = dateSchema.safeParse(expiry);
    if (!expParsed.success) {
      res
        .status(400)
        .json({
          error: {
            code: 'INVALID_DATE',
            message: 'expiry must be YYYY-MM-DD format.',
            retryable: false,
          },
        });
      return;
    }
  }
  try {
    const data = await getFnoProvider().getOITrends(symbol, expiry);
    res.json({ data, meta: nowMeta() });
  } catch (err) {
    providerError('oi-trends', err, res);
  }
});

// GET /fno/pcr/market-wide — MUST be before /pcr/:symbol
fnoRouter.get('/pcr/market-wide', async (_req, res) => {
  try {
    const data = await getFnoProvider().getMarketWidePCR();
    res.json({ data, meta: nowMeta() });
  } catch (err) {
    providerError('pcr/market-wide', err, res);
  }
});

// GET /fno/pcr/:symbol?expiry=YYYY-MM-DD
fnoRouter.get('/pcr/:symbol', async (req, res) => {
  const symbol = validateSymbol(req.params.symbol);
  if (!symbol) {
    res
      .status(400)
      .json({
        error: { code: 'INVALID_SYMBOL', message: 'Invalid symbol format.', retryable: false },
      });
    return;
  }
  if (!(ALL_FNO_SYMBOLS as readonly string[]).includes(symbol)) {
    res
      .status(404)
      .json({
        error: {
          code: 'SYMBOL_NOT_SUPPORTED',
          message: `${symbol} is not supported for F&O data.`,
          retryable: false,
        },
      });
    return;
  }
  const expiry = req.query.expiry as string | undefined;
  if (expiry) {
    const expParsed = dateSchema.safeParse(expiry);
    if (!expParsed.success) {
      res
        .status(400)
        .json({
          error: {
            code: 'INVALID_DATE',
            message: 'expiry must be YYYY-MM-DD format.',
            retryable: false,
          },
        });
      return;
    }
  }
  try {
    const data = await getFnoProvider().getPCR(symbol, expiry);
    res.json({ data, meta: nowMeta() });
  } catch (err) {
    providerError('pcr', err, res);
  }
});

// GET /fno/analysis/:symbol — full F&O intelligence + AI interpretation
fnoRouter.get('/analysis/:symbol', analysisLimiter, async (req, res) => {
  const symbol = validateSymbol(req.params.symbol);
  if (!symbol) {
    res
      .status(400)
      .json({
        error: { code: 'INVALID_SYMBOL', message: 'Invalid symbol format.', retryable: false },
      });
    return;
  }
  if (!(ALL_FNO_SYMBOLS as readonly string[]).includes(symbol)) {
    res
      .status(404)
      .json({
        error: {
          code: 'SYMBOL_NOT_SUPPORTED',
          message: `${symbol} is not supported for F&O data.`,
          retryable: false,
        },
      });
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
      meta: nowMeta(),
    });
  } catch (err) {
    if (isDataUnavailableError(err)) {
      res
        .status(503)
        .json({ error: { code: err.code, message: err.message, retryable: err.retryable } });
      return;
    }
    console.error('[fno/analysis]', err);
    res
      .status(502)
      .json({
        error: {
          code: 'PROVIDER_ERROR',
          message: 'Failed to generate F&O analysis. Please try again.',
          retryable: true,
        },
      });
  }
});

// POST /fno/ai-commentary — targeted AI commentary on specific metrics
fnoRouter.post('/ai-commentary', analysisLimiter, async (req, res) => {
  const bodySchema = z.object({
    symbol: z.string().min(1).max(20).toUpperCase(),
    metrics: z.array(z.string()).min(1).max(10),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.errors[0]?.message ?? 'Invalid input.',
          retryable: false,
        },
      });
    return;
  }
  const { symbol, metrics } = parsed.data;
  if (!(ALL_FNO_SYMBOLS as readonly string[]).includes(symbol)) {
    res
      .status(404)
      .json({
        error: {
          code: 'SYMBOL_NOT_SUPPORTED',
          message: `${symbol} is not supported for F&O data.`,
          retryable: false,
        },
      });
    return;
  }
  try {
    const result = await runFnoPipeline({
      symbol,
      fnoProvider: getFnoProvider(),
      aiProvider: getAIProvider(),
    });
    // Filter interpretation to requested metrics
    const filteredInterpretation = Object.fromEntries(
      Object.entries(result.interpretation).filter(
        ([key]) => metrics.includes(key) || key === 'dataAvailable' || key === 'confidence'
      )
    );
    res.json({
      data: {
        symbol,
        metrics,
        interpretation: filteredInterpretation,
        disclaimer: result.disclaimer,
        dataAsOf: result.dataAsOf,
      },
      meta: nowMeta(),
    });
  } catch (err) {
    if (isDataUnavailableError(err)) {
      res
        .status(503)
        .json({ error: { code: err.code, message: err.message, retryable: err.retryable } });
      return;
    }
    console.error('[fno/ai-commentary]', err);
    res
      .status(502)
      .json({
        error: {
          code: 'PROVIDER_ERROR',
          message: 'Failed to generate F&O commentary.',
          retryable: true,
        },
      });
  }
});
