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
