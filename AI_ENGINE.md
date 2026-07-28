# AI Engine

## Principle

The AI layer **never free-generates a factual/numeric claim**. Every price, ratio, OI value, or news reference in a response must trace back to data actually fetched in that request. This is enforced structurally, not just via prompt instruction.

## Grounding Pipeline

```
1. Identify required data   → what does this request need? (quote, fundamentals, news, portfolio holdings)
2. Fetch                    → via MarketDataProvider / NewsProvider / DB, never invented
3. Validate                 → are all required fields present? if not, stop and report the gap
4. Inject                   → build a structured prompt containing only verified data + explicit instruction
                               to state "data unavailable" rather than estimate
5. Generate                 → call AIProvider.generate()
6. Parse & validate response→ against a strict output schema (zod); reject/retry if malformed
7. Attach metadata           → confidence score, dataAsOf timestamp, disclaimer
8. Cache (short TTL) & return
```

## Structured Output Schema (Research example)

```ts
const ResearchResponseSchema = z.object({
  businessSummary: z.string(),
  ratios: z.object({
    pe: z.number().nullable(),
    pb: z.number().nullable(),
    roe: z.number().nullable(),
    roce: z.number().nullable(),
    eps: z.number().nullable(),
    debtToEquity: z.number().nullable(),
  }),
  bullCase: z.string(),
  bearCase: z.string(),
  confidence: z.number().min(0).max(1),
});
```
`null` ratios mean "not available" — the AI is instructed to use `null`, never to fill a plausible-looking number.

## Provider: NVIDIA NIM

```ts
interface AIProvider {
  generate(req: GroundedPromptRequest): Promise<StructuredAIResponse>;
}
```

The primary implementation, `NvidiaNimAdapter`, talks to NVIDIA NIM's OpenAI-compatible chat-completions API. It supports two interchangeable modes, chosen via `NIM_MODE`:

| Mode | `NIM_MODE` | Base URL | Auth | Notes |
|---|---|---|---|---|
| Cloud | `cloud` | `https://integrate.api.nvidia.com/v1` | `NIM_API_KEY` (Bearer) | Simplest to start with, no local GPU required, usage billed per NVIDIA's pricing |
| Local | `local` | `http://localhost:8000/v1` (or wherever the container is exposed) | none, or a locally-configured key | Runs a NIM microservice in Docker on local/on-prem GPU hardware; no data leaves the machine; requires a CUDA-compatible GPU with enough VRAM for the chosen model |

Both modes are accessed through the identical adapter code — only `baseUrl` and the auth header differ, so switching modes is a config change, not a code change.

- Chat (low-stakes, high-volume) → smaller/faster NIM model
- Deep research (higher-stakes) → larger NIM model, if the deployment offers multiple model sizes
- Model name and mode selected per use case in one config file, not scattered across call sites
- If local mode is used, add a startup health check that calls the NIM container's `/v1/health` (or equivalent) endpoint before serving traffic, since the service may still be loading the model on cold start

## Prompt Design Rules

1. System prompt states explicitly: "Only use the data provided below. If a value is missing, return `null` for that field — do not estimate."
2. All fetched data is serialized into the prompt in a labeled, structured block (not prose) to reduce misreading.
3. The model is asked to return **only** the JSON matching the schema — no preamble.
4. Retries: if schema validation fails twice, the endpoint returns a `502` rather than surfacing an unvalidated response.

## Disclaimers

Every response containing a recommendation-shaped element (target, stoploss, entry/exit, bull/bear case, prediction) carries:

> "AI-generated research for informational purposes only. Not investment advice. No human analyst review. [App Name] is not a SEBI-registered investment adviser or research analyst."

This disclaimer is attached server-side as a non-optional field in the response schema and rendered by a shared UI component — individual feature screens cannot omit it.

## What's Explicitly Deferred to Phase 3

Multi-horizon price prediction and option-chain trade setups carry materially higher regulatory exposure than single-stock research. These features additionally require:
- More conservative language (ranges/scenarios, not single-point targets)
- Legal/compliance review of exact UI copy before launch
- Clear visual separation from "this is data" vs. "this is the AI's inference"
