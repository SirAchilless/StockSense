# Features — Phase 1 (MVP)

Full multi-phase feature list lives in [ROADMAP.md](./ROADMAP.md). This document details only what Phase 1 ships.

## 1. Dashboard

- Live tiles for NIFTY 50, BANK NIFTY, SENSEX, India VIX
- Per-tile: current price, change, change %, day high/low, last-updated timestamp
- Market status banner: open / closed, and if closed, countdown to next open + previous close
- Data refresh: polling or WebSocket tick, sourced entirely through `MarketDataProvider`

## 2. Authentication

- Email/password with JWT (access token short-lived, refresh token rotated + stored httpOnly)
- Google OAuth login
- Session persists across reload via refresh flow (see AUTHENTICATION.md)

## 3. Portfolio

- Manual holding entry (symbol, quantity, buy price, buy date)
- CSV/Excel upload — generic contract-note-shaped import (works across brokers without OAuth)
- Computed: total investment, current value, realized/unrealized P&L, daily change
- Sector allocation chart (Recharts pie/treemap)

## 4. AI Stock Research

- Search any NSE symbol (e.g. RELIANCE, TCS, INFY, SBIN)
- Output (all grounded in fetched data, never free-generated):
  - Business summary
  - Key ratios: PE, PB, ROE, ROCE, EPS, Debt/Equity
  - Latest quarterly/annual results
  - Bull case / bear case
  - Confidence score + `dataAsOf` timestamp
  - Non-removable disclaimer footer
- If required data isn't available from the provider, the response says so explicitly rather than estimating

## 5. Technical Analysis (Basic)

- Candlestick chart via TradingView widget
- Overlays: SMA, EMA, RSI, MACD
- Timeframe switcher (1D, 1W, 1M, 1Y)

## 6. AI Chat

- Chat scoped to the current session's already-fetched data (a viewed stock, the user's own portfolio)
- Cannot answer with net-new market data it hasn't fetched through the services layer — it will trigger a fetch first, not invent an answer
- Every recommendation-shaped reply carries the same disclaimer as Research

## Explicitly Out of Scope for Phase 1

(See ROADMAP.md for when these land)
- Global markets monitor, market breadth, sector heatmaps
- Option chain / F&O intelligence
- Multi-horizon price prediction engine
- Broker OAuth import (Zerodha/Upstox/AngelOne/ICICI/Groww)
- Alerts (price/stoploss/news)
- Full technical indicator suite (Ichimoku, SuperTrend, Fibonacci, volume profile, pattern recognition)
