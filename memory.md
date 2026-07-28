# StockSense — Project Memory & Analysis

> Analytical snapshot of the whole repository: what the project is, how it is
> structured, what is actually built (vs. documented), and the notable gaps
> between the documentation set and the code.
> First generated 2026-07-28; last updated 2026-07-28 after Phase 3.1 (Option Chain Intelligence).

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
| Options data | Pluggable `OptionChainProvider`; NSE adapter + Mock default (Phase 3.1) |
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
`/portfolio`, `/research`, `/technical`, `/chat`, `/news`, `/options`.
Middleware: helmet, cors (credentials), compression, morgan, json/urlencoded,
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
  `runGlobalNotePipeline`, `runNewsSentimentPipeline`,
  `runPortfolioAnalysisPipeline` (Phase 2.5), and **`runOptionChainPipeline`**
  (Phase 3.1), plus a shared `DISCLAIMER`.
- **`services/news/`** — `NewsProvider` with `MockNewsAdapter` (default) and
  `RssNewsAdapter` (`NEWS_PROVIDER` = `mock` | `rss`).
- **`services/options/`** *(Phase 3.1)* — `OptionChainProvider` with
  `MockOptionChainAdapter` (default, full Black-Scholes + Greeks + OI fixtures)
  and `NseOptionsAdapter` (live NSE API, cookie-based session).
  Selected via `OPTIONS_PROVIDER` (`mock` | `nse`; default `mock`).

All services use a lazy singleton factory and default to the **Mock adapter**, so
the app runs end-to-end with **zero API keys**.

### `lib/` utilities
`jwt.ts`, `passport.ts`, `prisma.ts`, `import-parser.ts` (CSV/XLSX),
`indicators.ts` (SMA/EMA/RSI/MACD), `pnl.ts` (realized/unrealized P&L),
`portfolio-risk.ts` (Phase 2.5 — deterministic risk/diversification scoring),
and **`options-greeks.ts`** (Phase 3.1 — Black-Scholes price+Greeks, Newton-Raphson
IV solver, max-pain algorithm, PCR, IV percentile, ATM-strike helpers).
`middleware/authenticate.ts` guards protected routes.

### Persistence (Prisma)
Models: `User`, `RefreshToken`, `Portfolio` (1:1 with user), `Holding`. Postgres
16 via `DATABASE_URL`. `docker-compose.yml` provisions only local Postgres.

### Tests (Vitest — 132 tests across 9 files)
`import-parser` (dep missing in sandbox — pre-existing), `indicators`, `pnl`,
`portfolio-risk`, `grounding-pipeline`, mock-adapter tests for market-data / ai /
news, and **(Phase 3.1)** `options-greeks` (25 tests, Black-Scholes correctness
incl. put-call parity) and `mock-options-adapter` (18 tests).

---

## 5. Frontend (`apps/web`)

`App.tsx` — lazy-loaded, code-split routes behind `ProtectedRoute` + `AppLayout`.
Public: `/login`, `/register`. Protected: `/dashboard`, `/portfolio`,
`/research`, `/technical`, `/chat`, `/global`, `/breadth`, `/news`,
**`/options`** (Phase 3.1).

- **Component groups:** `breadth/`, `chat/`, `global/`, `market/`, `news/`,
  `portfolio/` (Add/Import/Holdings/Summary + PortfolioAIPanel),
  `research/` (ConfidenceBar, DisclaimerBanner, RatioGrid), `technical/`, `layout/`,
  **`options/`** (OptionChainTable, GreeksPanel, OIChart, MaxPainChart, OptionAIPanel).
- **Hooks:** `useBreadth`, `useChat`, `useGlobalMarkets`, `useMarketData`,
  `useNews`, `useOAuthCallback`, `usePortfolio` (+ `usePortfolioAnalysis`),
  `useResearch`, `useTechnical`, **`useOptions`** (`useOptionChain`,
  `useOptionAnalysis`, `useOptionExpiries`).
- **State rule:** server data in TanStack Query; Redux only for client-only state.

---

## 6. Auth & security model

- Email/password (bcrypt) + Google OAuth. Access JWT ~15 min in memory; refresh
  token httpOnly + secure + sameSite, rotated on every use.
- Every API boundary validated with zod. Uploads MIME/size/row-validated.
- Provider keys backend-scoped, never in the client bundle. AI-backed endpoints
  (`/research`, `/chat`, `/news` sentiment, `/portfolio/analysis`,
  **`/options/analysis`**) rate-limited.
- Prompt-injection defense: user text treated as data; AI output schema-validated.

---

## 7. Documentation set

