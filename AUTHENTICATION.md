# Authentication

## Flow

1. **Email/password:** password hashed with bcrypt/argon2 on register; login verifies hash, issues access + refresh token pair
2. **Google OAuth:** client obtains a Google ID token via Google Identity Services, sends to `POST /auth/google`; server verifies token against Google's public keys, creates/links `User` record via `googleId`
3. **Access token:** short-lived JWT (15 min), sent in `Authorization: Bearer` header, contains `userId` + `email` only (no sensitive data)
4. **Refresh token:** longer-lived (7–30 days), stored as httpOnly + secure + sameSite cookie, rotated on every use (old token revoked, new one issued) — rotation detects token theft (reuse of a revoked token invalidates the whole session)
5. **Logout:** revokes the refresh token server-side and clears the cookie

## Middleware

```ts
function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: { code: "TOKEN_EXPIRED" } });
  }
}
```

## Client Handling

- Access token held in memory (not localStorage) to reduce XSS exposure
- On `401 TOKEN_EXPIRED`, client calls `/auth/refresh` once (cookie-based) and retries the original request; on refresh failure, redirect to login
- Auth state exposed via `AuthContext`, not Redux — it's app-shell state, not server cache

## Security Notes

- Refresh tokens stored hashed in DB (`RefreshToken.token` should store a hash, not the raw token, in production — the schema in DATABASE_SCHEMA.md should be updated accordingly before ship)
- Rate limit `/auth/login` and `/auth/register` aggressively (see API_DOCUMENTATION.md)
- Google token verification must check `aud` matches this app's client ID
