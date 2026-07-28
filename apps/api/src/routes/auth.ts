import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { authenticate } from '../middleware/authenticate';
import { registerSchema, loginSchema } from '../schemas/auth';
import passport from '../lib/passport';

export const authRouter = Router();

// 5 requests per minute per IP on auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

authRouter.use(authLimiter);

// Helper: compute refresh token expiry (7 days from now)
function refreshTokenExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

// Helper: set httpOnly refresh token cookie
function setRefreshCookie(res: Response, token: string) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// POST /auth/register
authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, avatar: true, createdAt: true },
  });

  const token = signAccessToken({ sub: user.id, email: user.email });
  const refreshTokenValue = signRefreshToken({ sub: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  setRefreshCookie(res, refreshTokenValue);
  res.status(201).json({ data: { token, user } });
});

// POST /auth/login
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signAccessToken({ sub: user.id, email: user.email });
  const refreshTokenValue = signRefreshToken({ sub: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  setRefreshCookie(res, refreshTokenValue);
  res.json({
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    },
  });
});

// POST /auth/refresh
authRouter.post('/refresh', async (req, res) => {
  const incomingToken = req.cookies?.refresh_token as string | undefined;
  if (!incomingToken) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(incomingToken);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: incomingToken } });
  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'Refresh token not found or expired' });
    return;
  }

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const newAccessToken = signAccessToken({ sub: user.id, email: user.email });
  const newRefreshToken = signRefreshToken({ sub: user.id });

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  setRefreshCookie(res, newRefreshToken);
  res.json({
    data: {
      token: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    },
  });
});

// POST /auth/logout
authRouter.post('/logout', async (req, res) => {
  const incomingToken = req.cookies?.refresh_token as string | undefined;
  if (incomingToken) {
    await prisma.refreshToken.deleteMany({ where: { token: incomingToken } });
  }
  res.clearCookie('refresh_token', { path: '/auth' });
  res.json({ data: { message: 'Logged out' } });
});

// GET /auth/me — protected
authRouter.get('/me', authenticate, (req, res) => {
  res.json({ data: req.user });
});

// GET /auth/google — initiate Google OAuth
authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

// GET /auth/google/callback — Google OAuth callback
authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req: Request, res: Response) => {
    const user = req.user as {
      id: string;
      email: string;
      name: string | null;
      avatar: string | null;
      createdAt: Date;
    };

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshTokenValue = signRefreshToken({ sub: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: refreshTokenExpiry(),
      },
    });

    setRefreshCookie(res, refreshTokenValue);

    const frontendOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    res.redirect(`${frontendOrigin}/?token=${encodeURIComponent(accessToken)}`);
  },
);
