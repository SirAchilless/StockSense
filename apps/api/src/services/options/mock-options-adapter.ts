import type { OptionChainProvider, OptionChain, OptionLeg, OptionStrikeRow } from './types';
import { LOT_SIZES, ALL_OPTION_SYMBOLS } from './types';
import {
  blackScholes,
  computeMaxPain,
  computePCR,
  computeIVPercentile,
  findATMStrike,
  strikeInterval,
} from '../../lib/options-greeks';

// Fixed underlying prices for mock (mirrors market-data mock)
const MOCK_PRICES: Record<string, number> = {
  NIFTY: 22453.30,
  BANKNIFTY: 48321.60,
  FINNIFTY: 21847.50,
  MIDCPNIFTY: 12634.20,
  RELIANCE: 2456.75,
  TCS: 3841.20,
  HDFCBANK: 1624.80,
  INFY: 1763.90,
  ICICIBANK: 1247.60,
  SBIN: 821.45,
  WIPRO: 524.15,
  LT: 3634.70,
  AXISBANK: 1089.30,
  KOTAKBANK: 1923.40,
  BAJFINANCE: 7124.00,
  MARUTI: 12840.00,
  TATAMOTORS: 948.30,
  SUNPHARMA: 1634.80,
  HINDUNILVR: 2534.60,
};

// ATM IV for each symbol (realistic range for NSE options)
const MOCK_ATM_IV: Record<string, number> = {
  NIFTY: 12.8,
  BANKNIFTY: 14.5,
  FINNIFTY: 13.2,
  MIDCPNIFTY: 15.1,
  RELIANCE: 18.4,
  TCS: 16.2,
  HDFCBANK: 17.8,
  INFY: 19.3,
  ICICIBANK: 20.1,
  SBIN: 22.4,
  WIPRO: 21.0,
  LT: 19.8,
  AXISBANK: 20.5,
  KOTAKBANK: 18.7,
  BAJFINANCE: 23.1,
  MARUTI: 17.3,
  TATAMOTORS: 24.6,
  SUNPHARMA: 20.9,
  HINDUNILVR: 15.8,
};

// 52-week IV range for IV percentile
const MOCK_IV_RANGE: Record<string, [number, number]> = {
  NIFTY:     [9.5, 24.0],
  BANKNIFTY: [11.0, 28.5],
  FINNIFTY:  [10.2, 26.0],
  MIDCPNIFTY:[11.5, 29.0],
};

const RISK_FREE_RATE = 0.065; // RBI repo rate proxy

// Generate NSE-style weekly expiries (nearest 4 Thursdays from today)
function nextThursdays(count: number, from: Date = new Date()): string[] {
  const result: string[] = [];
  const d = new Date(from);
  // advance to next Thursday
  while (d.getDay() !== 4) {
    d.setDate(d.getDate() + 1);
  }
  for (let i = 0; i < count; i++) {
    result.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 7);
  }
  return result;
}

// Compute days between two date strings
function daysUntil(expiryStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryStr);
  exp.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((exp.getTime() - today.getTime()) / 86_400_000));
}

// IV skew: OTM puts have higher IV than ATM, OTM calls slightly lower
function skewedIV(baseIV: number, moneyness: number, optionType: 'call' | 'put'): number {
  // moneyness = (strike - spot) / spot  positive = OTM call / ITM put
  if (optionType === 'put') {
    // put skew: OTM puts (negative moneyness) get IV premium
    const skew = 1 + Math.max(0, -moneyness) * 1.5;
    return baseIV * skew;
  } else {
    // call: slight smile, smaller than put skew
    const skew = 1 + Math.abs(moneyness) * 0.3;
    return baseIV * skew;
  }
}

// Deterministic OI: heaviest at ATM, decays with distance (Gaussian-like)
function mockOI(
  strikePrice: number,
  atmStrike: number,
  interval: number,
  baseOI: number,
  optionType: 'call' | 'put',
): number {
  const strikesAway = (strikePrice - atmStrike) / interval;
  // Calls: heavier on OTM call side (above ATM) for index (sellers)
  // Puts: heavier on OTM put side (below ATM)
  const bias = optionType === 'put' ? -1 : 1;
  const centeredAt = bias * 2; // heaviest OI 2 strikes OTM
  const dist = strikesAway - centeredAt;
  const decay = Math.exp(-0.5 * (dist / 2.5) ** 2);
  return Math.round(baseOI * decay);
}

