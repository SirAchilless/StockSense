import jwt from 'jsonwebtoken';

// Fail fast at startup if the secret is not configured
const accessSecret = process.env.JWT_ACCESS_SECRET;
if (!accessSecret) {
  throw new Error(
    '[jwt] JWT_ACCESS_SECRET is not set. Set it in your .env file before starting the server.',
  );
}

const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'];

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, accessSecret as string, { expiresIn: accessExpiresIn });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret as string) as AccessTokenPayload;
}
