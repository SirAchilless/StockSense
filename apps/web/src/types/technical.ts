export type Timeframe = '1D' | '1W' | '1M' | '1Y';

export interface OHLCBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorBar {
  time: string;
  // Phase 1
  sma20: number | null;
  sma50: number | null;
  ema20: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  // Phase 2.3
  atr14: number | null;
  ichimokuTenkan: number | null;
  ichimokuKijun: number | null;
  ichimokuSenkouA: number | null;
  ichimokuSenkouB: number | null;
  ichimokuChikou: number | null;
  superTrendValue: number | null;
  superTrendDir: 'up' | 'down' | null;
}

export interface FibLevel {
  ratio: number;
  price: number;
  label: string;
}

export interface FibonacciLevels {
  swingHigh: number;
  swingLow: number;
  direction: 'up' | 'down';
  levels: FibLevel[];
}

export interface VolumeProfileBin {
  priceFrom: number;
  priceTo: number;
  priceMid: number;
  volume: number;
  isPOC: boolean;
}

export type PatternSignal = 'bullish' | 'bearish' | 'neutral';

export interface CandlePattern {
  index: number;
  name: string;
  signal: PatternSignal;
  description: string;
  time: string | null;
}

export interface TechnicalData {
  symbol: string;
  timeframe: Timeframe;
  bars: OHLCBar[];
  indicators: IndicatorBar[];
  fibonacci: FibonacciLevels | null;
  volumeProfile: VolumeProfileBin[];
  patterns: CandlePattern[];
}
