# API Documentation — Phase 1

Base URL: `/api/v1`
Auth: Bearer JWT in `Authorization` header unless noted public.

## Auth

### `POST /auth/register`
Body: `{ email, password, name }` → `201` `{ user, accessToken }` (refresh token set as httpOnly cookie)

### `POST /auth/login`
Body: `{ email, password }` → `200` `{ user, accessToken }`

### `POST /auth/google`
Body: `{ idToken }` (Google credential) → `200` `{ user, accessToken }`

### `POST /auth/refresh`
Cookie: refresh token → `200` `{ accessToken }`

### `POST /auth/logout`
→ `204`, clears refresh cookie

## Market Data

### `GET /market/indices`
Public. → `200`
```json
{
  "indices": [
    { "symbol": "NIFTY50", "price": 24812.35, "change": 112.4, "changePercent": 0.46,
      "dayHigh": 24855.0, "dayLow": 24690.1, "lastUpdated": "2026-07-28T09:31:00+05:30" }
  ],
  "marketStatus": { "isOpen": true, "previousClose": 24699.95, "nextOpen": null }
}
```

### `GET /market/quote/:symbol`
→ `200` single stock quote (same shape as above, per-symbol)

## Portfolio

### `GET /portfolio`
→ `200` `{ holdings: Holding[], totalInvestment, currentValue, unrealizedPnl, realizedPnl, sectorAllocation }`

### `POST /portfolio/holdings`
Body: `{ symbol, quantity, buyPrice, buyDate }` → `201` created holding

### `POST /portfolio/import`
Multipart file upload (CSV/XLSX) → `200` `{ imported: number, skipped: number, errors: string[] }`

### `DELETE /portfolio/holdings/:id`
→ `204`

### `GET /portfolio/analysis`
AI portfolio intelligence (Phase 2.5). Scores are computed deterministically from
holdings + live P&L; the AI only narrates over them (scenario-framed, non-directive).
Rate-limited 5/min/user. Returns `422` when the portfolio is empty.
→ `200`
```json
{
  "summary": { "totalInvested": 250000, "currentValue": 268400, "totalPnL": 18400, "totalPnLPct": 7.36 },
  "metrics": {
    "riskScore": 42, "riskLevel": "moderate", "diversificationScore": 68,
    "concentrationHHI": 0.28, "sectorHHI": 0.31, "largestPositionPct": 34.2,
    "effectiveHoldings": 3.6, "holdingCount": 6, "sectorCount": 4,
    "holdings": [ { "symbol": "TCS", "sector": "Information Technology", "weightPct": 34.2, "unrealizedPnLPct": 15.1, "flag": "strong" } ],
    "sectorAllocation": [ { "sector": "Information Technology", "weightPct": 46.0 } ]
  },
  "analysis": {
    "overallAssessment": "...",
    "riskCommentary": "If Information Technology faces a broad drawdown, the portfolio may see an outsized impact...",
    "diversificationCommentary": "...",
    "holdingNotes": [ { "symbol": "TCS", "note": "..." } ],
    "confidence": 0.7,
    "dataAvailable": true
  },
  "disclaimer": "AI-generated research for informational purposes only...",
  "dataAsOf": "2026-07-28T13:10:00+05:30"
}
```

## Research

### `GET /research/:symbol`
→ `200`
```json
{
  "symbol": "TCS",
  "businessSummary": "...",
  "ratios": { "pe": 28.4, "pb": 12.1, "roe": 45.2, "roce": 58.9, "eps": 132.4, "debtToEquity": 0.02 },
  "bullCase": "...",
  "bearCase": "...",
  "confidence": 0.72,
  "dataAsOf": "2026-07-28T09:15:00+05:30",
  "disclaimer": "AI-generated, informational only, not investment advice."
}
```
Returns `422` with `{ missingFields: string[] }` if underlying data couldn't be fully fetched — the endpoint never fills gaps with estimates.

## Technical Analysis

### `GET /technical/:symbol?timeframe=1D|1W|1M|1Y`
→ `200` `{ ohlc: Candle[], indicators: { sma, ema, rsi, macd } }`

## Chat

### `POST /chat/message`
Body: `{ threadId?, message, context: { symbol?, portfolioScope? } }`
→ `200` `{ threadId, reply, disclaimer? }`
Server-side: if `message` requires data not already fetched for `context`, the service fetches it through the standard market-data/research pipeline before generating a reply — chat never bypasses grounding.

## Error Format (all endpoints)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

## Rate Limits (Phase 1 defaults)

| Endpoint group | Limit |
|---|---|
| `/auth/*` | 10 req/min/IP |
| `/market/*` | 60 req/min/user |
| `/research/*` | 20 req/min/user |
| `/chat/*` | 30 req/min/user |
