# Roadmap — Broken Into Small, Independently Buildable Steps

Each step below is scoped to be completable and verifiable on its own — build one, confirm its acceptance criteria, then move to the next. Do not start a step before the previous one's acceptance criteria are met. This granularity exists specifically so an AI coding agent can execute reliably without silently combining or skipping work.

---

## PHASE 1 — MVP

### 1.1 — Project Scaffolding
**Goal:** a running, empty full-stack skeleton.
- Init monorepo (`apps/web`, `apps/api`, `packages/shared-types`)
- Vite + React + TS + Tailwind + shadcn/ui installed in `apps/web`
- Express + TS installed in `apps/api`, one health-check route (`GET /health`)
- Prisma installed, connected to a local Dockerized Postgres, one no-op migration run
- ESLint + Prettier configured for both apps
**Acceptance:** `pnpm dev` starts both apps; `GET /health` returns `200`; lint passes with zero errors.

### 1.2 — Auth: Email/Password
**Goal:** register/login works end-to-end.
- `User` table (Prisma)
- `POST /auth/register`, `POST /auth/login` (bcrypt hashing, JWT access token issuance)
- Minimal login/register pages in `apps/web`
**Acceptance:** can register a user, log in, receive a valid JWT, and hit one protected test route with it.

### 1.3 — Auth: Refresh Tokens + Google OAuth
**Goal:** sessions persist and Google login works.
- `RefreshToken` table, rotation logic, httpOnly cookie
- `POST /auth/refresh`, `POST /auth/logout`
- Google OAuth button + `POST /auth/google`
**Acceptance:** reloading the app keeps the user logged in; logging out clears the session; Google login creates/links a user correctly.

### 1.4 — Market Data Provider Adapter (interface only)
**Goal:** the `MarketDataProvider` interface exists and is implemented against one real (even free/delayed) data source — no UI yet.
- Define the interface (`getIndexQuote`, `getMarketStatus`, etc. — see SYSTEM_DESIGN.md)
- Implement one concrete adapter
- Unit tests against the adapter using recorded/fixture responses
**Acceptance:** calling the adapter directly (e.g. from a test script) returns a real NIFTY 50 quote with correct shape.

### 1.5 — Dashboard UI
**Goal:** the live dashboard is visible and correct.
- `GET /market/indices` endpoint using the adapter from 1.4
- Dashboard page: index tiles (NIFTY50, BANKNIFTY, SENSEX, VIX), market-status banner
- Polling refresh (start simple — WebSocket can come later if needed)
**Acceptance:** dashboard shows real numbers that update on refresh; market-closed state shows countdown + previous close correctly outside market hours.

### 1.6 — Portfolio: Manual Entry
**Goal:** a user can track holdings by hand.
- `Holding` table
- `GET/POST/DELETE /portfolio/holdings`
- Portfolio page: add/remove holding form, holdings table, computed total investment / current value / P&L
**Acceptance:** adding a holding immediately reflects in totals; P&L calculation covered by unit tests (see TESTING.md) and manually verified against a known example.

### 1.7 — Portfolio: CSV/Excel Import
**Goal:** bulk import works without needing broker OAuth.
- `POST /portfolio/import` (multipart upload, CSV + XLSX parsing)
- Row-level validation with per-row error reporting
- Import UI (file picker, results summary: imported/skipped/errors)
**Acceptance:** a sample contract-note-shaped CSV imports correctly; a deliberately malformed file reports specific row errors instead of failing silently or crashing.

### 1.8 — AI Grounding Pipeline (foundation, no feature UI yet)
**Goal:** the core "never hallucinate" pipeline exists and is testable in isolation.
- `AIProvider` interface + `NvidiaNimAdapter` (cloud mode first; local mode can follow once cloud path works)
- Grounding pipeline steps 1–7 from AI_ENGINE.md, implemented as a reusable service function
- Schema validation (zod) on AI responses; reject-and-retry on malformed output
**Acceptance:** a test that feeds known fixture data through the pipeline gets back a schema-valid response; a test with deliberately missing required data gets a "data unavailable" result, not a fabricated one.

### 1.9 — AI Stock Research Feature
**Goal:** the first real user-facing AI feature, built on top of 1.8.
- `GET /research/:symbol` wired to fetch fundamentals + quote, then run the grounding pipeline
- Research page: symbol search, summary/ratios/bull-bear display, confidence + disclaimer shown
- `ResearchSnapshot` caching (short TTL)
**Acceptance:** searching a real NSE symbol returns a grounded response with visible disclaimer; a symbol with incomplete data returns a partial result with explicit "unavailable" fields, not guesses.

