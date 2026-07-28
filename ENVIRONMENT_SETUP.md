# Environment Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- PostgreSQL 16 (via Docker, or local install)

## `apps/api/.env`

```bash
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/stockplatform"

# Auth
JWT_ACCESS_SECRET=""
JWT_REFRESH_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Market Data Provider (Phase 1: choose one adapter)
MARKET_DATA_PROVIDER="nse_delayed"   # or "paid_vendor"
MARKET_DATA_API_KEY=""

# AI — NVIDIA NIM
NIM_MODE="cloud"                          # "cloud" or "local"

# Cloud mode (NIM_MODE=cloud)
NIM_API_KEY=""                            # from https://build.nvidia.com
NIM_BASE_URL="https://integrate.api.nvidia.com/v1"
NIM_MODEL="meta/llama-3.1-70b-instruct"   # or your chosen hosted model

# Local mode (NIM_MODE=local) — used instead of the two vars above when active
NIM_LOCAL_BASE_URL="http://localhost:8000/v1"
NIM_LOCAL_MODEL="meta/llama-3.1-8b-instruct"   # match whatever model the local container is serving

# Rate limiting / caching (optional, Phase 1 can run without Redis)
REDIS_URL=""
```

## `apps/web/.env`

```bash
VITE_API_BASE_URL="http://localhost:4000/api/v1"
VITE_GOOGLE_CLIENT_ID=""
```

## Local Setup Steps

```bash
pnpm install
docker compose up -d postgres
pnpm --filter api prisma migrate dev --name init
pnpm --filter api prisma generate
pnpm dev   # runs web + api concurrently via turborepo/pnpm workspaces
```

## Running NVIDIA NIM Locally (optional)

Requires a CUDA-compatible NVIDIA GPU with sufficient VRAM for the chosen model, the NVIDIA Container Toolkit installed, and an NGC API key to pull the container image (a one-time step even for local/offline inference).

```bash
docker run --gpus all --rm -it \
  --name nim-local \
  -e NGC_API_KEY="$NGC_API_KEY" \
  -p 8000:8000 \
  nvcr.io/nim/meta/llama-3.1-8b-instruct:latest
```

Once running, set `NIM_MODE=local` and point `NIM_LOCAL_BASE_URL` at `http://localhost:8000/v1`. Confirm it's ready with:

```bash
curl http://localhost:8000/v1/health
```

Note first-run cold start can take several minutes while the model loads.

## Secrets Handling

- Never commit `.env` files — `.env.example` files (no real values) are the only ones checked in
- In CI/CD, secrets are injected via GitHub Actions secrets / AWS Secrets Manager, never hardcoded in workflow files
- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` independently; rotating the refresh secret invalidates all sessions, so plan for a maintenance window
