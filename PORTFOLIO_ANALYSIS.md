# Portfolio Analysis (Phase 2.5)

AI-assisted portfolio intelligence: a **risk score**, a **diversification score**,
**per-holding strong/weak flags**, and **scenario-framed** commentary — built on
top of the manual/CSV portfolio (steps 1.6–1.7) and the grounding pipeline (1.8).

## Design principle — scores are grounded, not generated

Consistent with [AI_ENGINE.md](./AI_ENGINE.md), the AI layer never free-generates
a numeric claim. All numbers are computed **deterministically** from the user's own
holdings and live P&L in `apps/api/src/lib/portfolio-risk.ts`. The AI provider only
**narrates** over those already-computed metrics; it does not emit or override them.

```
holdings + live P&L ──▶ portfolio-risk.ts (deterministic scores)
                             │
                             ▼
                    inject metrics into prompt
                             │
                             ▼
              AIProvider.generatePortfolioAnalysis()  ──▶ narrative only
                             │
                             ▼
        metrics (grounded) + analysis (narrative) + disclaimer
```

## Metrics (deterministic)

All weights are by **current market value** (`quantity × currentPrice`).

| Metric | Definition |
|---|---|
| `concentrationHHI` | Herfindahl index of single-name weights, `Σ wᵢ²` (0–1; lower = more spread) |
| `sectorHHI` | Herfindahl index of sector weights, `Σ sⱼ²` (0–1) |
| `largestPositionPct` | Biggest single position as % of value |
| `effectiveHoldings` | `1 / concentrationHHI` — equal-weight-equivalent breadth |
| `diversificationScore` | `round((1 − concentrationHHI)·60 + (1 − sectorHHI)·40)`, 0–100 (higher = better) |
| `riskScore` | `round(concentrationHHI·45 + sectorHHI·30 + (largestPositionPct/100)·25)`, 0–100 (higher = riskier) |
| `riskLevel` | `low` (<34), `moderate` (34–66), `high` (≥67) |

### Per-holding flag

Purely from unrealized P&L %:

- `strong` — up **≥ +10%**
- `weak` — down **≤ −10%**
- `neutral` — in between

Sector for each holding comes from `MarketDataProvider.getStockFundamentals`;
when a sector can't be fetched it degrades to `Unknown` rather than being guessed.

## Scenario-framed language (acceptance criterion)

Commentary is phrased as **scenarios** ("if X, then Y may follow"), never as
directives. The system prompt (and the mock adapter) explicitly forbid
buy/sell/target/stoploss commands. This is asserted by a unit test in
`apps/api/src/services/ai/__tests__/grounding-pipeline.test.ts`.

Every analysis carries the shared non-removable disclaimer (see AI_ENGINE.md),
rendered by `DisclaimerBanner` in the UI.

## Endpoint

`GET /portfolio/analysis` (auth required, rate-limited 5/min/user). Returns
`422` when the portfolio is empty. See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#get-portfolioanalysis).

## Files

**Backend**
- `apps/api/src/lib/portfolio-risk.ts` — deterministic scoring (+ tests)
- `apps/api/src/services/ai/types.ts` — `PortfolioAnalysisResponse` schema + provider method
- `apps/api/src/services/ai/{mock-ai-adapter,nvidia-nim-adapter}.ts` — `generatePortfolioAnalysis`
- `apps/api/src/services/ai/grounding-pipeline.ts` — `runPortfolioAnalysisPipeline`
- `apps/api/src/routes/portfolio.ts` — `GET /portfolio/analysis`

**Frontend**
- `apps/web/src/hooks/usePortfolio.ts` — `usePortfolioAnalysis`
- `apps/web/src/components/portfolio/PortfolioAIPanel.tsx` — scores, sector bars, per-holding notes
- `apps/web/src/pages/PortfolioPage.tsx` — "Analyze portfolio" action

## What is mocked vs. live

- **Scores & flags:** live/deterministic — computed from the user's real holdings.
- **Narrative:** live when `NIM_MODE` is set (NVIDIA NIM); otherwise the deterministic
  `MockAIAdapter` produces scenario-framed text with no external call.
- **Sectors:** from the market-data provider. The mock adapter maps common NSE
  symbols to real sectors so diversification is demonstrable without a live key.
