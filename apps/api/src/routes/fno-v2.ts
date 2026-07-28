import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { fnoService, getFnOProvider } from '../services/fno-v2';
import { getAIProvider } from '../services/ai';
import { runFnoAICommentary } from '../services/ai/grounding-pipeline';
import { optionalDateQuery, optionalExpiryQuery, aiCommentaryBody } from '../schemas/fno';
import { AppError, ValidationError } from '../lib/errors';

export const fnoRouter = Router();

// ── All /api/v1/fno endpoints require JWT auth ──────────────────────────
fnoRouter.use(authenticate);

const aiLimiter = rateLimit({ windowMs: 60_000, max: 10 });

/** Build a meta envelope segment (source, asOf, cachedAt). */
function meta() {
  const now = new Date().toISOString();
  return { source: 'NSE (delayed/EOD public feed)', asOf: now, cachedAt: now };
}

function parseDate(qs: unknown): string {
  const parsed = optionalDateQuery.safeParse(typeof qs === 'object' ? qs : {});
  if (!parsed.success) throw new ValidationError('Invalid date');
  return parsed.data.date ?? new Date().toISOString().slice(0, 10);
}

function parseExpiry(qs: unknown): string | undefined {
  const parsed = optionalExpiryQuery.safeParse(typeof qs === 'object' ? qs : {});
  if (!parsed.success) throw new ValidationError('Invalid expiry');
  return parsed.data.expiry;
}

// ── GET /api/v1/fno/rollover?symbol=NIFTY ───────────────────────────────
fnoRouter.get('/rollover', async (req, res, next) => {
  try {
    const symbol = z.string().trim().min(1).max(20).regex(/^[A-Z0-9]+$/i).parse(req.query.symbol ?? '').toUpperCase();
    const data = await fnoService.getRolloverData(symbol);
    res.json({ data, meta: meta() });
  } catch (err) { next(err); }
});

// ── GET /api/v1/fno/rollover/market-wide ────────────────────────────────
fnoRouter.get('/rollover/market-wide', async (_req, res, next) => {
  try {
    const data = await fnoService.getMarketWideRollover();
    res.json({ data, meta: meta() });
  } catch (err) { next(err); }
});

// ── GET /api/v1/fno/participant-oi?date=YYYY-MM-DD ──────────────────────
fnoRouter.get('/participant-oi', async (req, res, next) => {
  try {
    const date = parseDate(req.query);
    const data = await fnoService.getParticipantOI(date);
    res.json({ data, meta: { ...meta(), asOf: date } });
  } catch (err) { next(err); }
});

// ── GET /api/v1/fno/cost-of-carry?symbol=NIFTY ──────────────────────────
fnoRouter.get('/cost-of-carry', async (req, res, next) => {
  try {
    const symbol = z.string().trim().min(1).max(20).regex(/^[A-Z0-9]+$/i).parse(req.query.symbol ?? '').toUpperCase();
    const data = await fnoService.getCostOfCarry(symbol);
    res.json({ data, meta: meta() });
  } catch (err) { next(err); }
});

// ── GET /api/v1/fno/oi-trends?symbol=NIFTY&expiry=YYYY-MM-DD ────────────
fnoRouter.get('/oi-trends', async (req, res, next) => {
  try {
    const symbol = z.string().trim().min(1).max(20).regex(/^[A-Z0-9]+$/i).parse(req.query.symbol ?? '').toUpperCase();
    const expiry = parseExpiry(req.query);
    const data = await fnoService.getOITrends(symbol, expiry);
    res.json({ data, meta: meta() });
  } catch (err) { next(err); }
});

// ── GET /api/v1/fno/pcr?symbol=NIFTY&expiry=YYYY-MM-DD ──────────────────
fnoRouter.get('/pcr', async (req, res, next) => {
  try {
    const symbol = z.string().trim().min(1).max(20).regex(/^[A-Z0-9]+$/i).parse(req.query.symbol ?? '').toUpperCase();
    const expiry = parseExpiry(req.query);
    const data = await fnoService.getPCR(symbol, expiry);
    res.json({ data, meta: meta() });
  } catch (err) { next(err); }
});

// ── GET /api/v1/fno/pcr/market-wide ─────────────────────────────────────
fnoRouter.get('/pcr/market-wide', async (_req, res, next) => {
  try {
    const data = await fnoService.getMarketWidePCR();
    res.json({ data, meta: meta() });
  } catch (err) { next(err); }
});

// ── POST /api/v1/fno/ai-commentary ──────────────────────────────────────
fnoRouter.post('/ai-commentary', aiLimiter, async (req, res, next) => {
  try {
    const parsed = aiCommentaryBody.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid request body';
      throw new ValidationError(msg);
    }
    const { symbol, metrics } = parsed.data;
    const result = await runFnoAICommentary({
      symbol: symbol.toUpperCase(),
      metrics,
      fnoProvider: getFnOProvider(),
      aiProvider: getAIProvider(),
    });
    res.json({ data: result, meta: meta() });
  } catch (err) {
    if (err instanceof AppError) { next(err); return; }
    if (err instanceof z.ZodError) { next(new ValidationError(err.errors[0]?.message ?? 'Invalid request')); return; }
    next(err);
  }
});
