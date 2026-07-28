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
  sma20: number | null;
  sma50: number | null;
  ema20: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
}

export interface TechnicalData {
  symbol: string;
  timeframe: Timeframe;
  bars: OHLCBar[];
  indicators: IndicatorBar[];
}
