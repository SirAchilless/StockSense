# Changelog

All notable changes to StockSense, tracked by ROADMAP step. Dates are IST.

## [Unreleased]

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
