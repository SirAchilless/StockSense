# Option Chain Intelligence — Phase 3.1

StockSense Phase 3.1 introduces a full **option chain intelligence** layer for Indian equity
markets (NSE). It follows the same **anti-hallucination grounding principle** established in
Phases 1–2: all numeric metrics (Greeks, PCR, max pain, IV percentile) are computed
deterministically server-side and the AI **only narrates** over those grounded numbers.

---

## Architecture

```
GET /options/chain/:symbol            ← data layer only (no AI)
GET /options/analysis/:symbol         ← data + AI interpretation
GET /options/expiries/:symbol         ← available expiry dates
GET /options/symbols                  ← supported symbols list
```

### Data layer (`services/options/`)

| File | Purpose |
|---|---|
| `types.ts` | `OptionLeg`, `OptionStrikeRow`, `OptionChain`, `OptionChainProvider` interface, symbol/lot-size registries, zod schema for AI response |
| `mock-options-adapter.ts` | Fully self-contained mock — realistic NSE-style data from Black-Scholes + IV skew + deterministic OI distribution |
| `nse-options-adapter.ts` | Real NSE adapter — fetches live data from NSE's public API; requires session cookie management |
| `index.ts` | Lazy singleton factory; selects adapter via `OPTIONS_PROVIDER` env var (`mock` | `nse`; defaults to `mock`) |

### Deterministic computation (`lib/options-greeks.ts`)

All numeric option metrics are computed here — **never by the AI**:

| Function | What it computes |
|---|---|
| `blackScholes()` | Option price, delta, gamma, theta, vega using Black-Scholes (1973) |
| `impliedVolatility()` | Newton-Raphson IV solver recovering σ from a market price |
| `computeMaxPain()` | Strike that minimises total option payout to buyers |
| `computePCR()` | Put-call ratio (OI or volume) |
| `computeIVPercentile()` | Rank of current ATM IV within 52-week range |
| `findATMStrike()` | Nearest exchange-standard strike to current spot |
| `strikeInterval()` | Strike spacing by symbol (NIFTY=50, BANKNIFTY=100, stocks=20) |

### AI layer (grounding pipeline)

`runOptionChainPipeline` in `services/ai/grounding-pipeline.ts`:

1. Fetches the option chain (data layer).
2. Derives `topCallStrikes` and `topPutStrikes` by OI (deterministic — not AI-inferred).
3. Injects only the pre-computed metrics into the AI prompt (PCR, max pain, IV percentile, top OI levels).
4. AI generates **scenario-framed** commentary — it references the numbers but never emits them.
5. Schema validates the AI response (zod) with one retry.

Prompt rules enforced on the AI:
- Never invent OI values, price levels, or PCR ratios.
- Frame all commentary as "if X, then Y may follow" — no directives.
- Reference PCR / max pain as given, never re-derive.

---

## Supported symbols

**Index options** (weekly expiry, up to 8 expiries):
`NIFTY`, `BANKNIFTY`, `FINNIFTY`, `MIDCPNIFTY`

**Stock options** (up to 4 expiries):
`RELIANCE`, `TCS`, `HDFCBANK`, `INFY`, `ICICIBANK`, `SBIN`, `WIPRO`, `LT`,
`AXISBANK`, `KOTAKBANK`, `BAJFINANCE`, `MARUTI`, `TATAMOTORS`, `SUNPHARMA`, `HINDUNILVR`

---

## API Reference

### `GET /options/symbols`

Returns all supported symbols.

```json
{ "data": { "symbols": ["NIFTY", "BANKNIFTY", ...] } }
```

### `GET /options/expiries/:symbol`

```json
{ "data": { "symbol": "NIFTY", "expiries": ["2026-07-31", "2026-08-07", ...] } }
```

### `GET /options/chain/:symbol?expiry=YYYY-MM-DD`

Returns the full option chain for one symbol + expiry (no AI). When `expiry` is omitted
the nearest weekly expiry is used.