// Build one OptionLeg from Black-Scholes inputs + OI fixtures
function buildLeg(
  optionType: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  iv: number,
  oi: number,
  atmStrike: number,
  interval: number,
): OptionLeg {
  const sigma = iv / 100;
  const g = blackScholes({ underlyingPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: RISK_FREE_RATE, volatility: sigma, optionType });

  const ltp = +g.price.toFixed(2);
  const prevLtp = ltp * 0.985; // mock previous session: 1.5% lower for calls, higher for puts
  const change = +(ltp - prevLtp).toFixed(2);
  const bid = +(ltp * 0.995).toFixed(2);
  const ask = +(ltp * 1.005).toFixed(2);
  const oiChange = Math.round(oi * 0.08); // 8% OI build

  const strikesAway = Math.abs(K - atmStrike) / interval;
  const volume = Math.round(oi * 0.3 * Math.exp(-strikesAway * 0.2));

  return {
    ltp,
    change,
    changePercent: prevLtp > 0 ? +(change / prevLtp * 100).toFixed(2) : 0,
    bid,
    ask,
    iv: +iv.toFixed(2),
    oi,
    oiChange,
    volume,
    delta: +g.delta.toFixed(4),
    gamma: +g.gamma.toFixed(6),
    theta: +g.theta.toFixed(4),
    vega: +g.vega.toFixed(4),
  };
}

export class MockOptionChainAdapter implements OptionChainProvider {
  getSupportedSymbols(): string[] {
    return [...ALL_OPTION_SYMBOLS];
  }

  async getAvailableExpiries(symbol: string): Promise<string[]> {
    const upper = symbol.toUpperCase();
    const count = upper === 'NIFTY' || upper === 'BANKNIFTY' ? 8 : 4;
    return nextThursdays(count);
  }

  async getOptionChain(symbol: string, expiry?: string): Promise<OptionChain> {
    const upper = symbol.toUpperCase();
    const expiries = await this.getAvailableExpiries(upper);
    const selectedExpiry = expiry && expiries.includes(expiry) ? expiry : expiries[0];
    const daysToExpiry = daysUntil(selectedExpiry);
    const T = Math.max(0.0027, daysToExpiry / 365); // min ~1 day

    const S = MOCK_PRICES[upper] ?? 1000;
    const atmIV = MOCK_ATM_IV[upper] ?? 18;
    const interval = strikeInterval(upper);
    const atmStrike = findATMStrike(S, interval);
    const lotSize = LOT_SIZES[upper] ?? 500;

    // Generate strikes: 12 below ATM, ATM, 12 above ATM
    const strikesCount = 12;
    const baseOI = upper === 'NIFTY' ? 80000 : upper === 'BANKNIFTY' ? 50000 : 15000;
    const allStrikes: OptionStrikeRow[] = [];

    for (let i = -strikesCount; i <= strikesCount; i++) {
      const K = atmStrike + i * interval;
      const moneyness = (K - S) / S;

      const callIV = skewedIV(atmIV, moneyness, 'call');
      const putIV = skewedIV(atmIV, moneyness, 'put');

      const callOI = mockOI(K, atmStrike, interval, baseOI, 'call');
      const putOI = mockOI(K, atmStrike, interval, baseOI, 'put');

      allStrikes.push({
        strikePrice: K,
        call: buildLeg('call', S, K, T, callIV, callOI, atmStrike, interval),
        put: buildLeg('put', S, K, T, putIV, putOI, atmStrike, interval),
        isATM: K === atmStrike,
      });
    }

    const totalCallOI = allStrikes.reduce((s, r) => s + r.call.oi, 0);
    const totalPutOI = allStrikes.reduce((s, r) => s + r.put.oi, 0);
    const totalCallVolume = allStrikes.reduce((s, r) => s + r.call.volume, 0);
    const totalPutVolume = allStrikes.reduce((s, r) => s + r.put.volume, 0);

    const maxPainInput = allStrikes.map((r) => ({
      strikePrice: r.strikePrice,
      callOI: r.call.oi,
      putOI: r.put.oi,
    }));

    const ivRange = MOCK_IV_RANGE[upper] ?? [atmIV * 0.7, atmIV * 1.8];

    return {
      symbol: upper,
      underlyingPrice: S,
      atmStrike,
      expiry: selectedExpiry,
      daysToExpiry,
      availableExpiries: expiries,
      lotSize,
      strikes: allStrikes,
      totalCallOI,
      totalPutOI,
      totalCallVolume,
      totalPutVolume,
      pcrOI: computePCR(totalPutOI, totalCallOI),
      pcrVolume: computePCR(totalPutVolume, totalCallVolume),
      maxPainStrike: computeMaxPain(maxPainInput),
      ivPercentile: computeIVPercentile(atmIV, ivRange[0], ivRange[1]),
      dataAsOf: new Date().toISOString(),
    };
  }
}
