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
import passport from './lib/passport';

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
app.use('/auth', authRouter);
app.use('/market', marketRouter);
app.use('/portfolio', portfolioRouter);
app.use('/research', researchRouter);
app.use('/technical', technicalRouter);
app.use('/chat', chatRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
  console.log(`[api] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
