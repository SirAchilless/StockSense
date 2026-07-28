import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { getMarketDataProvider } from '../services/market-data';
import { calculateHoldingPnL, calculatePortfolioSummary } from '../lib/pnl';
import { parseImportBuffer } from '../lib/import-parser';

export const portfolioRouter = Router();
portfolioRouter.use(authenticate); // all portfolio routes require auth

// Multer config — memory storage, 5MB limit, CSV/XLSX only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
});

// GET /portfolio — full portfolio with live P&L
portfolioRouter.get('/', async (req, res) => {
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId: req.user!.id },
      include: { holdings: true },
    });

    if (!portfolio || portfolio.holdings.length === 0) {
      res.json({ data: { holdings: [], totalInvested: 0, currentValue: 0, totalPnL: 0, totalPnLPct: 0, dailyChange: 0, dailyChangePct: 0 } });
      return;
    }

    const provider = getMarketDataProvider();
    const quotes = await Promise.allSettled(
      [...new Set(portfolio.holdings.map((h) => h.symbol))].map((sym) =>
        provider.getStockQuote(sym)
      )
    );

    const priceMap = new Map<string, { price: number; previousClose: number }>();
    quotes.forEach((r) => {
      if (r.status === 'fulfilled') {
        priceMap.set(r.value.symbol, { price: r.value.price, previousClose: r.value.previousClose });
      }
    });

    const holdingsPnL = portfolio.holdings.map((h) => {
      const quote = priceMap.get(h.symbol);
      return {
        id: h.id,
        ...calculateHoldingPnL({
          symbol: h.symbol,
          quantity: h.quantity,
          buyPrice: h.buyPrice,
          currentPrice: quote?.price ?? h.buyPrice,
          previousClose: quote?.previousClose,
        }),
      };
    });

    res.json({ data: calculatePortfolioSummary(holdingsPnL) });
  } catch (err) {
    console.error('[portfolio GET]', err);
    res.status(500).json({ error: 'Failed to load portfolio' });
  }
});

const holdingSchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase(),
  quantity: z.number().positive(),
  buyPrice: z.number().positive(),
  buyDate: z.string().datetime().or(z.string().date()),
  notes: z.string().max(500).optional(),
});

// POST /portfolio/holdings — add a holding
portfolioRouter.post('/holdings', async (req, res) => {
  const parsed = holdingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const portfolio = await prisma.portfolio.upsert({
    where: { userId: req.user!.id },
    update: {},
    create: { userId: req.user!.id },
  });

  const holding = await prisma.holding.create({
    data: {
      portfolioId: portfolio.id,
      symbol: parsed.data.symbol,
      quantity: parsed.data.quantity,
      buyPrice: parsed.data.buyPrice,
      buyDate: new Date(parsed.data.buyDate),
      notes: parsed.data.notes,
    },
  });

  res.status(201).json({ data: holding });
});

// GET /portfolio/holdings — list raw holdings (no live prices)
portfolioRouter.get('/holdings', async (req, res) => {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId: req.user!.id },
    include: { holdings: { orderBy: { createdAt: 'desc' } } },
  });
  res.json({ data: portfolio?.holdings ?? [] });
});

// DELETE /portfolio/holdings/:id
portfolioRouter.delete('/holdings/:id', async (req, res) => {
  const holding = await prisma.holding.findUnique({ where: { id: req.params.id } });
  if (!holding) {
    res.status(404).json({ error: 'Holding not found' });
    return;
  }

  // Verify ownership
  const portfolio = await prisma.portfolio.findUnique({ where: { id: holding.portfolioId } });
  if (portfolio?.userId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  await prisma.holding.delete({ where: { id: req.params.id } });
  res.json({ data: { message: 'Holding deleted' } });
});

// POST /portfolio/import
portfolioRouter.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const { rows, errors } = parseImportBuffer(req.file.buffer, req.file.mimetype);

  if (rows.length === 0) {
    res.status(422).json({
      error: 'No valid rows to import',
      data: { imported: 0, skipped: 0, errors },
    });
    return;
  }

  const portfolio = await prisma.portfolio.upsert({
    where: { userId: req.user!.id },
    update: {},
    create: { userId: req.user!.id },
  });

  await prisma.holding.createMany({
    data: rows.map((r) => ({
      portfolioId: portfolio.id,
      symbol: r.symbol,
      quantity: r.quantity,
      buyPrice: r.buyPrice,
      buyDate: new Date(r.buyDate),
      notes: r.notes,
    })),
  });

  res.status(201).json({
    data: {
      imported: rows.length,
      skipped: errors.length,
      errors,
    },
  });
});
