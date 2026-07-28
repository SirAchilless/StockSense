export interface HoldingWithPrice {
  symbol: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

export interface HoldingPnL {
  id?: string;              // holding DB id — included when served from portfolio route
  symbol: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  invested: number;         // quantity * buyPrice
  currentValue: number;     // quantity * currentPrice
  unrealizedPnL: number;    // currentValue - invested
  unrealizedPnLPct: number; // (unrealizedPnL / invested) * 100
  dailyChange: number;      // quantity * (currentPrice - previousClose)
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

export function calculateHoldingPnL(h: HoldingWithPrice & { previousClose?: number }): HoldingPnL {
  const invested = h.quantity * h.buyPrice;
  const currentValue = h.quantity * h.currentPrice;
  const unrealizedPnL = currentValue - invested;
  const unrealizedPnLPct = invested > 0 ? (unrealizedPnL / invested) * 100 : 0;
  const dailyChange = h.previousClose != null
    ? h.quantity * (h.currentPrice - h.previousClose)
    : 0;
  return {
    symbol: h.symbol,
    quantity: h.quantity,
    buyPrice: h.buyPrice,
    currentPrice: h.currentPrice,
    invested,
    currentValue,
    unrealizedPnL,
    unrealizedPnLPct,
    dailyChange,
  };
}

export function calculatePortfolioSummary(holdings: HoldingPnL[]): PortfolioSummary {
  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  const currentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalPnL = currentValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const dailyChange = holdings.reduce((s, h) => s + h.dailyChange, 0);
  const dailyChangePct = currentValue > 0 ? (dailyChange / (currentValue - dailyChange)) * 100 : 0;
  return { totalInvested, currentValue, totalPnL, totalPnLPct, dailyChange, dailyChangePct, holdings };
}
