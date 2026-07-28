# StockSense — Project Memory & Analysis

> Analytical snapshot of the whole repository: what the project is, how it is
> structured, what is actually built (vs. documented), and the notable gaps
> between the documentation set and the code.
> First generated 2026-07-28; last updated 2026-07-28 after Phase 2.5 (Portfolio AI).

---

## 1. What this project is

**StockSense** (docs title: "AI Stock Intelligence Platform") is an
AI-powered research and portfolio-tracking web app for **Indian equity
markets** (NSE/BSE). Its defining design principle is an **anti-hallucination
grounding pipeline**: the AI layer never free-generates a factual/numeric
claim — every price, ratio, score, or news reference must trace back to data
actually fetched or computed in that request, enforced structurally (schema
validation + deterministic computation), not just by prompt instruction.

It ships with a hard, non-removable **disclaimer** on every
recommendation-shaped output ("not a SEBI-registered investment adviser").

- **Repo:** `SirAchilless/StockSense`, default branch `main`
- **Package name:** `stocksense` (private monorepo)

---

## 2. Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite 5, TailwindCSS 3, shadcn/ui (Radix), Framer Motion, TanStack Query 5, TanStack Table, Redux Toolkit, React Router 6, Recharts, lightweight-charts |
| Backend | Node.js 20+, Express 4, TypeScript (strict) |
| Database | PostgreSQL 16 + Prisma 5 |
| Auth | JWT (access + rotating refresh), Google OAuth (passport-google-oauth20), bcryptjs |
| AI | NVIDIA NIM (OpenAI-compatible), provider-agnostic `AIProvider` interface; Mock adapter default |
| Market data | Pluggable `MarketDataProvider`; Alpha Vantage adapter + Mock default |
| News | Pluggable `NewsProvider`; RSS adapter + Mock default |
| Tooling | pnpm 9 workspaces, ESLint, Prettier, Vitest |
| Infra (documented) | Docker, NGINX, GitHub Actions, Vercel (web), AWS ECS/RDS (api) |

---

## 3. Monorepo layout

```
StockSense/
├── apps/
│   ├── api/     # Express + TS backend
│   └── web/     # React + Vite frontend
├── packages/
│   └── shared-types/   # DTOs shared between web and api
├── docker-compose.yml  # local Postgres 16 only
├── pnpm-workspace.yaml
└── *.md                # documentation set (see §7)
```

Root scripts (`package.json`): `dev` (concurrently runs api + web), `build`,
`lint`, `test`, `format`. Requires Node ≥20, pnpm ≥9.

---

## 4. Backend (`apps/api`)

Entry `src/index.ts` mounts routers: `/health`, `/auth`, `/market`,
`/portfolio`, `/research`, `/technical`, `/chat`, `/news`. Middleware:
helmet, cors (credentials), compression, morgan, json/urlencoded,
cookie-parser, passport.

**Layered structure:** `routes → lib/services → prisma`.

### Services (the only layers allowed to touch external providers)
- **`services/market-data/`** — `MarketDataProvider` interface with
  `MockMarketDataAdapter` (default) and `AlphaVantageAdapter`. Selected via
  `MARKET_DATA_PROVIDER` (`mock` | `alpha_vantage`). Covers index quotes, stock
  quotes, fundamentals, OHLC, market status, global symbols, and market breadth.
- **`services/ai/`** — `AIProvider` interface with `MockAIAdapter` (default) and
  `NvidiaNimAdapter` (`NIM_MODE` = `cloud` | `local`; else mock). The **grounding
  pipeline** exposes `runResearchPipeline`, `runChatPipeline`,
  `runGlobalNotePipeline`, `runNewsSentimentPipeline`, and (Phase 2.5)
  `runPortfolioAnalysisPipeline`, plus a shared `DISCLAIMER`.
- **`services/news/`** — `NewsProvider` with `MockNewsAdapter` (default) and
  `RssNewsAdapter` (`NEWS_PROVIDER` = `mock` | `rss`).

All three use a lazy singleton factory and default to the **Mock adapter**, so
the app runs end-to-end with **zero API keys**.

### `lib/` utilities
`jwt.ts`, `passport.ts`, `prisma.ts`, `import-parser.ts` (CSV/XLSX),
`indicators.ts` (SMA/EMA/RSI/MACD), `pnl.ts` (realized/unrealized P&L), and
**`portfolio-risk.ts`** (Phase 2.5 — deterministic risk/diversification scoring
and per-holding flags). `middleware/authenticate.ts` guards protected routes.

### Persistence (Prisma)
Models: `User`, `RefreshToken`, `Portfolio` (1:1 with user), `Holding`. Postgres
16 via `DATABASE_URL`. `docker-compose.yml` provisions only local Postgres.

### Tests (Vitest — 88 tests across 8 files)
`import-parser`, `indicators`, `pnl`, **`portfolio-risk`**, `grounding-pipeline`
(incl. portfolio-analysis + a "scenario-framed, not directive" assertion), plus
mock-adapter tests for market-data / ai / news.

---

## 5. Frontend (`apps/web`)

`App.tsx` — lazy-loaded, code-split routes behind `ProtectedRoute` + `AppLayout`.
Public: `/login`, `/register`. Protected: `/dashboard`, `/portfolio`,
`/research`, `/technical`, `/chat`, `/global`, `/breadth`, `/news`.

