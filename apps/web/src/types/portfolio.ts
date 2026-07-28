export interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface HoldingPnL {
  id?: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  invested: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  dailyChange: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPct: number;
  dailyChange: number;
  dailyChangePct: number;
  holdings: HoldingPnL[];
}

// ── Portfolio AI (Phase 2.5) ────────────────────────────────────────────────
export type HoldingFlag = 'strong' | 'weak' | 'neutral';
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface HoldingRiskMetric {
  symbol: string;
  sector: string;
  weight: number;
  weightPct: number;
  unrealizedPnLPct: number;
  flag: HoldingFlag;
}

export interface SectorAllocationMetric {
  sector: string;
  weight: number;
  weightPct: number;
}

export interface PortfolioRiskMetrics {
  holdings: HoldingRiskMetric[];
  sectorAllocation: SectorAllocationMetric[];
  concentrationHHI: number;
  sectorHHI: number;
  largestPositionPct: number;
  effectiveHoldings: number;
  diversificationScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  holdingCount: number;
  sectorCount: number;
}

export interface PortfolioAnalysisNarrative {
  overallAssessment: string;
  riskCommentary: string;
  diversificationCommentary: string;
  holdingNotes: { symbol: string; note: string }[];
  confidence: number;
  dataAvailable: boolean;
}

export interface PortfolioAnalysis {
  summary: {
    totalInvested: number;
    currentValue: number;
    totalPnL: number;
    totalPnLPct: number;
  };
  metrics: PortfolioRiskMetrics;
  analysis: PortfolioAnalysisNarrative;
  disclaimer: string;
  dataAsOf: string;
}
