// Options Greeks — deterministic Black-Scholes computations
//
// Anti-hallucination principle (mirrors portfolio-risk.ts): ALL numeric metrics
// (delta, gamma, theta, vega, PCR, max pain) are computed here, never by the AI.
// The AI layer only narrates over these grounded numbers.
//
// References: Black & Scholes (1973); Hull "Options, Futures & Other Derivatives".
// Uses Abramowitz & Stegun §26.2.17 for the normal CDF approximation (max error 7.5e-8).

export interface BlackScholesInput {
  underlyingPrice: number;  // S — current spot price
  strikePrice: number;      // K
  timeToExpiry: number;     // T — in years (e.g. 7/365 for 7 days)
  riskFreeRate: number;     // r — annualised (e.g. 0.065 for 6.5%)
  volatility: number;       // σ — annualised (e.g. 0.15 for 15%)
  optionType: 'call' | 'put';
}

export interface GreeksResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // per calendar day
  vega: number;  // per 1% absolute IV move
  iv: number;    // same as input volatility, in percent (e.g. 15 for 15%)
}

// ── Normal distribution helpers ───────────────────────────────────────────────

function normalCDF(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-ax * ax)));
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ── d1 / d2 helpers ───────────────────────────────────────────────────────────

function d1d2(S: number, K: number, T: number, r: number, sigma: number): [number, number] {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return [d1, d2];
}

// ── Black-Scholes price + Greeks ──────────────────────────────────────────────

export function blackScholes(input: BlackScholesInput): GreeksResult {
  const { underlyingPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: r, volatility: sigma, optionType } = input;

  // Guard: with zero time or zero vol, Greeks degenerate
  if (T <= 0 || sigma <= 0) {
    const intrinsic = optionType === 'call'
      ? Math.max(0, S - K)
      : Math.max(0, K - S);
    return { price: intrinsic, delta: intrinsic > 0 ? (optionType === 'call' ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0, iv: sigma * 100 };
  }

  const sqrtT = Math.sqrt(T);
  const [d1, d2] = d1d2(S, K, T, r, sigma);
  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const nd1 = normalPDF(d1);
  const discountFactor = Math.exp(-r * T);

  let price: number;
  let delta: number;
  let theta: number;

  if (optionType === 'call') {
    price = S * Nd1 - K * discountFactor * Nd2;
    delta = Nd1;
    theta = (-S * nd1 * sigma / (2 * sqrtT) - r * K * discountFactor * Nd2) / 365;
  } else {
    price = K * discountFactor * (1 - Nd2) - S * (1 - Nd1);
    delta = Nd1 - 1;
    theta = (-S * nd1 * sigma / (2 * sqrtT) + r * K * discountFactor * (1 - Nd2)) / 365;
  }

  const gamma = nd1 / (S * sigma * sqrtT);
  const vega = S * nd1 * sqrtT / 100; // per 1% move in IV

  return {
    price: Math.max(0, price),
    delta,
    gamma,
    theta,
    vega,
    iv: sigma * 100,
  };
}

// ── Implied volatility (Newton-Raphson) ───────────────────────────────────────

const IV_MAX_ITER = 100;
const IV_PRECISION = 1e-6;
const IV_MIN = 0.001; // 0.1%
const IV_MAX = 5.0;   // 500%

export function impliedVolatility(
  marketPrice: number,
  underlyingPrice: number,
  strikePrice: number,
  timeToExpiry: number,
  riskFreeRate: number,
  optionType: 'call' | 'put',
): number | null {
  if (marketPrice <= 0 || timeToExpiry <= 0) return null;

  // Intrinsic bound check — price can't be less than intrinsic
  const intrinsic = optionType === 'call'
    ? Math.max(0, underlyingPrice - strikePrice * Math.exp(-riskFreeRate * timeToExpiry))
    : Math.max(0, strikePrice * Math.exp(-riskFreeRate * timeToExpiry) - underlyingPrice);
  if (marketPrice < intrinsic) return null;

  let sigma = 0.2; // initial guess: 20% IV

  for (let i = 0; i < IV_MAX_ITER; i++) {
    const result = blackScholes({ underlyingPrice, strikePrice, timeToExpiry, riskFreeRate, volatility: sigma, optionType });
    const diff = result.price - marketPrice;
    if (Math.abs(diff) < IV_PRECISION) return sigma * 100;

    // vega in price terms (not per 1%): result.vega * 100
    const vegaFull = result.vega * 100;
    if (Math.abs(vegaFull) < 1e-10) break;

    sigma = sigma - diff / vegaFull;
    sigma = Math.min(IV_MAX, Math.max(IV_MIN, sigma));
  }

  return sigma * 100;
}

// ── Max pain computation ──────────────────────────────────────────────────────
// Max pain = strike where the total dollar payout to option buyers is minimised
// (i.e. where option writers retain maximum premium).

export interface MaxPainInput {
  strikePrice: number;
  callOI: number;   // open interest in contracts
  putOI: number;
}

export function computeMaxPain(strikes: MaxPainInput[]): number {
  if (strikes.length === 0) return 0;

  let minPain = Infinity;
  let maxPainStrike = strikes[Math.floor(strikes.length / 2)].strikePrice;

  for (const target of strikes) {
    let totalPain = 0;
    for (const s of strikes) {
      // Call holders gain when spot > strike
      if (target.strikePrice > s.strikePrice) {
        totalPain += (target.strikePrice - s.strikePrice) * s.callOI;
      }
      // Put holders gain when spot < strike
      if (target.strikePrice < s.strikePrice) {
        totalPain += (s.strikePrice - target.strikePrice) * s.putOI;
      }
    }
    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = target.strikePrice;
    }
  }

  return maxPainStrike;
}

// ── PCR (Put-Call Ratio) ──────────────────────────────────────────────────────

export function computePCR(totalPutOI: number, totalCallOI: number): number {
  if (totalCallOI <= 0) return 0;
  return +(totalPutOI / totalCallOI).toFixed(4);
}

// ── IV percentile helper ──────────────────────────────────────────────────────
// Given an ATM IV and a notional 1Y range, compute percentile rank.
// In production this would use a historical IV series; mock uses fixed range.

export function computeIVPercentile(
  currentIV: number,
  low52w: number,
  high52w: number,
): number {
  if (high52w <= low52w) return 50;
  const pct = ((currentIV - low52w) / (high52w - low52w)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

// ── ATM strike helper ─────────────────────────────────────────────────────────

export function findATMStrike(underlyingPrice: number, strikeInterval: number): number {
  return Math.round(underlyingPrice / strikeInterval) * strikeInterval;
}

// ── Strike interval by symbol ─────────────────────────────────────────────────

export function strikeInterval(symbol: string): number {
  const upper = symbol.toUpperCase();
  if (upper === 'NIFTY') return 50;
  if (upper === 'BANKNIFTY') return 100;
  if (upper === 'FINNIFTY') return 50;
  if (upper === 'MIDCPNIFTY') return 50;
  return 20; // stock options default
}