- **Component groups:** `breadth/`, `chat/`, `global/`, `market/`, `news/`,
  `portfolio/` (Add/Import/Holdings/Summary + **PortfolioAIPanel**),
  `research/` (ConfidenceBar, DisclaimerBanner, RatioGrid), `technical/`, `layout/`.
- **Hooks:** `useBreadth`, `useChat`, `useGlobalMarkets`, `useMarketData`,
  `useNews`, `useOAuthCallback`, `usePortfolio` (+ **`usePortfolioAnalysis`**),
  `useResearch`, `useTechnical`.
- **State rule:** server data in TanStack Query; Redux only for client-only state.

---

## 6. Auth & security model

- Email/password (bcrypt) + Google OAuth. Access JWT ~15 min in memory; refresh
  token httpOnly + secure + sameSite, rotated on every use (reuse invalidates the
  session chain — theft detection).
- Every API boundary validated with zod. Uploads MIME/size/row-validated.
- Provider keys backend-scoped, never in the client bundle. AI-backed endpoints
  (`/research`, `/chat`, `/news` sentiment, `/portfolio/analysis`) rate-limited.
- Prompt-injection defense: user text treated as data; AI output schema-validated.

---

## 7. Documentation set

`README`, `ARCHITECTURE`, `SYSTEM_DESIGN`, `FEATURES`, `ROADMAP`,
`API_DOCUMENTATION`, `DATABASE_SCHEMA`, `AI_ENGINE`, `AUTHENTICATION`,
`ENVIRONMENT_SETUP`, `DEPLOYMENT`, `SECURITY`, `TESTING`, `CONTRIBUTING`,
**`PORTFOLIO_ANALYSIS`** (Phase 2.5), **`CHANGELOG`**, plus
`ai-stock-intelligence-platform-prompt.md` (the originating spec).

ROADMAP breaks work into small, independently buildable steps (Phase 1: 1.1–1.11;
Phase 2: 2.1–2.5; Phase 3: 3.1–3.5, compliance-gated).

---

## 8. Build status by phase (verified 2026-07-28)

- **Phase 1 (1.1–1.11):** built — scaffolding, auth, market-data adapter,
  dashboard, portfolio (manual + CSV/Excel), grounding pipeline, AI research,
  basic technical analysis, AI chat.
- **Phase 2.1–2.4:** built — Global Markets + AI note, Market Breadth, technical
  components (patterns/volume profile), News + AI sentiment.
- **Phase 2.5 (Portfolio AI):** built this session — deterministic risk &
  diversification scores + per-holding flags, `GET /portfolio/analysis`, AI
  scenario-framed narrative (non-directive), `PortfolioAIPanel` UI. All 88 unit
  tests pass. New/edited files lint- and typecheck-clean.
- **Phase 3:** not started (regulated-sensitive; compliance-gated).

### Phase 2.5 grounding design (important)
Risk score, diversification score (HHI-based), and strong/weak flags are computed
**deterministically** in `lib/portfolio-risk.ts` from the user's own holdings +
live P&L. The AI only *narrates* over those grounded numbers — it never emits or
overrides them. This mirrors the anti-hallucination principle exactly. See
[PORTFOLIO_ANALYSIS.md](./PORTFOLIO_ANALYSIS.md).

---

## 9. Notable gaps: docs vs. actual code ⚠️

1. **Market-data provider.** Docs describe `nse_delayed` / `paid_vendor`; the code
   ships **Mock** (default) + **Alpha Vantage**.
2. **Implementation ahead of the "Phase 1 MVP" framing.** Global Markets, Breadth,
   News+Sentiment, and now Portfolio AI are all built (Phase 2).
3. **Database schema mismatch.** `DATABASE_SCHEMA.md` documents `Holding` on User
   plus `ResearchSnapshot`/`ChatThread`/`ChatMessage`/`Watchlist`; the actual
   `schema.prisma` uses `Portfolio`→`Holding` and omits the chat/research/watchlist
   tables. Treat the code schema as authoritative.
4. **Default runtime is fully mocked** (all three providers) until env vars are set.

## 10. Repo health — pre-existing issues (not from Phase 2.5) 🔧

The lint/test/build CI gate (DEPLOYMENT.md) cannot currently go fully green due to
issues present before this session:
- `Express.User` has no `id` augmentation → every `req.user!.id` errors under tsc
  (`portfolio.ts`, `research.ts`).
- `chat.ts` / `runChatPipeline` `disclaimer` type conflict (`boolean` vs `string`)
  reduces the chat response type to `never`.
- Several `no-useless-escape` lint errors in route regexes; one unused import.
- Web app missing `vite/client` types → `import.meta.env` errors in `api.ts`,
  `LoginPage`, `RegisterPage`.

Recommended as a dedicated maintenance pass (kept out of 2.5 to avoid scope creep).
**Tests pass regardless** (`vitest` uses esbuild, not `tsc`).

## 11. Quick-reference API surface

`POST /auth/{register,login,google,refresh,logout}` ·
`GET /market/indices`, `/market/quote/:symbol` ·
`GET /portfolio`, `POST /portfolio/holdings`, `POST /portfolio/import`,
`DELETE /portfolio/holdings/:id`, **`GET /portfolio/analysis`** (risk/diversification
+ scenario-framed AI, `422` when empty) ·
`GET /research/:symbol` · `GET /technical/:symbol?timeframe=` ·
`POST /chat/message` · `GET /news`, `/news/:symbol` · global-markets & breadth.
Error shape: `{ error: { code, message, details } }`. Rate limits per group.
