# StockSense — Project Memory & Analysis

> Analytical snapshot of the whole repository: what the project is, how it is
> structured, what is actually built (vs. documented), and the notable gaps
> between the documentation set and the code. Generated 2026-07-28.

---

## 1. What this project is

**StockSense** (docs title: "AI Stock Intelligence Platform") is an
AI-powered research and portfolio-tracking web app for **Indian equity
markets** (NSE/BSE). Its defining design principle is an **anti-hallucination
grounding pipeline**: the AI layer never free-generates a factual/numeric
claim — every price, ratio, or news reference must trace back to data actually
fetched in that request, enforced structurally (schema validation), not just
by prompt instruction.

It ships with a hard, non-removable **disclaimer** on every
recommendation-shaped output ("not a SEBI-registered investment adviser").

- **Repo:** `SirAchilless/StockSense`, default branch `main`
- **Package name:** `stocksense` (private monorepo)
- **Scale:** 139 tracked files; ~8,570 lines of TypeScript/TSX.

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
└── *.md                # 14-file documentation set (see §7)
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
  `MARKET_DATA_PROVIDER` env (`mock` | `alpha_vantage`). Interface covers index
  quotes, stock quotes, fundamentals, OHLC, market status, **global symbols**,
  and **market breadth** (advance/decline, sector performance, FII/DII).
- **`services/ai/`** — `AIProvider` interface with `MockAIAdapter` (default)
  and `NvidiaNimAdapter`. Selected via `NIM_MODE` (`cloud` | `local`;
  anything else → mock). The **grounding pipeline** (`grounding-pipeline.ts`)
  exposes `runResearchPipeline`, `runChatPipeline`, `runGlobalNotePipeline`,
  `runNewsSentimentPipeline`, and a shared `DISCLAIMER`.
- **`services/news/`** — `NewsProvider` with `MockNewsAdapter` (default) and
  `RssNewsAdapter`. Selected via `NEWS_PROVIDER` (`mock` | `rss`).

All three services use a lazy singleton factory (`getXProvider()`) and default
to the **Mock adapter**, so the app runs end-to-end with **zero API keys**.

### `lib/` utilities
`jwt.ts`, `passport.ts` (Google OAuth), `prisma.ts`, `import-parser.ts`
(CSV/XLSX portfolio import via `xlsx`), `indicators.ts` (SMA/EMA/RSI/MACD),
`pnl.ts` (realized/unrealized P&L). `middleware/authenticate.ts` guards
protected routes; `schemas/auth.ts` holds zod validation.

### Persistence (Prisma)
Models: `User`, `RefreshToken`, `Portfolio` (1:1 with user), `Holding`
(belongs to Portfolio). Postgres 16, `datasource` via `DATABASE_URL`.
`docker-compose.yml` provisions only local Postgres (`stocksense` db).

### Tests (Vitest — 7 files)
`import-parser`, `indicators`, `pnl` (financial calcs), `grounding-pipeline`,
plus mock-adapter tests for market-data / ai / news.

---

## 5. Frontend (`apps/web`)

`App.tsx` — lazy-loaded, code-split routes behind a `ProtectedRoute` +
`AppLayout` shell. Public: `/login`, `/register`. Protected: `/dashboard`,
`/portfolio`, `/research`, `/technical`, `/chat`, `/global`, `/breadth`,
`/news`. Root redirects to `/dashboard`. Google OAuth `?token=` handled by
`useOAuthCallback`.

- **Pages:** Dashboard, Portfolio, Research, Technical, Chat, GlobalMarkets,
  Breadth, News, Home, Login, Register.
- **Component groups:** `breadth/` (AdvanceDecline, FiiDii, GainersLosers,
  SectorHeatmap), `chat/`, `global/`, `market/`, `news/`, `portfolio/`
  (Add/Import/Holdings/Summary), `research/` (ConfidenceBar, Disclaimer,
  RatioGrid), `technical/` (Candlestick, IndicatorPanel, PatternSignals,
  TimeframeSelector, VolumeProfile), `layout/`.
- **Hooks:** `useBreadth`, `useChat`, `useGlobalMarkets`, `useMarketData`,
  `useNews`, `useOAuthCallback`, `usePortfolio`, `useResearch`, `useTechnical`.
- **State rule (enforced by design):** server data lives in TanStack Query;
  Redux (`store/authSlice.ts`) holds only client-only session/UI state.