### 1.10 — Basic Technical Analysis
**Goal:** a chart with indicators, no new AI involved yet.
- `GET /technical/:symbol?timeframe=...` (OHLC + SMA/EMA/RSI/MACD)
- TradingView widget embedded, indicator overlays, timeframe switcher
**Acceptance:** chart renders real OHLC data for a searched symbol; switching timeframe updates the chart correctly.

### 1.11 — AI Chat
**Goal:** conversational layer reusing everything built so far — built last in Phase 1 since it depends on 1.8/1.9.
- `ChatThread`/`ChatMessage` tables
- `POST /chat/message`, routing through the same grounding pipeline (never bypassing it)
- Chat UI, scoped to current symbol/portfolio context
**Acceptance:** asking about a stock already viewed in Research answers consistently with that data; asking something requiring new data triggers a real fetch (verify via logs/test) rather than an invented answer.

**Phase 1 exit criteria (all of the above):** no mocked data in the production build, disclaimers present everywhere required, core financial calculations and the grounding pipeline covered by tests per TESTING.md targets.

---

## PHASE 2 — Depth

### 2.1 — Global Markets Monitor
- New adapter methods for Dow/NASDAQ/Nikkei/crude/gold/USD-index/BTC/ETH
- Global Markets page + short AI-generated "why this matters for Indian markets" note (grounded, same pipeline as 1.8)
**Acceptance:** page shows live global figures; the explanatory note references only fetched values.

### 2.2 — Market Breadth
- Advance/decline, top gainers/losers, sector heatmap, delivery %, FII/DII flows, block/bulk deals
- One provider-adapter extension per data type; ship incrementally rather than all at once if a source is easier to obtain than another
**Acceptance:** each sub-feature independently verified against a real trading day's known figures before merging.

### 2.3 — Full Technical Analysis Suite
- Add Ichimoku, SuperTrend, Fibonacci, volume profile, candlestick pattern recognition, multi-timeframe view — one indicator at a time, each with its own unit test against known reference values
**Acceptance:** each new indicator's output matches a hand-checked reference calculation before moving to the next.

### 2.4 — News Aggregation + Sentiment
- News source adapters (start with one, expand)
- Sentiment/impact scoring model, validated against a manually labeled sample set before shipping
- News page + "affected sectors/stocks" linking
**Acceptance:** sentiment labels reviewed against the labeled sample meet an agreed accuracy bar before this ships to users.

### 2.5 — Portfolio AI
- Risk score, diversification score, per-holding strong/weak flag
- Scenario-framed (not directive) entry/exit language, reusing the grounding pipeline + disclaimer system
**Acceptance:** recommendations are phrased as scenarios ("if X, then Y may follow") not commands, confirmed in a UI copy review.

---

## PHASE 3 — Advanced / Regulated-Sensitive
*(compliance review required before public launch of anything in this phase)*

### 3.1 — Option Chain Intelligence
- OI, PCR, max pain, Greeks, build-up/unwinding detection — build the data layer first, AI interpretation layer second
**Acceptance:** raw option-chain data verified correct before any AI interpretation is layered on top.

### 3.2 — F&O Intelligence
- Rollovers, FII/DII derivative positioning
**Acceptance:** figures cross-checked against a known public source for at least one expiry cycle.

### 3.3 — AI Prediction Engine
- Multi-horizon scenarios (1D/1W/1M/3M/6M/1Y), explicit confidence bands, conservative range-based language
**Acceptance:** legal/compliance sign-off on exact output language obtained before this ships.

### 3.4 — Alerts
- Price/stoploss/target/news/portfolio-risk alerts via email + push, built one channel at a time (email first)
**Acceptance:** each channel tested for delivery reliability and correct trigger conditions before adding the next.

### 3.5 — Broker OAuth Integrations
*(on hold — revisit only when actually needed)*
- One broker at a time: Zerodha → Upstox → AngelOne → ICICI Direct → Groww
**Acceptance:** each integration tested against that broker's sandbox before going live; do not start the next broker until the current one is fully working.

---

## Why this granularity

The original phase breakdown (three large phases) was still too coarse for reliable step-by-step execution — "build Portfolio" bundles manual entry, CSV import, and AI analysis into one unit an agent could easily half-finish or scope-creep. Each numbered step above is small enough to build, test, and confirm in one sitting, with a clear "done" signal before moving on.