```jsonc
{
  "data": {
    "symbol": "NIFTY",
    "underlyingPrice": 22453.30,
    "atmStrike": 22450,
    "expiry": "2026-07-31",
    "daysToExpiry": 3,
    "availableExpiries": ["2026-07-31", ...],
    "lotSize": 50,
    "strikes": [
      {
        "strikePrice": 21850,
        "isATM": false,
        "call": {
          "ltp": 617.45, "change": 12.30, "changePercent": 2.03,
          "bid": 614.37, "ask": 620.53,
          "iv": 14.82, "oi": 12400, "oiChange": 820, "volume": 3720,
          "delta": 0.9312, "gamma": 0.000041, "theta": -3.21, "vega": 1.84
        },
        "put": { ... }
      },
      ...
    ],
    "totalCallOI": 1284500,
    "totalPutOI": 1621300,
    "pcrOI": 1.2625,
    "pcrVolume": 1.1403,
    "maxPainStrike": 22300,
    "ivPercentile": 42,
    "dataAsOf": "2026-07-28T14:12:00.000Z"
  }
}
```

### `GET /options/analysis/:symbol?expiry=YYYY-MM-DD`

Returns option chain + AI interpretation. Rate-limited to 10 req/min.

```jsonc
{
  "data": {
    "chain": { /* same as /chain */ },
    "interpretation": {
      "marketBiasNote": "The PCR OI for NIFTY stands at 1.26 ...",
      "maxPainNote": "Max pain is computed at 22,300 ...",
      "ivNote": "IV percentile is at 42, indicating moderate pricing ...",
      "keyLevelNotes": [
        { "strikePrice": 22500, "note": "22,500 CE has the highest call OI ..." },
        { "strikePrice": 22000, "note": "22,000 PE has the highest put OI ..." }
      ],
      "confidence": 0.72,
      "dataAvailable": true
    },
    "disclaimer": "AI-generated research for informational purposes only. ..."
  }
}
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OPTIONS_PROVIDER` | `mock` | `mock` uses the built-in fixture adapter; `nse` uses the live NSE API |

---

## Frontend

Route: `/options`

| Component | Description |
|---|---|
| `OptionsPage` | Symbol/expiry selector, tab switcher (Chain / OI / Max Pain), AI panel toggle |
| `OptionChainTable` | Full call-strike-put table; ITM cells highlighted; all Greeks visible |
| `GreeksPanel` | Summary stats: PCR, max pain, IV percentile, DTE; ATM Greeks tiles |
| `OIChart` | Grouped bar chart of call/put OI per strike (±8 from ATM) |
| `MaxPainChart` | Pain curve across all strikes; max-pain and ATM reference lines |
| `OptionAIPanel` | AI interpretation rendered in sections with confidence badge + disclaimer |

---

## Tests

New test files: **37 tests** across 2 files.

| File | Tests |
|---|---|
| `lib/__tests__/options-greeks.test.ts` | Black-Scholes correctness (put-call parity, Greek signs, edge cases), IV recovery, max pain, PCR, IV percentile, ATM strike, strike interval |
| `services/options/__tests__/mock-options-adapter.test.ts` | Supported symbols, expiry count/format/Thursday rule, chain structure, Greeks bounds, lot sizes, expiry selection |

All pass with the existing Vitest runner (`pnpm test` from repo root).

---

## Known limitations / Phase 3 compliance note

Phase 3 is marked **compliance-gated** in ROADMAP.md. This delivery is the data + AI
interpretation layer only. The following remain out of scope until a formal compliance review:

- No position P&L or margin calculator (regulated activity in some jurisdictions).
- No strategy builder, scanner, or screener with actionable signals.
- No automated alerts tied to specific option conditions.
- No AI-generated "best strategy" recommendations — all commentary is scenario-framed.

The NSE adapter (`nse-options-adapter.ts`) is provided for operators running StockSense
in environments where live NSE data is permissible; the default `mock` adapter is fully
functional for development and demo purposes.
