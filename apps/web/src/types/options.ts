export interface OptionLeg {
  ltp: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  iv: number;
  oi: number;
  oiChange: number;
  volume: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface OptionStrikeRow {
  strikePrice: number;
  call: OptionLeg;
  put: OptionLeg;
  isATM: boolean;
}

export interface OptionChain {
  symbol: string;
  underlyingPrice: number;
  atmStrike: number;
  expiry: string;
  daysToExpiry: number;
  availableExpiries: string[];
  lotSize: number;
  strikes: OptionStrikeRow[];
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  pcrOI: number;
  pcrVolume: number;
  maxPainStrike: number;
  ivPercentile: number;
  dataAsOf: string;
}

export interface KeyLevelNote {
  strikePrice: number;
  note: string;
}

export interface OptionChainInterpretation {
  marketBiasNote: string;
  maxPainNote: string;
  ivNote: string;
  keyLevelNotes: KeyLevelNote[];
  confidence: number;
  dataAvailable: boolean;
}

export interface OptionAnalysisResult {
  chain: OptionChain;
  interpretation: OptionChainInterpretation;
  disclaimer: string;
}
