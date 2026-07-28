import axios from 'axios';
import type { OptionChainProvider, OptionChain, OptionLeg, OptionStrikeRow } from './types';
import { LOT_SIZES, INDEX_OPTION_SYMBOLS } from './types';
import {
  impliedVolatility,
  computeMaxPain,
  computePCR,
  computeIVPercentile,
  findATMStrike,
  strikeInterval,
  blackScholes,
} from '../../lib/options-greeks';

// NSE public APIs require session cookies; we establish a session via the NSE
// homepage before calling the data endpoints.
const NSE_BASE = 'https://www.nseindia.com';
const NSE_OPTION_CHAIN_INDICES = `${NSE_BASE}/api/option-chain-indices`;
const NSE_OPTION_CHAIN_EQUITIES = `${NSE_BASE}/api/option-chain-equities`;

const RISK_FREE_RATE = 0.065;

// Approximate 52-week IV range used for IV percentile until historical series is available
const IV52W: Record<string, [number, number]> = {
  NIFTY:     [9.0, 28.0],
  BANKNIFTY: [10.5, 34.0],
  FINNIFTY:  [9.5, 30.0],
  MIDCPNIFTY:[11.0, 32.0],
};
const DEFAULT_IV52W: [number, number] = [8.0, 40.0];

function daysUntil(expiryStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryStr); exp.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((exp.getTime() - today.getTime()) / 86_400_000));
}

// Convert NSE's "dd-Mon-yyyy" expiry string to YYYY-MM-DD
function parseNSEDate(raw: string): string {
  try {
    return new Date(raw).toISOString().split('T')[0];
  } catch {
    return raw;
  }
}

export class NseOptionsAdapter implements OptionChainProvider {
  private cookies = '';
  private lastCookieRefresh = 0;

