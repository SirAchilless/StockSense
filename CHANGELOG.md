# Changelog

All notable changes to StockSense, tracked by ROADMAP step. Dates are IST.

## [Unreleased]

### Added — Phase 3.2: F&O Intelligence (2026-07-28)
- **Data layer** (`services/fno/`): `FnoDataProvider` interface, `MockFnoAdapter` (10-day FII/DII
  series, realistic rollover %, CoC, 4-participant OI snapshot), `NseFnoAdapter` (live NSE API —
  `/api/quote-derivative`, `/api/fiiDiiData`, `/api/participant-oi`), lazy singleton factory
  via `FNO_PROVIDER` env var (`mock` | `nse`; default `mock`).
- **Deterministic computation** (`lib/fno-analytics.ts`): `computeRolloverMetrics` (rollover %,
  total OI, vs-average diff), `computeCostOfCarry` (annualised contango/backwardation),
  `computeFiiDerSummary` (5-day rolling sums, latest OI, FII index PCR),
  `computeParticipantMetrics` (FII L/S ratio, net long %, CLIENT-vs-FII contra signal).
- **AI interpretation layer** (`runFnoPipeline`): concurrently fetches rollover, FII/DII, and
  participant OI; derives participant metrics; injects compact grounded payload; AI produces
  5-section scenario-framed commentary (rollover, FII, DII, CoC, overall).
  `generateFnoInterpretation` added to both `MockAIAdapter` and `NvidiaNimAdapter`.
- **API routes** (`routes/fno.ts`): `GET /fno/symbols`, `GET /fno/rollover/:symbol`,
  `GET /fno/fii-positions`, `GET /fno/participant-oi`, `GET /fno/analysis/:symbol`
  (rate-limited 10/min). All routes behind `authenticate`.
- **Frontend**: `FnoPage` with symbol selector, 3-tab view — **RolloverPanel** (summary tiles,
  OI-by-expiry bar chart, CoC bar chart, expiry table), **FiiDiiDerPanel** (net buy tiles +
  7-session daily chart), **ParticipantOITable** (index futures/stock futures/options tables
  with per-participant PCR), **FnoAIPanel** (5-section AI interpretation + disclaimer).
  `/fno` route added; "F&O" nav link added to `AppLayout`.
- **Tests**: 44 new (fno-analytics.test.ts + mock-fno-adapter.test.ts). Total **176 tests pass**.
- **Docs**: `FNO_INTELLIGENCE.md`, `CHANGELOG.md`, `memory.md` updated.

### Added — Phase 3.1: Option Chain Intelligence (2026-07-28)
- **Data layer** (`services/options/`): `OptionChainProvider` interface, `MockOptionChainAdapter`
  (full Black-Scholes, IV skew, deterministic OI distribution, all Greeks), and
  `NseOptionsAdapter` (live NSE public API with session-cookie management).
  Factory in `index.ts` selects adapter via `OPTIONS_PROVIDER` env var (`mock` | `nse`; default `mock`).
- **Deterministic computation** (`lib/options-greeks.ts`): Black-Scholes price + delta/gamma/theta/vega
  (Abramowitz & Stegun CDF, put-call parity verified), Newton-Raphson IV solver, max-pain algorithm,
  PCR calculation, IV percentile, ATM-strike finder, strike-interval registry.
- **AI interpretation layer** (`runOptionChainPipeline`): Injects pre-computed PCR, max pain,
  IV percentile, and top-OI strike concentrations into `generateOptionChainInterpretation`.
  AI narrates only — scenario-framed, never directive, never emits or overrides numeric values.
  Implemented on both MockAIAdapter and NvidiaNimAdapter; zod-validated with one retry.
- **API routes** (`routes/options.ts`): `GET /options/symbols`, `GET /options/expiries/:symbol`,
  `GET /options/chain/:symbol` (data only), `GET /options/analysis/:symbol` (data + AI, 10/min rate-limited).
  All routes behind `authenticate` middleware.
- **Frontend**: `OptionsPage` with symbol selector (4 indices + 15 stocks), expiry selector,
  3-tab view (Option Chain table / OI Distribution bar chart / Max Pain curve),
  `GreeksPanel` summary, and lazy-loaded `OptionAIPanel` with confidence badge and disclaimer.
  `/options` route added; "Options" nav link added to `AppLayout`.
- **Tests**: 37 new tests across 2 files — Black-Scholes correctness (put-call parity,
  Greek sign constraints, edge cases, IV recovery), max pain, PCR, IV percentile, ATM strike;
  mock adapter (expiry format, Thursday rule, chain structure, Delta bounds, lot sizes).
- **Docs**: `OPTIONS_CHAIN.md` covering architecture, API reference, supported symbols,
  component guide, and Phase 3 compliance limitations.

### Added — Phase 2.5: Portfolio AI (2026-07-28)
- Deterministic portfolio risk & diversification scoring (`lib/portfolio-risk.ts`):
  risk score, diversification score, concentration/sector HHI, effective holdings,
  and per-holding strong/weak/neutral flags — computed from the user's own holdings
  and live P&L, never AI-generated.
- `AIProvider.generatePortfolioAnalysis` on both the Mock and NVIDIA NIM adapters,
  plus `runPortfolioAnalysisPipeline` — the AI narrates over grounded metrics only,
  in scenario-framed ("if X, then Y may follow"), non-directive language.
- `GET /portfolio/analysis` endpoint (auth + 5/min rate limit; `422` when empty).
- Frontend: `usePortfolioAnalysis` hook, `PortfolioAIPanel` (score meters, sector
  allocation, per-holding scenario notes, confidence bar, disclaimer), and an
  "Analyze portfolio" action on the Portfolio page.
- Mock market-data adapter now maps common NSE symbols to real sectors so
  sector allocation / diversification are demonstrable without a live data key.
- Tests: `lib/__tests__/portfolio-risk.test.ts` (9) and portfolio-analysis pipeline
  tests, including an assertion that commentary stays scenario-framed, not directive.

### Notes / open items
- Pre-existing (from earlier phases, not introduced by 2.5): the API does not yet
  typecheck cleanly — `Express.User` is missing an `id` augmentation (affects every
  `req.user!.id`), a `chat.ts` / `runChatPipeline` `disclaimer` type conflict, several
  `no-useless-escape` lint errors, and missing `vite/client` types on the web app
  (`import.meta.env`). These should be cleaned up as a separate maintenance pass so
  the CI lint/test/build gate (see DEPLOYMENT.md) can go green.

## Prior phases (already in repo)
- Phase 1.1–1.11 — scaffolding, auth (JWT + Google OAuth), market-data adapter,
  dashboard, portfolio (manual + CSV/Excel import), grounding pipeline, AI research,
  basic technical analysis, AI chat.
- Phase 2.1 — Global Markets monitor + AI "why this matters" notes.
- Phase 2.2 — Market Breadth (advance/decline, gainers/losers, sector heatmap, FII/DII).
- Phase 2.3 — Technical analysis components (patterns, volume profile, indicators).
- Phase 2.4 — News aggregation + AI sentiment/impact scoring.
