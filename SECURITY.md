# Security

## Authentication & Session
- Passwords hashed with bcrypt/argon2 (never reversible encryption)
- Access tokens short-lived (15 min), refresh tokens rotated on each use, stored httpOnly + secure + sameSite=strict
- Refresh token reuse (theft indicator) revokes the entire session chain

## Input Validation
- Every API boundary validated with zod (or equivalent) schemas — reject unknown fields, enforce types/ranges
- File uploads (CSV/Excel portfolio import) validated for MIME type, size limit (e.g. 5MB), and row-level schema before parsing; parsing errors reported per-row, not silently dropped

## Secrets
- No secrets in source control; `.env` files gitignored
- Production secrets via AWS Secrets Manager / GitHub Actions secrets
- API keys for market data / AI providers (NVIDIA NIM cloud key included) scoped to backend only — never exposed to the client bundle. In local NIM mode there is no external key to leak, but the container's port should still not be exposed beyond the private network the API runs in.

## Rate Limiting
- Applied per-user (authenticated) or per-IP (public), see API_DOCUMENTATION.md for limits
- AI-provider-backed endpoints (`/research`, `/chat`) rate-limited more aggressively — these are the most expensive and abuse-prone

## Data Protection
- PII (email, name) encrypted at rest via RDS encryption; no additional plaintext export paths
- No storage of broker credentials directly — Phase 3 OAuth integrations store only access/refresh tokens issued by the broker, scoped and revocable

## Dependency & Infra Hygiene
- Automated dependency vulnerability scanning in CI (e.g. `pnpm audit` or Dependabot)
- Docker images built from minimal base images (`node:20-alpine`), no unnecessary packages
- Database in private subnet, accessible only from the API's security group

## AI-Specific Risks
- Prompt injection: user-supplied text (chat messages, symbol search) is treated as data, never concatenated into system-level instructions
- Output validation: all AI responses schema-validated before being trusted or persisted (see AI_ENGINE.md) — this is also a security control, not just a quality one, since an ungrounded response could otherwise surface fabricated financial claims
