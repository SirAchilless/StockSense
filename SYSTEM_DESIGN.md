# System Design

## Repository Structure

```
ai-stock-intelligence-platform/
├── apps/
│   ├── web/                       # React frontend
│   │   ├── src/
│   │   │   ├── pages/              # Dashboard, Portfolio, Research, Chat
│   │   │   ├── components/         # Reusable UI (cards, charts, tables)
│   │   │   ├── layouts/            # App shell, auth layout
│   │   │   ├── hooks/               # useLivePrices, usePortfolio, useResearch
│   │   │   ├── contexts/            # ThemeContext, AuthContext
│   │   │   ├── store/                # Redux slices (auth, theme, chat)
│   │   │   ├── services/            # API client (typed fetch wrappers)
│   │   │   ├── types/                # Shared TS types (mirrors API DTOs)
│   │   │   └── utils/
│   │   └── vite.config.ts
│   └── api/                        # Express backend
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   │   ├── market-data/     # MarketDataProvider interface + adapters
│       │   │   ├── ai/              # AIProvider interface + grounding pipeline
│       │   │   ├── portfolio/
│       │   │   └── auth/
│       │   ├── middleware/          # auth, rate-limit, validation, error-handler
│       │   ├── prisma/              # schema.prisma, migrations
│       │   └── types/
│       └── tsconfig.json
├── packages/
│   └── shared-types/                # DTOs shared between web and api
├── docker-compose.yml
└── docs/                            # this documentation set
```

## Key Abstractions

### `MarketDataProvider` interface
```ts
interface MarketDataProvider {
  getIndexQuote(symbol: IndexSymbol): Promise<IndexQuote>;
  getStockQuote(symbol: string): Promise<StockQuote>;
  getFundamentals(symbol: string): Promise<Fundamentals>;
  getMarketStatus(): Promise<MarketStatus>;
}
```
Concrete adapters (e.g. `NseDelayedFeedAdapter`, `PaidVendorAdapter`) implement this. Swapping data sources means writing one new adapter — no controller/component changes required.

### `AIProvider` interface
```ts
interface AIProvider {
  generate(request: GroundedPromptRequest): Promise<StructuredAIResponse>;
}
```
The primary implementation, `NvidiaNimAdapter`, wraps NVIDIA NIM's OpenAI-compatible chat-completions API — configurable to point at either NVIDIA's hosted cloud endpoint or a locally-run NIM container, differing only in `baseUrl` and auth header (see ENVIRONMENT_SETUP.md). The interface stays provider-agnostic so an additional provider could be added later without touching the grounding pipeline (AI_ENGINE.md).

## Module Boundaries (Phase 1)

| Module | Owns | Does not own |
|---|---|---|
| Dashboard | Index quotes, market status display | Portfolio data, AI research |
| Portfolio | Holdings, P&L calculation, CSV/Excel parsing | Live index quotes |
| Research | AI-grounded stock summaries | Portfolio-specific recommendations |
| Chat | Conversational Q&A over already-fetched session data | New unfetched data — chat must call the same services layer, never bypass grounding |
| Auth | JWT issuance/rotation, Google OAuth | Any business data |

## State Management Rule

Server-derived data (prices, portfolio, research) lives in TanStack Query cache, not Redux. Redux holds only client-only state (theme, active chat thread, UI flags). This avoids the common bug of two sources of truth for the same server data.
