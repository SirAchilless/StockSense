# Deployment

## Topology

- **Frontend (`apps/web`):** deployed to Vercel — static build + edge caching, environment variables set in Vercel project settings
- **Backend (`apps/api`):** containerized (Docker), deployed to AWS (ECS Fargate or equivalent), behind NGINX/ALB
- **Database:** AWS RDS PostgreSQL, private subnet, not publicly accessible
- **AI (NVIDIA NIM):**
  - *Cloud mode* — no extra infra; `apps/api` calls NVIDIA's hosted endpoint directly, only an API key to manage
  - *Local mode* — requires a GPU-backed host (e.g. an EC2 `g5`/`g6` instance or on-prem GPU box) running the NIM container; `apps/api` calls it over the private network rather than the public internet. This is a materially different (and costlier) deployment shape than cloud mode — decide per-environment (e.g. local GPU box for development, cloud API for production) rather than assuming one mode everywhere.
- **CI/CD:** GitHub Actions — lint/test/build on PR, deploy on merge to `main`

## Docker

`apps/api/Dockerfile` (multi-stage):
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

`docker-compose.yml` (local dev):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: stockplatform
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

## NGINX (reverse proxy in front of API)

```nginx
server {
  listen 443 ssl;
  server_name api.yourapp.com;

  location / {
    proxy_pass http://api:4000;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Host $host;
  }

  # rate limiting handled at app layer, this is TLS termination + routing
}
```

## GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build and push image
        run: |
          docker build -t $ECR_REPO:$GITHUB_SHA -f apps/api/Dockerfile .
          # push to ECR, trigger ECS deployment
  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: npx vercel --prod --token=$VERCEL_TOKEN
```

## Pre-Launch Checklist

- [ ] Database migrations applied to production before traffic cutover
- [ ] Environment secrets set in production (not copied from `.env.example`)
- [ ] Market data provider confirmed licensed for production use, not a dev/sandbox key
- [ ] `NIM_MODE` confirmed correct for the target environment (cloud key valid and rate-limit-appropriate, or local GPU host healthy and reachable)
- [ ] Disclaimer copy reviewed (see AI_ENGINE.md)
- [ ] Rate limits enabled on all public endpoints
- [ ] Rollback plan for API deployment (previous ECS task definition retained)
