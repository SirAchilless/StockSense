# StockSense — Project Memory & Analysis

> Analytical snapshot of the whole repository: what the project is, how it is
> structured, what is actually built (vs. documented), and the notable gaps
> between the documentation set and the code.
> First generated 2026-07-28; last updated 2026-07-28 after full Phase 3.2 audit + completion pass.

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

| Layer              | Stack                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend           | React 19, TypeScript, Vite 5, TailwindCSS 3, shadcn/ui (Radix), Framer Motion, TanStack Query 5, TanStack Table, Redux Toolkit, React Router 6, Recharts, lightweight-charts |
| Backend            | Node.js 20+, Express 4, TypeScript (strict)                                                                                                                                  |
| Database           | PostgreSQL 16 + Prisma 5                                                                                                                                                     |
| Auth               | JWT (access + rotating refresh), Google OAuth (passport-google-oauth20), bcryptjs                                                                                            |
| AI                 | NVIDIA NIM (OpenAI-compatible), provider-agnostic `AIProvider` interface; Mock adapter default                                                                               |
| Market data        | Pluggable `MarketDataProvider`; Alpha Vantage adapter + Mock default                                                                                                         |
| Options data       | Pluggable `OptionChainProvider`; NSE adapter + Mock default (Phase 3.1)                                                                                                      |
| F&O data           | Pluggable `FnoDataProvider`; NSE adapter + Mock default (Phase 3.2)                                                                                                          |
| News               | Pluggable `NewsProvider`; RSS adapter + Mock default                                                                                                                         |
| Tooling            | pnpm 9 workspaces, ESLint, Prettier, Vitest                                                                                                                                  |
| Infra (documented) | Docker, NGINX, GitHub Actions, Vercel (web), AWS ECS/RDS (api)                                                                                                               |

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
`/portfolio`, `/research`, `/technical`, `/chat`, `/news`, `/options`, `/fno`.
Middleware: helmet, cors (credentials), compression, morgan, json/urlencoded,
cookie-parser, passport.

**Layered structure:** `routes → lib/services → prisma`.

### Services (the only layers allowed to touch external providers)

- **`services/market-data/`** — `MarketDataProvider` with `MockMarketDataAdapter`
  (default) and `AlphaVantageAdapter`. Env: `MARKET_DATA_PROVIDER`.
- **`services/ai/`** — `AIProvider` with `MockAIAdapter` (default) and
  `NvidiaNimAdapter`. The **grounding pipeline** exposes:
  `runResearchPipeline`, `runChatPipeline`, `runGlobalNotePipeline`,
  `runNewsSentimentPipeline`, `runPortfolioAnalysisPipeline` (2.5),
  `runOptionChainPipeline` (3.1), **`runFnoPipeline`** (3.2).
  Plus shared `DISCLAIMER`.
- **`services/news/`** — `NewsProvider` with `MockNewsAdapter` (default) and
  `RssNewsAdapter`. Env: `NEWS_PROVIDER`.
- **`services/options/`** _(3.1)_ — `OptionChainProvider` with
  `MockOptionChainAdapter` (default) and `NseOptionsAdapter`. Env: `OPTIONS_PROVIDER`.
- **`services/fno/`** _(3.2)_ — `FnoDataProvider` with `MockFnoAdapter` (default)
  and `NseFnoAdapter`. Env: `FNO_PROVIDER`.

All services use lazy singleton factory; all default to Mock → **zero API keys needed**.

### `lib/` utilities

`jwt.ts`, `passport.ts`, `prisma.ts`, `import-parser.ts` (CSV/XLSX),
`indicators.ts` (SMA/EMA/RSI/MACD), `pnl.ts` (realized/unrealized P&L),
`portfolio-risk.ts` (2.5 — deterministic risk/diversification),
`options-greeks.ts` (3.1 — Black-Scholes, IV solver, max pain, PCR),
**`fno-analytics.ts`** (3.2 — rollover %, cost of carry, FII/DII 5d sums,
participant L/S ratio, contra signal).
`middleware/authenticate.ts` guards protected routes.

### Persistence (Prisma)

Models: `User`, `RefreshToken`, `Portfolio` (1:1 with user), `Holding`. Postgres
16 via `DATABASE_URL`. `docker-compose.yml` provisions only local Postgres.

### Tests (Vitest — 176 tests across 11 files)

Pre-existing: `import-parser` (dep missing in sandbox), `indicators`, `pnl`,
`portfolio-risk`, `grounding-pipeline`, market-data / ai / news mock adapters.
Phase 3.1: `options-greeks` (25), `mock-options-adapter` (18).
**Phase 3.2: `fno-analytics` (23), `mock-fno-adapter` (21).**

---

## 5. Frontend (`apps/web`)

`App.tsx` — lazy-loaded, code-split routes behind `ProtectedRoute` + `AppLayout`.
Public: `/login`, `/register`. Protected: `/dashboard`, `/portfolio`,
`/research`, `/technical`, `/chat`, `/global`, `/breadth`, `/news`,
`/options` (3.1), **`/fno`** (3.2).

- **Component groups:** `breadth/`, `chat/`, `global/`, `market/`, `news/`,
  `portfolio/`, `research/`, `technical/`, `layout/`, `options/` (3.1),
  **`fno/`** (RolloverPanel, FiiDiiDerPanel, ParticipantOITable, FnoAIPanel).
- **Hooks:** all prior hooks + `useOptions` (3.1) + **`useFno`** (3.2 —
  `useRollover`, `useFiiDerPositions`, `useParticipantOI`, `useFnoAnalysis`).
- **State rule:** server data in TanStack Query; Redux only for client-only state.

---

