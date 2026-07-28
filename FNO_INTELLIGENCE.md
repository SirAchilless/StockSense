# F&O Intelligence — Phase 3.2

StockSense Phase 3.2 adds a **Futures & Options intelligence** layer covering
rollovers, cost of carry, FII/DII derivatives positioning, and participant-wise
open interest. All numeric metrics are computed deterministically server-side;
the AI only narrates over those grounded values.

---

## Architecture

```
GET /fno/symbols                  ← supported F&O symbols
GET /fno/rollover/:symbol         ← rollover + CoC data (no AI)
GET /fno/fii-positions            ← FII/DII derivative positioning (no AI)
GET /fno/participant-oi           ← participant-wise OI snapshot (no AI)
GET /fno/analysis/:symbol         ← full intelligence + AI interpretation
```

### Data layer (`services/fno/`)

| File | Purpose |
|---|---|
| `types.ts` | `FuturesOI`, `RolloverData`, `FiiDerPositionSummary`, `FiiDerPositionDay`, `ParticipantOIData`, `FnoDataProvider` interface, symbol registry, zod schema for AI response |
| `mock-fno-adapter.ts` | Fully self-contained mock — realistic NSE-style rollover %, CoC, FII/DII 10-day series, 4-participant OI snapshot |
| `nse-fno-adapter.ts` | Live NSE adapter — fetches from `/api/quote-derivative`, `/api/fiiDiiData`, `/api/participant-oi` via session cookies |
| `index.ts` | Lazy singleton factory; selects adapter via `FNO_PROVIDER` env var (`mock` | `nse`; defaults to `mock`) |

### Deterministic computation (`lib/fno-analytics.ts`)

All numeric F&O metrics are computed here — **never by the AI**:

| Function | What it computes |
|---|---|
| `computeRolloverMetrics()` | Rollover %, total futures OI, rollover vs 3M average diff |
| `computeCostOfCarry()` | Annualised CoC = (fut - spot) / spot × (365 / dte) × 100 |
| `computeFiiDerSummary()` | 5-day rolling sums, latest OI snapshot, FII index options PCR |
| `computeParticipantMetrics()` | FII long/short ratio, net long %, CLIENT vs FII contra signal |

### AI layer (grounding pipeline)

`runFnoPipeline` in `services/ai/grounding-pipeline.ts`:

1. Fetches rollover, FII/DII positions, and participant OI concurrently.
2. Derives participant metrics deterministically (`computeParticipantMetrics`).
3. Builds a compact grounded payload (aggregated figures only — no raw series).
4. AI generates **scenario-framed** commentary (5 sections) — references the numbers, never emits them.
5. Schema validated (zod) with one retry.

AI prompt rules enforced:
- Never recompute, invent, or override pre-computed metrics.
- All commentary scenario-framed ("if X, then Y may follow").
- No directives: no buy/sell/enter/exit/target/stoploss language.

---

## Supported symbols

**Index F&O** (4):
`NIFTY`, `BANKNIFTY`, `FINNIFTY`, `MIDCPNIFTY`

**Stock F&O** (15):
`RELIANCE`, `TCS`, `HDFCBANK`, `INFY`, `ICICIBANK`, `SBIN`, `WIPRO`, `LT`,
`AXISBANK`, `KOTAKBANK`, `BAJFINANCE`, `MARUTI`, `TATAMOTORS`, `SUNPHARMA`, `HINDUNILVR`

---

## API Reference

### `GET /fno/symbols`
```json
{ "data": { "symbols": ["NIFTY", "BANKNIFTY", ...] } }
```

### `GET /fno/rollover/:symbol`
```jsonc
{
  "data": {
    "symbol": "NIFTY",
    "spotPrice": 22453.30,
    "currentExpiry": "2026-07-31",
    "nextExpiry": "2026-08-28",
    "daysToCurrentExpiry": 3,
    "currentMonthOI": 540000,
    "nextMonthOI": 1260000,
    "totalFuturesOI": 1800000,
    "rolloverPercent": 70.0,
    "costOfCarryCurrent": 4.34,
    "costOfCarryNext": 4.97,
    "threeMonthAvgRollover": 67.4,
    "rolloverVsAvgDiff": 2.6,
    "allExpiries": [ /* FuturesOI array */ ],
    "dataAsOf": "2026-07-28T14:30:00.000Z"
  }
}
```

