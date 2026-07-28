# Testing Strategy

## Priorities (in order)

1. **Financial calculations** — P&L (realized/unrealized), sector allocation percentages, ratio calculations. These are non-negotiable: a bug here produces a wrong number a user might act on financially.
2. **AI grounding pipeline** — tests that assert the pipeline never passes ungrounded/missing data into a prompt as if it were real, and that malformed AI responses are rejected rather than surfaced.
3. **Auth flows** — token issuance, rotation, expiry, revocation.
4. **API contract** — request/response shape for every endpoint in API_DOCUMENTATION.md.

## Tooling

- Unit/integration: Vitest (shared across `apps/web` and `apps/api`)
- API integration tests: Supertest against a test database (Dockerized Postgres, migrated fresh per test run)
- Frontend component tests: React Testing Library
- E2E (Phase 2+): Playwright, covering the critical path (login → view dashboard → add holding → view research)

## Example: Portfolio P&L Unit Test

```ts
describe("calculateUnrealizedPnl", () => {
  it("computes correctly for a simple long position", () => {
    const holding = { quantity: 10, buyPrice: 100, currentPrice: 120 };
    expect(calculateUnrealizedPnl(holding)).toBe(200);
  });

  it("handles fractional quantities", () => {
    const holding = { quantity: 2.5, buyPrice: 1000, currentPrice: 950 };
    expect(calculateUnrealizedPnl(holding)).toBeCloseTo(-125);
  });
});
```

## Example: Grounding Pipeline Test

```ts
describe("research grounding pipeline", () => {
  it("returns 422 with missingFields when fundamentals fetch fails", async () => {
    mockMarketDataProvider.getFundamentals.mockRejectedValue(new Error("unavailable"));
    const res = await request(app).get("/api/v1/research/TCS").set(authHeader);
    expect(res.status).toBe(422);
    expect(res.body.missingFields).toContain("fundamentals");
  });

  it("rejects an AI response that fails schema validation", async () => {
    mockAIProvider.generate.mockResolvedValue({ notValidJson: true });
    const res = await request(app).get("/api/v1/research/TCS").set(authHeader);
    expect(res.status).toBe(502);
  });
});
```

## Coverage Targets (Phase 1)

| Area | Target |
|---|---|
| Financial calculation utils | 100% |
| Grounding pipeline | 90%+ (including failure paths) |
| Auth middleware | 90%+ |
| API routes overall | 80%+ |
| UI components | Critical paths only (Phase 1); expand in Phase 2 |

## CI Gate

PRs blocked from merge if: lint fails, any test fails, or coverage on `services/portfolio` / `services/ai` drops below target.