  private async ensureSession(): Promise<void> {
    const now = Date.now();
    if (this.cookies && now - this.lastCookieRefresh < 5 * 60 * 1000) return;

    const res = await axios.get(NSE_BASE, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockSense/1.0)',
        Accept: 'text/html',
      },
      timeout: 15_000,
    });
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      this.cookies = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : '';
      this.lastCookieRefresh = now;
    }
  }

  private async fetchNSE<T>(url: string, params: Record<string, string>): Promise<T> {
    await this.ensureSession();
    const res = await axios.get<T>(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockSense/1.0)',
        Accept: 'application/json',
        Referer: `${NSE_BASE}/option-chain`,
        Cookie: this.cookies,
      },
      timeout: 20_000,
    });
    return res.data;
  }

  getSupportedSymbols(): string[] {
    return [...INDEX_OPTION_SYMBOLS, 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
      'SBIN', 'WIPRO', 'LT', 'AXISBANK', 'KOTAKBANK', 'BAJFINANCE', 'MARUTI',
      'TATAMOTORS', 'SUNPHARMA', 'HINDUNILVR'];
  }

  async getAvailableExpiries(symbol: string): Promise<string[]> {
    const upper = symbol.toUpperCase();
    const isIndex = (INDEX_OPTION_SYMBOLS as readonly string[]).includes(upper);
    const url = isIndex ? NSE_OPTION_CHAIN_INDICES : NSE_OPTION_CHAIN_EQUITIES;
    const data = await this.fetchNSE<{ records: { expiryDates: string[] } }>(url, { symbol: upper });
    return (data.records.expiryDates ?? []).map(parseNSEDate);
  }

  async getOptionChain(symbol: string, expiry?: string): Promise<OptionChain> {
    const upper = symbol.toUpperCase();
    const isIndex = (INDEX_OPTION_SYMBOLS as readonly string[]).includes(upper);
    const url = isIndex ? NSE_OPTION_CHAIN_INDICES : NSE_OPTION_CHAIN_EQUITIES;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await this.fetchNSE<any>(url, { symbol: upper });
    const records = data.records ?? {};
    void (data.filtered ?? {}); // reserved for future CE/PE totals

    const availableExpiries: string[] = (records.expiryDates ?? []).map(parseNSEDate);
    const selectedExpiry = expiry && availableExpiries.includes(expiry) ? expiry : availableExpiries[0];
    const daysToExpiry = daysUntil(selectedExpiry);
    const T = Math.max(0.0027, daysToExpiry / 365);

    const underlyingPrice: number = records.underlyingValue ?? 0;
    const interval = strikeInterval(upper);
    const atmStrike = findATMStrike(underlyingPrice, interval);
    const lotSize = LOT_SIZES[upper] ?? 500;

    // Filter to the selected expiry, NSE date format may be "dd-Mon-yyyy"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = (records.data ?? []).filter((row: any) => {
      const rowExpiry = parseNSEDate(row.expiryDate ?? '');
      return rowExpiry === selectedExpiry;
    });

    // Build a map: strikePrice → { call, put }
    const strikeMap = new Map<number, { call?: unknown; put?: unknown }>();
    for (const row of rows) {
      const K: number = row.strikePrice;
      if (!strikeMap.has(K)) strikeMap.set(K, {});
      const entry = strikeMap.get(K)!;
      if (row.CE) entry.call = row.CE;
      if (row.PE) entry.put = row.PE;
    }

    const allStrikes: OptionStrikeRow[] = [];
    for (const [K, sides] of [...strikeMap.entries()].sort((a, b) => a[0] - b[0])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ce: any = sides.call ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pe: any = sides.put ?? {};

      const callLTP = ce.lastPrice ?? 0;
      const putLTP = pe.lastPrice ?? 0;
      const callIV = ce.impliedVolatility ?? impliedVolatility(callLTP, underlyingPrice, K, T, RISK_FREE_RATE, 'call') ?? 15;
      const putIV = pe.impliedVolatility ?? impliedVolatility(putLTP, underlyingPrice, K, T, RISK_FREE_RATE, 'put') ?? 15;

      allStrikes.push({
        strikePrice: K,
        call: buildLegFromNSE(ce, 'call', underlyingPrice, K, T, callIV / 100),
        put: buildLegFromNSE(pe, 'put', underlyingPrice, K, T, putIV / 100),
        isATM: K === atmStrike,
      });
    }

    const totalCallOI = allStrikes.reduce((s, r) => s + r.call.oi, 0);
    const totalPutOI = allStrikes.reduce((s, r) => s + r.put.oi, 0);
    const totalCallVolume = allStrikes.reduce((s, r) => s + r.call.volume, 0);
    const totalPutVolume = allStrikes.reduce((s, r) => s + r.put.volume, 0);

    const atmRow = allStrikes.find((r) => r.isATM) ?? allStrikes[Math.floor(allStrikes.length / 2)];
    const atmIV = atmRow ? (atmRow.call.iv + atmRow.put.iv) / 2 : 15;
    const ivRange = IV52W[upper] ?? DEFAULT_IV52W;

    return {
      symbol: upper,
      underlyingPrice,
      atmStrike,
      expiry: selectedExpiry,
      daysToExpiry,
      availableExpiries,
      lotSize,
      strikes: allStrikes,
      totalCallOI,
      totalPutOI,
      totalCallVolume,
      totalPutVolume,
      pcrOI: computePCR(totalPutOI, totalCallOI),
      pcrVolume: computePCR(totalPutVolume, totalCallVolume),
      maxPainStrike: computeMaxPain(allStrikes.map((r) => ({ strikePrice: r.strikePrice, callOI: r.call.oi, putOI: r.put.oi }))),
      ivPercentile: computeIVPercentile(atmIV, ivRange[0], ivRange[1]),
      dataAsOf: new Date().toISOString(),
    };

    // inner helper — intentionally defined inside the async to capture closure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function buildLegFromNSE(raw: any, optionType: 'call' | 'put', S: number, K: number, T: number, sigma: number): OptionLeg {
      const ltp = raw.lastPrice ?? 0;
      const prevClose = raw.pchangeinOpenInterest != null ? ltp : ltp;
      const change = raw.change ?? 0;
      const g = blackScholes({ underlyingPrice: S, strikePrice: K, timeToExpiry: T, riskFreeRate: RISK_FREE_RATE, volatility: Math.max(0.01, sigma), optionType });
      return {
        ltp,
        change,
        changePercent: prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0,
        bid: raw.bidprice ?? +(ltp * 0.995).toFixed(2),
        ask: raw.askPrice ?? +(ltp * 1.005).toFixed(2),
        iv: +(sigma * 100).toFixed(2),
        oi: raw.openInterest ?? 0,
        oiChange: raw.changeinOpenInterest ?? 0,
        volume: raw.totalTradedVolume ?? 0,
        delta: +g.delta.toFixed(4),
        gamma: +g.gamma.toFixed(6),
        theta: +g.theta.toFixed(4),
        vega: +g.vega.toFixed(4),
      };
    }
  }
}
