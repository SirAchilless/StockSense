// Portfolio risk & diversification scoring — Phase 2.5
//
// These scores are computed DETERMINISTICALLY here, not by the AI layer.
// This mirrors the anti-hallucination principle (AI_ENGINE.md): the AI never
// free-generates a numeric claim. The risk score, diversification score, and
// per-holding flags are grounded numbers derived from portfolio composition;
// the AI layer only narrates over them (scenario-framed), it does not invent them.

export type HoldingFlag = 'strong' | 'weak' | 'neutral';
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface RiskHoldingInput {
  symbol: string;
  currentValue: number;      // quantity * currentPrice
  unrealizedPnLPct: number;  // (currentValue - invested) / invested * 100
  sector: string | null;
}

export interface HoldingRiskMetric {
  symbol: string;
  sector: string;            // 'Unknown' when sector could not be fetched
  weight: number;            // 0..1 share of portfolio current value
  weightPct: number;         // 0..100
  unrealizedPnLPct: number;
  flag: HoldingFlag;
}

export interface SectorAllocationMetric {
  sector: string;
  weight: number;            // 0..1
  weightPct: number;         // 0..100
}

export interface PortfolioRiskMetrics {
  holdings: HoldingRiskMetric[];        // sorted by weight desc
  sectorAllocation: SectorAllocationMetric[]; // sorted by weight desc
  concentrationHHI: number;   // Herfindahl index of single-name weights, 0..1
  sectorHHI: number;          // Herfindahl index of sector weights, 0..1
  largestPositionPct: number; // biggest single position, 0..100
  effectiveHoldings: number;  // 1 / concentrationHHI (diversification-count proxy)
  diversificationScore: number; // 0..100, higher = more diversified
  riskScore: number;          // 0..100, higher = riskier composition
  riskLevel: RiskLevel;
  holdingCount: number;
  sectorCount: number;
}

// A holding up >= +10% is flagged strong, down <= -10% weak, else neutral.
export const STRONG_THRESHOLD_PCT = 10;
export const WEAK_THRESHOLD_PCT = -10;

export function flagHolding(unrealizedPnLPct: number): HoldingFlag {
  if (unrealizedPnLPct >= STRONG_THRESHOLD_PCT) return 'strong';
  if (unrealizedPnLPct <= WEAK_THRESHOLD_PCT) return 'weak';
  return 'neutral';
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 67) return 'high';
  if (score >= 34) return 'moderate';
  return 'low';
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

const EMPTY_METRICS: PortfolioRiskMetrics = {
  holdings: [],
  sectorAllocation: [],
  concentrationHHI: 0,
  sectorHHI: 0,
  largestPositionPct: 0,
  effectiveHoldings: 0,
  diversificationScore: 0,
  riskScore: 0,
  riskLevel: 'low',
  holdingCount: 0,
  sectorCount: 0,
};

export function calculatePortfolioRisk(holdings: RiskHoldingInput[]): PortfolioRiskMetrics {
  const totalValue = holdings.reduce((s, h) => s + Math.max(0, h.currentValue), 0);
  if (holdings.length === 0 || totalValue <= 0) {
    return { ...EMPTY_METRICS };
  }

  const holdingMetrics: HoldingRiskMetric[] = holdings.map((h) => {
    const weight = Math.max(0, h.currentValue) / totalValue;
    return {
      symbol: h.symbol,
      sector: h.sector ?? 'Unknown',
      weight,
      weightPct: weight * 100,
      unrealizedPnLPct: h.unrealizedPnLPct,
      flag: flagHolding(h.unrealizedPnLPct),
    };
  });

  // Aggregate weights by sector
  const sectorMap = new Map<string, number>();
  for (const h of holdingMetrics) {
    sectorMap.set(h.sector, (sectorMap.get(h.sector) ?? 0) + h.weight);
  }
  const sectorAllocation: SectorAllocationMetric[] = [...sectorMap.entries()]
    .map(([sector, weight]) => ({ sector, weight, weightPct: weight * 100 }))
    .sort((a, b) => b.weight - a.weight);

  const concentrationHHI = holdingMetrics.reduce((s, h) => s + h.weight * h.weight, 0);
  const sectorHHI = sectorAllocation.reduce((s, sec) => s + sec.weight * sec.weight, 0);
  const largestPositionPct = Math.max(...holdingMetrics.map((h) => h.weightPct));
  const effectiveHoldings = concentrationHHI > 0 ? 1 / concentrationHHI : 0;

  // Diversification: 60% single-name spread + 40% sector spread.
  // A single holding => both HHIs = 1 => score 0. Many equal holdings across
  // many sectors => both HHIs → 0 => score → 100.
  const diversificationScore = clamp(
    Math.round((1 - concentrationHHI) * 60 + (1 - sectorHHI) * 40),
    0,
    100,
  );

  // Risk: concentration (45%) + sector concentration (30%) + largest single position (25%).
  const riskScore = clamp(
    Math.round(concentrationHHI * 45 + sectorHHI * 30 + (largestPositionPct / 100) * 25),
    0,
    100,
  );

  return {
    holdings: holdingMetrics.sort((a, b) => b.weight - a.weight),
    sectorAllocation,
    concentrationHHI,
    sectorHHI,
    largestPositionPct,
    effectiveHoldings,
    diversificationScore,
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    holdingCount: holdingMetrics.length,
    sectorCount: sectorMap.size,
  };
}
