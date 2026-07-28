# Architecture

## High-Level Overview

```
┌─────────────────────┐      ┌──────────────────────┐      ┌────────────────────┐
│   React Web Client   │◄────►│   Express API Layer   │◄────►│    PostgreSQL DB    │
│ (Vite, TS, Tailwind) │ HTTP │  (TS, JWT, Prisma)    │  SQL │     (Prisma)        │
└─────────────────────┘      └──────────┬───────────┘      └────────────────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
          ┌────────────────────┐ ┌──────────────────┐ ┌──────────────────┐
          │ Market Data Provider│ │  NVIDIA NIM       │ │  Fundamentals /   │
          │ (pluggable adapter) │ │  (cloud API or    │ │  News Sources     │
          │                    │ │  local container)  │ │                  │
          └────────────────────┘ └──────────────────┘ └──────────────────┘
```

## Layers

### 1. Client (React)
- Route-based code splitting (`/dashboard`, `/portfolio`, `/research/:symbol`, `/chat`)
- Server state via TanStack Query (prices, portfolio, research results) — cached, revalidated on interval for live data
- Redux Toolkit reserved for genuinely cross-cutting client state (theme, auth session, chat thread state) — not a duplicate cache of server data
- WebSocket (or polling fallback) client for live index/price ticks

### 2. API (Express)
- Layered: `routes → controllers → services → data-access`
- `services/market-data/` — the only layer allowed to call external market-data providers, behind a shared `MarketDataProvider` interface (see SYSTEM_DESIGN.md)
- `services/ai/` — the only layer allowed to call the AI provider (NVIDIA NIM, cloud or local), behind a shared `AIProvider` interface, always invoked through the grounding pipeline (see AI_ENGINE.md)
- All external calls (market data, AI, news) go through this layer — the client never calls a third-party API directly

### 3. Database (PostgreSQL via Prisma)
- Source of truth for: users, portfolios, holdings, watchlists, alerts, cached research snapshots
- **Not** the source of truth for live prices — those are fetched live/near-live and cached briefly (see DATABASE_SCHEMA.md for what is and isn't persisted)

### 4. External Providers
- Market data, AI, and news are all accessed through adapter interfaces so the underlying vendor can change without touching business logic (critical given data-licensing constraints — see main spec §2)

## Data Flow Example: Stock Research Request

1. Client requests `/api/research/:symbol`
2. Controller validates symbol, checks cache (DB) for a recent snapshot
3. If stale/missing: service layer fetches live quote + fundamentals + recent news from provider adapters
4. Fetched data is validated (no missing required fields silently defaulted)
5. Validated data is injected into a structured AI prompt (grounding pipeline)
6. AI response is parsed against a strict schema (business summary, ratios, bull/bear case, confidence, `dataAsOf`)
7. Response cached with short TTL, returned to client with disclaimer flag

## Why this shape

The original flat feature list implied direct client → third-party calls for market data and brokers. Centralizing all external I/O in the API layer is what makes the market-data-provider swap (§2 of the main spec) and the anti-hallucination grounding pipeline actually enforceable — both would be nearly impossible to guarantee if the client called vendors directly.
