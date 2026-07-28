# AI Stock Intelligence Platform

AI-Powered Indian Market Research & Portfolio Intelligence.

> **Status:** Phase 1 (MVP) — see [ROADMAP.md](./ROADMAP.md) for what's built vs. planned.

## What this is

A web app for Indian equity investors that combines a live market dashboard, portfolio tracking, and AI-grounded stock research — designed with an Apple/Linear/Raycast-level visual bar, built on real (not hallucinated) market data.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS, shadcn/ui, Framer Motion, TanStack Query, Redux Toolkit, React Router, Recharts, TradingView widget, TanStack Table |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | JWT (access + refresh rotation), Google OAuth |
| AI | NVIDIA NIM — hosted cloud API or self-hosted local container, behind a provider-agnostic client interface |
| Infra | Docker, NGINX, GitHub Actions, Vercel (frontend), AWS (backend) |

## Quick Start

```bash
# clone and install
git clone <repo-url>
cd ai-stock-intelligence-platform
pnpm install

# set up environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# fill in values — see ENVIRONMENT_SETUP.md
# (NVIDIA NIM: set NIM_MODE to "cloud" with an API key, or "local" if running NIM in Docker on your own GPU)

# start database
docker compose up -d postgres

# run migrations
pnpm --filter api prisma migrate dev

# start dev servers (web + api concurrently)
pnpm dev
```

Frontend runs at `http://localhost:5173`, API at `http://localhost:4000`.

## Documentation Index

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system layers and data flow
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) — module boundaries, provider abstraction
- [FEATURES.md](./FEATURES.md) — Phase 1 feature detail
- [ROADMAP.md](./ROADMAP.md) — phase breakdown
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — REST endpoints
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Prisma schema
- [AI_ENGINE.md](./AI_ENGINE.md) — grounding pipeline, prompt design
- [AUTHENTICATION.md](./AUTHENTICATION.md) — JWT + Google OAuth flow
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) — env vars, local setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Docker, Vercel, AWS
- [SECURITY.md](./SECURITY.md) — security practices
- [TESTING.md](./TESTING.md) — test strategy
- [CONTRIBUTING.md](./CONTRIBUTING.md) — contribution workflow

## Important Disclaimer

This platform generates AI-assisted research and is **not** a registered investment advisory service. All AI-generated content (targets, stoplosses, ratings) is informational only. See [AI_ENGINE.md](./AI_ENGINE.md#disclaimers) for how this is enforced in the UI.
