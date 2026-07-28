export interface AdvanceDecline {
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
  advanceDeclineRatio: number;
}

export interface BreadthStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  advances: number;
  declines: number;
}

export interface FiiDiiActivity {
  date: string;
  fiiNetBuy: number;
  diiNetBuy: number;
  fiiGrossBuy: number;
  fiiGrossSell: number;
  diiGrossBuy: number;
  diiGrossSell: number;
}

export interface MarketBreadthData {
  advanceDecline: AdvanceDecline;
  topGainers: BreadthStock[];
  topLosers: BreadthStock[];
  sectorPerformance: SectorPerformance[];
  fiiDii: FiiDiiActivity[];
  dataAsOf: string;
}