### `GET /fno/fii-positions`
```jsonc
{
  "data": {
    "series": [ /* FiiDerPositionDay × 10 sessions */ ],
    "latestDate": "2026-07-28",
    "fiiNetFuturesBuy5d": 21200,
    "fiiNetOptionsBuy5d": 4850,
    "diiNetFuturesBuy5d": 5400,
    "latestFiiIndexFutNetOI": 40000,
    "latestFiiStockFutNetOI": 40000,
    "latestFiiIndexPCR": 1.1667,
    "dataAsOf": "2026-07-28T14:30:00.000Z"
  }
}
```

### `GET /fno/participant-oi`
```jsonc
{
  "data": {
    "rows": [
      { "category": "FII", "indexFutLong": 284000, "indexFutShort": 238000, "indexFutNetLong": 46000, ... },
      { "category": "DII", ... },
      { "category": "PRO", ... },
      { "category": "CLIENT", ... }
    ],
    "date": "2026-07-28",
    "dataAsOf": "2026-07-28T14:30:00.000Z"
  }
}
```

### `GET /fno/analysis/:symbol`
Full intelligence + AI interpretation. Rate-limited to 10 req/min.
```jsonc
{
  "data": {
    "rollover": { /* RolloverData */ },
    "fiiPositions": { /* FiiDerPositionSummary */ },
    "participantOI": { /* ParticipantOIData */ },
    "interpretation": {
      "rolloverNote": "NIFTY futures rollover stands at 70.0% ...",
      "fiiPositioningNote": "FII index futures positioning is net long ...",
      "diiPositioningNote": "DIIs were net buyers in index futures ...",
      "costOfCarryNote": "Current-month futures cost of carry is 4.34% annualised ...",
      "overallNote": "Taken together: rollover is above average with FIIs net long ...",
      "confidence": 0.71,
      "dataAvailable": true
    },
    "disclaimer": "AI-generated research for informational purposes only. ...",
    "dataAsOf": "2026-07-28T14:30:00.000Z"
  }
}
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `FNO_PROVIDER` | `mock` | `mock` uses built-in fixture adapter; `nse` uses live NSE API |

---

## Frontend

Route: `/fno`

| Component | Description |
|---|---|
| `FnoPage` | Symbol selector, 3-tab view, AI panel toggle |
| `RolloverPanel` | Summary tiles (rollover %, vs avg, CoC, DTE); OI by expiry bar chart; CoC bar chart; detailed expiry table |
| `FiiDiiDerPanel` | Net buy/sell 5d summary tiles; daily net buy/sell grouped bar chart (7 sessions) |
| `ParticipantOITable` | Index futures, stock futures, index options OI tables with PCR per participant |
| `FnoAIPanel` | 5-section AI interpretation with confidence badge and disclaimer |

---

## Tests

New test files: **44 tests** across 2 files.

| File | Tests |
|---|---|
| `lib/__tests__/fno-analytics.test.ts` | computeCostOfCarry (5), computeRolloverMetrics (6), computeFiiDerSummary (6), computeParticipantMetrics (6) |
| `services/fno/__tests__/mock-fno-adapter.test.ts` | Supported symbols, rollover shape/bounds, FII positions, participant OI categories/invariants |

All pass with the existing Vitest runner.

---

## Phase 3 compliance note

Phase 3 is compliance-gated in ROADMAP.md. This delivery is the **data + interpretation layer** only:
- No position sizing, margin calculator, or P&L projections.
- No "best rollover strategy" recommendations — all commentary is scenario-framed.
- No automated alerts on rollover thresholds or FII OI crossings.
- The NSE adapter is available for operators where live data is permissible; the mock default is complete for development.
