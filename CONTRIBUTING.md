# Contributing

## Branching

- `main` — always deployable
- `feature/<short-description>` — one feature/fix per branch
- PRs require: passing CI, at least one review, no drop in coverage on `services/portfolio` or `services/ai`

## Commit Style

Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Code Standards

- TypeScript strict mode everywhere — no `any` without a `// TODO` justification comment
- Follow the module boundaries in SYSTEM_DESIGN.md: the client never calls a third-party API directly; the AI/market-data provider interfaces are the only integration points
- New AI-facing features must go through the grounding pipeline (AI_ENGINE.md) — no exceptions for "just a quick feature"
- New endpoints require: a zod validation schema, a corresponding entry in API_DOCUMENTATION.md, and tests

## Before Opening a PR

1. `pnpm lint && pnpm test && pnpm build` all pass locally
2. Update relevant docs in `/docs` if behavior, schema, or endpoints changed
3. If the PR touches a recommendation-shaped AI output, confirm the disclaimer is still attached and rendered

## Adding a New Market Data or AI Provider

1. Implement the `MarketDataProvider` or `AIProvider` interface (see SYSTEM_DESIGN.md) in `services/market-data/` or `services/ai/`
2. Add config toggle in `.env` (see ENVIRONMENT_SETUP.md)
3. Add adapter-level tests before wiring into any route
4. Do not modify controllers/components to special-case the new provider — if you need to, the interface is leaking and should be revisited
