import { z } from 'zod';

// ── Per-side option data ──────────────────────────────────────────────────────

export interface OptionLeg {
  ltp: number;           // last traded price
  change: number;        // price change vs previous close
  changePercent: number;
  bid: number;
  ask: number;
  iv: number;            // implied volatility in % (e.g. 12.5 for 12.5%)
  oi: number;            // open interest in contracts
  oiChange: number;      // OI change from previous session (contracts)
  volume: number;        // volume in contracts
  delta: number;         // 0..1 for calls, -1..0 for puts
  gamma: number;
  theta: number;         // daily decay in INR
  vega: number;          // INR change per 1% IV move
}

// ── Strike row (call + put at the same strike) ────────────────────────────────

export interface OptionStrikeRow {
  strikePrice: number;
  call: OptionLeg;
  put: OptionLeg;
  isATM: boolean;
}

// ── Full option chain for one symbol + expiry ─────────────────────────────────

export interface OptionChain {
  symbol: string;
  underlyingPrice: number;
  atmStrike: number;
  expiry: string;            // YYYY-MM-DD
  daysToExpiry: number;
  availableExpiries: string[];
  lotSize: number;           // NSE lot size in units
  strikes: OptionStrikeRow[];
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  pcrOI: number;             // totalPutOI / totalCallOI; 0 when totalCallOI = 0
  pcrVolume: number;
  maxPainStrike: number;     // strike with minimum total option payout to buyers
  ivPercentile: number;      // 0–100: where ATM IV sits vs 252-day range
  dataAsOf: string;          // ISO timestamp
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface OptionChainProvider {
  getOptionChain(symbol: string, expiry?: string): Promise<OptionChain>;
  getAvailableExpiries(symbol: string): Promise<string[]>;
  getSupportedSymbols(): string[];
}

// ── Supported index + stock option symbols ────────────────────────────────────

export const INDEX_OPTION_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'] as const;
export type IndexOptionSymbol = (typeof INDEX_OPTION_SYMBOLS)[number];

export const STOCK_OPTION_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'WIPRO', 'LT', 'AXISBANK', 'KOTAKBANK',
  'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'HINDUNILVR',
] as const;
export type StockOptionSymbol = (typeof STOCK_OPTION_SYMBOLS)[number];

export const ALL_OPTION_SYMBOLS: readonly string[] = [...INDEX_OPTION_SYMBOLS, ...STOCK_OPTION_SYMBOLS];

// lot sizes in units (NSE standard)
export const LOT_SIZES: Record<string, number> = {
  NIFTY: 50, BANKNIFTY: 15, FINNIFTY: 40, MIDCPNIFTY: 75,
  RELIANCE: 250, TCS: 175, HDFCBANK: 550, INFY: 300, ICICIBANK: 700,
  SBIN: 1500, WIPRO: 1500, LT: 150, AXISBANK: 625, KOTAKBANK: 400,
  BAJFINANCE: 125, MARUTI: 25, TATAMOTORS: 1425, SUNPHARMA: 350, HINDUNILVR: 300,
};

// ── AI interpretation schema (zod) ────────────────────────────────────────────

export const OptionChainInterpretationSchema = z.object({
  marketBiasNote: z.string().min(1),    // PCR + OI buildup observation
  maxPainNote: z.string().min(1),       // max pain level and typical expiry-week mechanics
  ivNote: z.string().min(1),            // IV percentile commentary
  keyLevelNotes: z.array(
    z.object({
      strikePrice: z.number(),
      note: z.string().min(1),
    }),
  ),
  confidence: z.number().min(0).max(1),
  dataAvailable: z.boolean(),
});

export type OptionChainInterpretation = z.infer<typeof OptionChainInterpretationSchema>;