## 6. Auth & security model

- Email/password (bcrypt) + Google OAuth. Access JWT ~15 min in memory; refresh
  token httpOnly + secure + sameSite, rotated on every use.
- Every API boundary validated with zod. Uploads MIME/size/row-validated.
- Provider keys backend-scoped, never in the client bundle. AI-backed endpoints
  (`/research`, `/chat`, `/news` sentiment, `/portfolio/analysis`,
  `/options/analysis`, **`/fno/analysis`**) rate-limited.
- Prompt-injection defense: user text treated as data; AI output schema-validated.

---

## 7. Documentation set

`README`, `ARCHITECTURE`, `SYSTEM_DESIGN`, `FEATURES`, `ROADMAP`,
`API_DOCUMENTATION`, `DATABASE_SCHEMA`, `AI_ENGINE`, `AUTHENTICATION`,
`ENVIRONMENT_SETUP`, `DEPLOYMENT`, `SECURITY`, `TESTING`, `CONTRIBUTING`,
`PORTFOLIO_ANALYSIS` (2.5), `OPTIONS_CHAIN` (3.1), **`FNO_INTELLIGENCE`** (3.2),
**`CHANGELOG`**, plus `ai-stock-intelligence-platform-prompt.md`.

---

## 8. Build status by phase (verified 2026-07-28, full audit + fix pass)

- **Phase 1 (1.1–1.11):** built and green — scaffolding (+ CI + Husky added 2026-07-28),
  auth, market-data, dashboard, portfolio (manual + CSV/Excel), grounding pipeline,
  AI research, technical analysis, chat.
- **Phase 2.1–2.4:** built — Global Markets, Market Breadth, Technical components, News+sentiment.
- **Phase 2.5 (Portfolio AI):** built — deterministic risk/diversification scoring,
  `GET /portfolio/analysis`, AI narrative, `PortfolioAIPanel`.
- **Phase 3.1 (Option Chain Intelligence):** built — Black-Scholes Greeks library,
  mock + NSE adapters, `GET /options/chain|analysis`, full frontend.
- **Phase 3.2 (F&O Intelligence):** COMPLETE (2026-07-28 final pass) —
  - `classifyOITrend` pure function + 4 unit tests
  - FnoDataProvider extended: PCRData, OITrend, CostOfCarryItem, +5 methods
  - 11 new API routes (incl. PCR, OI trends, cost-of-carry, market-wide)
  - `DataUnavailableError` typed error class + `packages/market-data/interfaces`
  - Frontend: AIDisclaimer, PCRGauge (glassmorphism), PCRTrendChart, OITrendTable,
    CostOfCarryChart, RolloverCard (glassmorphism), RolloverHeatmap (≥50 symbols),
    FnOAICommentary, FnODashboard (8-tab page replacing FnoPage)
  - **196 tests passing; tsc --noEmit clean on both api + web**
- **Phase 3.3–3.5:** not started (compliance-gated).

### Phase 3.2 grounding design (important)

Rollover %, cost of carry, FII/DII 5-day sums, and participant L/S ratios are
computed **deterministically** in `lib/fno-analytics.ts` before any AI call.
The AI receives only those pre-computed aggregates — no raw series — and narrates
scenario-framed commentary. It never emits or overrides the numeric values.
See [FNO_INTELLIGENCE.md](./FNO_INTELLIGENCE.md).

---

## 9. Notable gaps: docs vs. actual code ⚠️

1. **Market-data provider.** Docs describe `nse_delayed` / `paid_vendor`; code ships Mock + AlphaVantage.
2. **Implementation ahead of "Phase 1 MVP".** Phases 2.x, 3.1, and 3.2 are all built.
3. **Database schema mismatch.** `DATABASE_SCHEMA.md` documents tables that don't exist in Prisma — treat code as authoritative.
4. **Default runtime fully mocked** until env vars are set.
5. **`API_DOCUMENTATION.md` and `FEATURES.md`** don't yet document `/options/*` or `/fno/*` — docs pass needed.

## 10. Repo health — current status 2026-07-28 ✅

All pre-existing TypeScript errors resolved in 2026-07-28 pass:

- Express.User augmentation fixed (id/email now on User interface)
- runChatPipeline disclaimer type conflict resolved
- vite/client types added (vite-env.d.ts)
- Prisma client regenerated; declaration emit disabled for app packages
- **196 tests pass** (Vitest); **tsc --noEmit clean** on api + web

## 11. Quick-reference API surface

`POST /auth/{register,login,google,refresh,logout}` ·
`GET /market/indices`, `/market/quote/:symbol` ·
`GET /portfolio`, `POST /portfolio/holdings`, `POST /portfolio/import`,
`DELETE /portfolio/holdings/:id`, `GET /portfolio/analysis` ·
`GET /research/:symbol` · `GET /technical/:symbol?timeframe=` ·
`POST /chat/message` · `GET /news`, `/news/:symbol` · global-markets & breadth ·
`GET /options/symbols`, `/options/expiries/:symbol`,
`/options/chain/:symbol`, `/options/analysis/:symbol` ·
**`GET /fno/symbols`, `/fno/rollover/market-wide`, `/fno/rollover/:symbol`,
`/fno/fii-positions`, `/fno/participant-oi`, `/fno/cost-of-carry/:symbol`,
`/fno/oi-trends/:symbol`, `/fno/pcr/market-wide`, `/fno/pcr/:symbol`,
`/fno/analysis/:symbol`, `POST /fno/ai-commentary`** (Phase 3.2)

Error shape: `{ error: { code, message, retryable } }`. Success shape: `{ data, meta: { source, asOf, cachedAt } }`. Rate limits per group.