`README`, `ARCHITECTURE`, `SYSTEM_DESIGN`, `FEATURES`, `ROADMAP`,
`API_DOCUMENTATION`, `DATABASE_SCHEMA`, `AI_ENGINE`, `AUTHENTICATION`,
`ENVIRONMENT_SETUP`, `DEPLOYMENT`, `SECURITY`, `TESTING`, `CONTRIBUTING`,
`PORTFOLIO_ANALYSIS` (Phase 2.5), **`OPTIONS_CHAIN`** (Phase 3.1),
**`CHANGELOG`**, plus `ai-stock-intelligence-platform-prompt.md`.

ROADMAP breaks work into small, independently buildable steps (Phase 1: 1.1–1.11;
Phase 2: 2.1–2.5; Phase 3: 3.1–3.5, compliance-gated).

---

## 8. Build status by phase (verified 2026-07-28)

- **Phase 1 (1.1–1.11):** built — scaffolding, auth, market-data adapter,
  dashboard, portfolio (manual + CSV/Excel), grounding pipeline, AI research,
  basic technical analysis, AI chat.
- **Phase 2.1–2.4:** built — Global Markets + AI note, Market Breadth, technical
  components (patterns/volume profile), News + AI sentiment.
- **Phase 2.5 (Portfolio AI):** built — deterministic risk & diversification
  scores + per-holding flags, `GET /portfolio/analysis`, AI scenario-framed
  narrative, `PortfolioAIPanel` UI. All 88 unit tests passed at that point.
- **Phase 3.1 (Option Chain Intelligence):** built this session — Black-Scholes
  Greeks library (`lib/options-greeks.ts`), PCR + max-pain + IV percentile
  computations, `OptionChainProvider` with Mock and NSE adapters, AI interpretation
  pipeline (`runOptionChainPipeline`), `GET /options/chain/:symbol` (data only) and
  `GET /options/analysis/:symbol` (data + AI, rate-limited), full frontend
  (OptionChainTable, GreeksPanel, OIChart, MaxPainChart, OptionAIPanel), route
  `/options`, nav link. **37 new tests; total 132 tests pass.**
- **Phase 3.2–3.5:** not started (compliance-gated).

### Phase 3.1 grounding design (important)
All option Greeks (delta, gamma, theta, vega), PCR, max pain, and IV percentile
are computed **deterministically** in `lib/options-greeks.ts` before any AI call.
The AI only narrates — scenario-framed, never directive, never emitting or
overriding the numeric values. This mirrors the anti-hallucination principle
from Phase 1 research and Phase 2.5 Portfolio AI. See [OPTIONS_CHAIN.md](./OPTIONS_CHAIN.md).

---

## 9. Notable gaps: docs vs. actual code ⚠️

1. **Market-data provider.** Docs describe `nse_delayed` / `paid_vendor`; the code
   ships **Mock** (default) + **Alpha Vantage**.
2. **Implementation ahead of the "Phase 1 MVP" framing.** Global Markets, Breadth,
   News+Sentiment, Portfolio AI (Phase 2), and now Option Chain (Phase 3.1) are built.
3. **Database schema mismatch.** `DATABASE_SCHEMA.md` documents tables that don't
   exist in the actual `schema.prisma` — treat the code schema as authoritative.
4. **Default runtime is fully mocked** (all providers) until env vars are set.
5. **`API_DOCUMENTATION.md` and `FEATURES.md`** do not yet document the
   `/options/*` endpoints — update needed in a docs pass.

## 10. Repo health — pre-existing issues (not from Phase 3.1) 🔧

- `Express.User` has no `id` augmentation → `req.user!.id` errors under `tsc`.
- `chat.ts` / `runChatPipeline` `disclaimer` type conflict (`boolean` vs `string`).
- Several `no-useless-escape` lint errors in route regexes.
- Web app missing `vite/client` types → `import.meta.env` errors.
- `import-parser.test.ts` requires `xlsx` not installed in dev sandbox.

**Tests pass regardless** (`vitest` uses esbuild, not `tsc`).

## 11. Quick-reference API surface

`POST /auth/{register,login,google,refresh,logout}` ·
`GET /market/indices`, `/market/quote/:symbol` ·
`GET /portfolio`, `POST /portfolio/holdings`, `POST /portfolio/import`,
`DELETE /portfolio/holdings/:id`, `GET /portfolio/analysis` ·
`GET /research/:symbol` · `GET /technical/:symbol?timeframe=` ·
`POST /chat/message` · `GET /news`, `/news/:symbol` · global-markets & breadth ·
**`GET /options/symbols`, `/options/expiries/:symbol`,
`/options/chain/:symbol?expiry=`, `/options/analysis/:symbol?expiry=`** (Phase 3.1)

Error shape: `{ error: { code, message, details } }`. Rate limits per group.
