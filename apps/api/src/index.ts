import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { marketRouter } from './routes/market';
import { portfolioRouter } from './routes/portfolio';
import { researchRouter } from './routes/research';
import { technicalRouter } from './routes/technical';
import { chatRouter } from './routes/chat';
import { newsRouter } from './routes/news';
import { optionsRouter } from './routes/options';
import { fnoRouter } from './routes/fno-v2';
import passport from './lib/passport';
import { AppError } from './lib/errors';

const app = express();
const PORT = process.env.PORT ?? 4000;

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/market', marketRouter);
app.use('/api/v1/portfolio', portfolioRouter);
app.use('/api/v1/research', researchRouter);
app.use('/api/v1/technical', technicalRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/news', newsRouter);
app.use('/api/v1/options', optionsRouter);
app.use('/api/v1/fno', fnoRouter);

// Legacy /fno, /auth, etc. paths for backward compatibility with the existing web app
import { fnoRouter as fnoRouterLegacy } from './routes/fno';
app.use('/fno', fnoRouterLegacy);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Not found', retryable: false },
  });
});

// Global error handler — translates AppError (and unknown) into the standard
// error envelope. Never leaks stack traces in production.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    const body: { error: Record<string, unknown> } = {
      error: { code: err.code, message: err.message, retryable: err.retryable },
    };
    if (err.details && Object.keys(err.details).length > 0) {
      body.error.details = err.details;
    }
    res.status(err.status).json(body);
    return;
  }
  console.error('[unhandled]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      retryable: false,
    },
  });
});

app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
  console.log(`[api] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