- **Typed API client** in `lib/api.ts`; per-feature DTOs in `types/`.

---

## 6. Auth & security model

- Email/password (bcrypt) + Google OAuth. Access JWT ~15 min in memory;
  refresh token httpOnly + secure + sameSite, **rotated on every use** (reuse
  of a revoked token invalidates the whole session chain — theft detection).
- Every API boundary validated with zod. File uploads MIME/size/row-validated.
- No secrets in source control (`.env.example` files only). Provider keys are
  backend-scoped, never in the client bundle.
- Prompt-injection defense: user text treated as data, never concatenated into
  system instructions. AI output schema-validated as a security control.

---

## 7. Documentation set (14 markdown files)

`README`, `ARCHITECTURE`, `SYSTEM_DESIGN`, `FEATURES`, `ROADMAP`,
`API_DOCUMENTATION`, `DATABASE_SCHEMA`, `AI_ENGINE`, `AUTHENTICATION`,
`ENVIRONMENT_SETUP`, `DEPLOYMENT`, `SECURITY`, `TESTING`, `CONTRIBUTING`, plus
`ai-stock-intelligence-platform-prompt.md` (the originating spec).

The **ROADMAP** breaks work into small, independently buildable steps
(1.1–1.11 for Phase 1) explicitly so an AI coding agent can execute reliably
without combining or skipping work. Phases: **1 – MVP**, **2 – Depth** (global
markets, breadth, full TA suite, news+sentiment, portfolio AI), **3 –
Advanced/regulated-sensitive** (option chain, F&O, prediction engine, alerts,
broker OAuth — gated on compliance review).

---

## 8. Notable gaps: docs vs. actual code ⚠️

These divergences matter for anyone relying on the docs as ground truth:

1. **Market-data provider.** Docs (`ENVIRONMENT_SETUP`, `FEATURES`) describe
   `nse_delayed` / `paid_vendor` adapters. The **code** ships a **Mock**
   adapter (default) and an **Alpha Vantage** adapter — not the documented
   NSE/vendor adapters.
2. **Implementation is ahead of the "Phase 1 MVP" framing.** README/FEATURES
   scope Phase 1 to dashboard/auth/portfolio/research/basic-TA/chat and list
   global markets, breadth, and news+sentiment as *out of scope*. The **code
   already implements** Global Markets, Market Breadth, and News+Sentiment
   (routes, services, pages, hooks) — i.e. much of Phase 2.
3. **Database schema mismatch.** `DATABASE_SCHEMA.md` documents `Holding`
   (directly on User), `ResearchSnapshot`, `ChatThread`, `ChatMessage`,
   `Watchlist`, and a `HoldingSource` enum. The **actual `schema.prisma`** uses
   a `Portfolio` model (1:1 with User) owning `Holding`, and (in the head of
   the file) does not show the chat/research/watchlist tables — chat is served
   without documented persistence models. Treat the code schema as
   authoritative; the doc is stale.
4. **Default runtime is fully mocked.** With no env vars, all three providers
   (market-data, AI, news) fall back to Mock adapters. This contradicts the
   Phase 1 exit criterion "no mocked data in the production build" — mock is
   the *default*, real providers are opt-in via env.
5. **AI provider.** Docs center on NVIDIA NIM; code confirms `NvidiaNimAdapter`
   but the working default is `MockAIAdapter` until `NIM_MODE` is set.

---

## 9. How to run (from docs + verified code)

```bash
pnpm install
docker compose up -d postgres           # local Postgres 16 (db: stocksense)
pnpm --filter api prisma migrate dev
pnpm dev                                 # web :5173, api :4000
```
Runs out-of-the-box on mock data. To use real data set `MARKET_DATA_PROVIDER`,
`NIM_MODE` (+ `NIM_API_KEY`), and `NEWS_PROVIDER` in `apps/api/.env`.

---

## 10. Quick-reference API surface

`POST /auth/{register,login,google,refresh,logout}` ·
`GET /market/indices`, `/market/quote/:symbol` ·
`GET /portfolio`, `POST /portfolio/holdings`, `POST /portfolio/import`,
`DELETE /portfolio/holdings/:id` ·
`GET /research/:symbol` (422 with `missingFields` when data incomplete —
never estimates) · `GET /technical/:symbol?timeframe=` ·
`POST /chat/message` · `GET /news` · plus global-markets & breadth endpoints.
Error shape: `{ error: { code, message, details } }`. Rate limits per group.
