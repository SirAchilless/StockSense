import jwt from 'jsonwebtoken';

// Fail fast at startup if the secrets are not configured
const accessSecret = process.env.JWT_ACCESS_SECRET;
if (!accessSecret) {
  throw new Error(
    '[jwt] JWT_ACCESS_SECRET is not set. Set it in your .env file before starting the server.',
  );
}

const refreshSecret = process.env.JWT_REFRESH_SECRET;
if (!refreshSecret) {
  throw new Error(
    '[jwt] JWT_REFRESH_SECRET is not set. Set it in your .env file before starting the server.',
  );
}

const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'];
const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, accessSecret as string, { expiresIn: accessExpiresIn });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret as string) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, refreshSecret as string, { expiresIn: refreshExpiresIn });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshSecret as string) as RefreshTokenPayload;
}
