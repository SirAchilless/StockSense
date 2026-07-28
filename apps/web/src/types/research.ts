export interface ResearchRatios {
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roce: number | null;
  eps: number | null;
  debtToEquity: number | null;
}

export interface ResearchResponse {
  businessSummary: string;
  ratios: ResearchRatios;
  bullCase: string;
  bearCase: string;
  confidence: number;
  dataAvailable: boolean;
  missingFields: string[];
}

export interface ResearchResult {
  symbol: string;
  response: ResearchResponse;
  dataAsOf: string;
  disclaimer: string;
  cached: boolean;
}
