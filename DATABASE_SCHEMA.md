# Database Schema — Phase 1

PostgreSQL via Prisma. This covers persisted data only — live prices are **not** stored as source of truth (see ARCHITECTURE.md); only short-TTL caches and research snapshots are persisted.

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  googleId      String?   @unique
  name          String
  createdAt     DateTime  @default(now())
  refreshTokens RefreshToken[]
  holdings      Holding[]
  chatThreads   ChatThread[]
  watchlists    Watchlist[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Holding {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  symbol    String
  quantity  Decimal
  buyPrice  Decimal
  buyDate   DateTime
  source    HoldingSource @default(MANUAL)
  createdAt DateTime @default(now())

  @@index([userId, symbol])
}

enum HoldingSource {
  MANUAL
  CSV_IMPORT
  EXCEL_IMPORT
}

model ResearchSnapshot {
  id             String   @id @default(cuid())
  symbol         String
  businessSummary String  @db.Text
  ratios         Json
  bullCase       String   @db.Text
  bearCase       String   @db.Text
  confidence     Float
  dataAsOf       DateTime
  createdAt      DateTime @default(now())

  @@index([symbol, createdAt])
}

model ChatThread {
  id        String       @id @default(cuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id])
  messages  ChatMessage[]
  createdAt DateTime     @default(now())
}

model ChatMessage {
  id        String     @id @default(cuid())
  threadId  String
  thread    ChatThread @relation(fields: [threadId], references: [id])
  role      MessageRole
  content   String     @db.Text
  createdAt DateTime   @default(now())
}

enum MessageRole {
  USER
  ASSISTANT
}

model Watchlist {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  symbols   String[]
  createdAt DateTime @default(now())
}
```

## Notes

- `ResearchSnapshot` acts as a short-TTL cache (recommended: 15–30 min during market hours) to reduce AI-provider calls for repeated symbol lookups — always re-validate `dataAsOf` against current market status before serving a cached snapshot as current
- `Holding.source` matters for portfolio UI (Phase 1 supports `MANUAL`/`CSV_IMPORT`/`EXCEL_IMPORT` only; Phase 3 broker OAuth adds source values per broker)
- No table stores live index/stock ticks — those are ephemeral, served through the `MarketDataProvider` and cached in-memory/Redis if needed for fan-out, not in Postgres
