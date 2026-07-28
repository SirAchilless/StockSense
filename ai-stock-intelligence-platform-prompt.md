# AI Stock Intelligence Platform — Build Specification (Enhanced)

## 0. How to use this document
This is a build brief for an AI coding agent (e.g. Claude Code) to execute **phase by phase**. Each phase below ends with **Acceptance Criteria** — do not proceed to the next phase until those are met and confirmed. This structure exists because the original brief listed ~200 features with no sequencing, no data-source plan, and no compliance guardrails — all of which are added here.

---

## 1. Project Identity

**Name:** AI Stock Intelligence Platform
**Tagline:** AI-Powered Indian Market Research & Portfolio Intelligence
**Audience:** Retail investors and active traders in the Indian equity/derivatives market (NSE/BSE)
**Positioning:** Apple/Linear/Raycast-grade visual polish, applied to a serious fintech research tool.

---

## 2. Critical Constraints (read before building anything)

These were missing from the original brief and will cause real failures if ignored:

1. **Live market data licensing.** NSE/BSE real-time data, TradingView charts, and most broker APIs (Zerodha Kite, Upstox, AngelOne, Groww, ICICI Direct) require paid licenses or partner agreements to use commercially. Build the app against an **abstracted market-data-provider interface** so any of these (or a delayed/free-tier data source, e.g. NSE's public 15-min-delayed feeds) can be plugged in without touching business logic. Do not hardcode a specific vendor's SDK into the UI or services layer.
2. **Regulatory disclosure.** In India, "buy/sell/target/stoploss" recommendations fall under SEBI Research Analyst / Investment Adviser regulations. Every AI-generated recommendation must carry a visible disclaimer ("for informational purposes only, not investment advice, AI-generated, no human analyst review") and the app must not present itself as a registered advisory service unless the business actually is one. Add this as a hard UI requirement, not an afterthought.
3. **No hallucinated numbers.** The AI layer must be **retrieval-augmented**: it only reasons over data actually fetched from the market-data/news/fundamentals services in that request. If required data isn't available, the AI must say so explicitly rather than estimate. Build this as an enforced pipeline step (data-fetch → validation → prompt injection → response), not a prompt instruction alone.
4. **Broker imports are OAuth-gated.** Each broker (Zerodha, Upstox, AngelOne, ICICI Direct, Groww) has its own auth flow and API terms; a generic "import" button is not realistic for phase 1. Scope initial support to CSV/Excel upload (works for all brokers via contract note export) and treat live broker OAuth integration as a later, per-broker phase.
5. **Scope size.** The original brief specifies a genuinely enterprise-scale product (15 modules, real-time infra, multiple AI subsystems). Treat it as a multi-quarter roadmap. Phase 1 below defines a real, shippable MVP; later phases build outward from it.

---

## 3. Tech Stack (unchanged, confirmed sensible)

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS, shadcn/ui, Framer Motion, TanStack Query, Redux Toolkit (for cross-cutting state only — prefer Query for server state), React Router, Recharts (own charts) + TradingView widget (candlesticks), TanStack Table
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL + Prisma
- **Auth:** JWT (access + refresh token rotation), Google OAuth
- **Infra:** Docker, NGINX, GitHub Actions, Vercel (frontend), AWS (backend/data services)
- **AI:** NVIDIA NIM as the primary inference layer — usable either via NVIDIA's hosted cloud API (API key, `integrate.api.nvidia.com`) or self-hosted locally as a NIM Docker container on the user's own GPU hardware. Accessed through a provider-agnostic client interface (OpenAI-compatible schema) so it can be swapped or supplemented later without touching business logic.

---

## 4. Design System

Apple/Linear/Raycast/Arc/Notion/Vercel-inspired. Concretely:

- Design tokens for spacing, radius, blur, and both color modes defined in one place (Tailwind config + CSS variables), not per-component
- Glassmorphism used deliberately (nav bars, modals, key cards) — not on every surface, or it reads as noise rather than premium
- One primary font family for UI, one monospace for numeric/price data (numeric tabular alignment matters for a finance product)
- Motion via Framer Motion: page transitions, card entrance, number tickers for live prices — kept subtle (150–250ms) so it doesn't feel gimmicky
- Dark mode as default, light mode fully supported, no half-themed screens

---

## 5. Feature Modules — Broken Into Small Steps

Full detail (goals, scope, and acceptance criteria per step) lives in `ROADMAP.md`. Summary here for quick reference — **build and verify one step before starting the next**:

### Phase 1 (MVP)
| Step | Deliverable |
|---|---|
| 1.1 | Project scaffolding (monorepo, health check, lint) |
| 1.2 | Auth — email/password (register, login, JWT) |
| 1.3 | Auth — refresh tokens + Google OAuth |
| 1.4 | Market data provider adapter (interface + one real implementation, no UI) |
| 1.5 | Dashboard UI (NIFTY 50, BANK NIFTY, SENSEX, VIX, market status) |
| 1.6 | Portfolio — manual holding entry + P&L calculation |
| 1.7 | Portfolio — CSV/Excel import |
| 1.8 | AI grounding pipeline (foundation, NVIDIA NIM adapter, no feature UI yet) |
| 1.9 | AI Stock Research feature (built on 1.8) |
| 1.10 | Basic Technical Analysis (chart + SMA/EMA/RSI/MACD) |
| 1.11 | AI Chat (built on 1.8/1.9) |

### Phase 2 (Depth)
| Step | Deliverable |
|---|---|
| 2.1 | Global Markets monitor + "why this matters" AI notes |
| 2.2 | Market Breadth (advance/decline, gainers/losers, heatmap, FII/DII, block/bulk deals) |
| 2.3 | Full Technical Analysis suite (Ichimoku, SuperTrend, Fibonacci, volume profile, patterns) — one indicator at a time |
| 2.4 | News aggregation + sentiment/impact scoring |
| 2.5 | Portfolio AI (risk score, diversification score, scenario-framed entry/exit) |

### Phase 3 (Advanced / regulated-sensitive — compliance review required)
| Step | Deliverable |
|---|---|
| 3.1 | Option chain intelligence (data layer first, AI interpretation second) |
| 3.2 | F&O intelligence (rollovers, FII/DII positioning) |
| 3.3 | AI Prediction Engine (multi-horizon, confidence bands, legal sign-off required before ship) |
| 3.4 | Alerts (email first, then push) — price/stoploss/target/news/portfolio-risk |
| 3.5 | Broker OAuth integrations — **on hold, not required for the near-term build**; one broker at a time when revisited |

Each numbered step has its own explicit acceptance criterion in `ROADMAP.md` — an agent should treat that as the definition of "done" before moving to the next number.

---

## 6. AI Architecture

- **Grounding pipeline:** every AI response passes through: (1) identify required data → (2) fetch from market/fundamentals/news services → (3) validate completeness → (4) inject only verified data into the prompt → (5) generate response with a structured output schema including a `confidence` field and a `dataAsOf` timestamp
- **Never free-generate numeric claims** (prices, ratios, OI values) — these must always trace back to a fetched value the response can cite internally
- **Model routing:** abstract the AI provider behind one interface. Primary configuration is NVIDIA NIM, in one of two modes:
  - **Cloud mode:** calls NVIDIA's hosted NIM endpoint with an API key — no local GPU required, simplest to start with
  - **Local mode:** calls a self-hosted NIM microservice running as a Docker container on local/on-prem GPU hardware — no data leaves the machine, but requires a compatible NVIDIA GPU and sufficient VRAM for the chosen model
  - Both modes expose the same OpenAI-compatible chat-completions API shape, so the application code does not need to branch on which mode is active — only the base URL and auth header differ
  - The interface remains provider-agnostic so a second provider (OpenAI/Claude/Gemini) could be added later per use case without refactoring
- **Every recommendation-shaped output** (entry/exit/target/stoploss) ships with the disclaimer language from §2.2, non-removable by the UI layer

---

## 7. Non-Functional Requirements (added — not in original brief)

- **Performance:** dashboard live-price updates via WebSocket/polling with sub-second UI update, code-split routes, Lighthouse ≥ 90 on key pages
- **Security:** rate limiting on all AI and market-data endpoints, input validation (zod or equivalent) on every API boundary, secrets via environment variables only, refresh-token rotation
- **Accessibility:** keyboard navigable, proper contrast in both themes, ARIA labels on interactive charts/tables
- **Testing:** unit tests for financial calculations (P&L, ratios) are non-negotiable given the domain; integration tests for the AI grounding pipeline to catch ungrounded claims

---

## 8. Documentation Set

Keep the original list, but generate it **as each phase completes**, not all upfront:
`README, ARCHITECTURE, SYSTEM_DESIGN, FEATURES, ROADMAP, UI_GUIDELINES, API_DOCUMENTATION, DATABASE_SCHEMA, AI_ENGINE, PROMPT_ENGINEERING, PORTFOLIO_ANALYSIS, OPTION_CHAIN_ENGINE, MARKET_DATA, NEWS_ENGINE, AUTHENTICATION, DEPLOYMENT, SECURITY, CONTRIBUTING, CHANGELOG, ENVIRONMENT_SETUP, TESTING, DOCKER, CI_CD, PERFORMANCE, ACCESSIBILITY`

---

## 9. Execution Instructions for the Agent

1. Confirm the market-data source to be used for step 1.4 (paid vendor vs. free delayed feed) before writing any data-fetch code — **ask if not specified**.
2. Work through the numbered steps in `ROADMAP.md` (1.1 → 1.11 → 2.1 → ... → 3.5) **in order, one at a time** — do not start step N+1 until step N's acceptance criteria are met.
3. At the end of each step, output: what was built, what's mocked vs. live, and explicit open questions before continuing to the next step.
4. Do not silently expand scope within a step — if a step needs a paid API or regulatory sign-off, flag it rather than building a fake/mocked version that looks production-ready.
5. Do not combine multiple numbered steps into one unit of work, even if they seem related — each exists as its own unit specifically so it can be verified independently.

---

## 10. What Changed From the Original Brief (summary)

- Added data-licensing, compliance/disclaimer, and anti-hallucination constraints (previously unstated)
- Reordered ~15 flat modules into a 3-phase MVP → depth → regulated-advanced roadmap
- Replaced "import from 5 brokers" with "CSV upload first, OAuth per-broker later" (realistic sequencing)
- Added non-functional requirements section (performance, security, testing, accessibility) — absent from original
- Added explicit agent execution protocol so phases don't silently balloon in scope
- AI provider set to NVIDIA NIM (cloud API key or local self-hosted container), replacing the OpenAI/Claude/Gemini multi-provider default, per current decision
- Broker OAuth integration explicitly put on hold — not required for the near-term build
- Feature modules broken down from 3 broad phases into ~21 small, independently verifiable numbered steps (see ROADMAP.md) so an AI agent can execute reliably one step at a time
