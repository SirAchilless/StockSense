import type {
  FnOProvider,
  RolloverData,
  ParticipantOI,
  CostOfCarry,
  OITrend,
  PCRData,
} from '@stocksense/market-data';
import { NseFnOAdapter } from './nse-fno-adapter';
import { cache, isMarketOpen, nextMarketOpenMs } from '../../lib/cache';
import { DataUnavailableError } from '../../lib/errors';

export { classifyOITrend, computeCostOfCarry, classifyPCR, PCR_THRESHOLDS } from './analytics';
export type { FnOProvider, RolloverData, ParticipantOI, CostOfCarry, OITrend, PCRData } from '@stocksense/market-data';

// ── Provider factory ─────────────────────────────────────────────────────
let _instance: FnOProvider | null = null;

function createProvider(): FnOProvider {
  const name = (process.env.FNO_PROVIDER ?? 'nse').toLowerCase();
  switch (name) {
    case 'nse': return new NseFnOAdapter();
    // The mock adapter lives in the legacy services/fno module; we bridge here.
    case 'mock': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MockFnoAdapter } = require('../fno/mock-fno-adapter');
      return new MockFnoToV2(new MockFnoAdapter());
    }
    default: return new NseFnOAdapter();
  }
}

export function getFnOProvider(): FnOProvider {
  if (!_instance) _instance = createProvider();
  return _instance;
}

/** TTL for EOD data — until next market open (09:15 IST next trading day). */
function eodTtlMs(): number {
  return Math.max(60_000, nextMarketOpenMs() - Date.now());
}
/** TTL for intraday data — ≤ 15 minutes during market hours; EOD otherwise. */
function intradayTtlMs(): number {
  return isMarketOpen() ? 15 * 60 * 1000 : eodTtlMs();
}

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cache.set(key, value, ttlMs);
  return value;
}

// ── Service methods (cached) ─────────────────────────────────────────────
// These wrap the raw provider with caching and validate that the returned
// data is shaped per the Phase 3.2 contract — a violation becomes a
// DataUnavailableError, never a fabricated number.

function validateRollover(r: RolloverData): void {
  if (r.rolloverPct < 0 || r.rolloverPct > 100) throw new DataUnavailableError('Rollover % out of range');
  if (r.historicalAvgRolloverPct < 0 || r.historicalAvgRolloverPct > 100)
    throw new DataUnavailableError('Historical avg rollover out of range');
}

export const fnoService = {
  async getRolloverData(symbol: string): Promise<RolloverData> {
    const key = `fno:rollover:${symbol.toUpperCase()}`;
    const data = await cached(key, eodTtlMs(), () => getFnOProvider().getRolloverData(symbol.toUpperCase()));
    validateRollover(data);
    return data;
  },

  async getMarketWideRollover(): Promise<RolloverData[]> {
    const data = await cached('fno:rollover:market-wide', eodTtlMs(), () => getFnOProvider().getMarketWideRollover());
    data.forEach(validateRollover);
    return data;
  },

  async getParticipantOI(date: string): Promise<ParticipantOI[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DataUnavailableError(`Invalid date: ${date}`);
    const data = await cached(`fno:poi:${date}`, eodTtlMs(), () => getFnOProvider().getParticipantOI(date));
    if (data.length === 0) throw new DataUnavailableError('No participant OI rows');
    for (const r of data) {
      if (r.longOI < 0 || r.shortOI < 0) throw new DataUnavailableError('Negative OI in participant data');
    }
    return data;
  },

  async getCostOfCarry(symbol: string): Promise<CostOfCarry[]> {
    const data = await cached(`fno:coc:${symbol.toUpperCase()}`, intradayTtlMs(),
      () => getFnOProvider().getCostOfCarry(symbol.toUpperCase()));
    for (const c of data) {
      if (!(c.spotPrice > 0)) throw new DataUnavailableError('Invalid spot price');
      if (!(c.futuresPrice > 0)) throw new DataUnavailableError('Invalid futures price');
    }
    return data;
  },

  async getOITrends(symbol: string, expiry?: string): Promise<OITrend[]> {
    const key = `fno:oi:${symbol.toUpperCase()}:${expiry ?? 'all'}`;
    const data = await cached(key, intradayTtlMs(),
      () => getFnOProvider().getOITrends(symbol.toUpperCase(), expiry));
    if (data.length === 0) throw new DataUnavailableError('No OI trend rows');
    return data;
  },

  async getPCR(symbol: string, expiry?: string): Promise<PCRData> {
    const key = `fno:pcr:${symbol.toUpperCase()}:${expiry ?? 'all'}`;
    const data = await cached(key, intradayTtlMs(),
      () => getFnOProvider().getPCR(symbol.toUpperCase(), expiry));
    if (!(data.pcrOI >= 0)) throw new DataUnavailableError('Invalid PCR value');
    return data;
  },

  async getMarketWidePCR(): Promise<PCRData[]> {
    return cached('fno:pcr:market-wide', intradayTtlMs(), () => getFnOProvider().getMarketWidePCR());
  },
};

// ── Adapter bridge: legacy MockFnoAdapter → new FnOProvider shape ────────
// Allows FNO_PROVIDER=mock for tests / local dev without rewriting the
// mock.  Adapts the Phase-3.2-expected RolloverData shape from the older
// RolloverData type the legacy mock uses.
import type { RolloverData as LegacyRollover } from '../fno/types';

class MockFnoToV2 implements FnOProvider {
  constructor(private legacy: {
    getRolloverData(symbol: string): Promise<LegacyRollover>;
    getFiiDerPositions(): Promise<unknown>;
    getParticipantOI(): Promise<{rows: Array<{
      category: 'FII'|'DII'|'PRO'|'CLIENT';
      indexFutLong: number; indexFutShort: number;
      stockFutLong: number; stockFutShort: number;
      indexCallOI: number; indexPutOI: number;
      stockCallOI: number; stockPutOI: number;
    }>; date: string}>;
  }) {}

  async getRolloverData(symbol: string): Promise<RolloverData> {
    const r = await this.legacy.getRolloverData(symbol);
    return {
      symbol: r.symbol,
      expiryNear: r.currentExpiry,
      expiryNext: r.nextExpiry,
      rolloverPct: r.rolloverPercent,
      rolloverCostBps: +(r.costOfCarryNext - r.costOfCarryCurrent).toFixed(2) * 100,
      historicalAvgRolloverPct: r.threeMonthAvgRollover,
      historicalAvgRolloverCostBps: 25,
    };
  }
  async getMarketWideRollover(): Promise<RolloverData[]> {
    const syms = ['NIFTY','BANKNIFTY','FINNIFTY','MIDCPNIFTY','RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','SBIN','WIPRO','LT','AXISBANK','KOTAKBANK','BAJFINANCE','MARUTI','TATAMOTORS','SUNPHARMA','HINDUNILVR','ITC','ONGC','NTPC','TATASTEEL','HDFCLIFE','SBILIFE','BHARTIARTL','ASIANPAINT','ADANIENT','ADANIPORTS','CIPLA','DRREDDY','EICHERMOT','GRASIM','HEROMOTOCO','HINDALCO','INDUSINDBK','JSWSTEEL','M&M','POWERGRID','TATACONSUM','TECHM','TITAN','ULTRACEMCO','COALINDIA','BPCL','IOC','DIVISLAB','BRITANNIA','UPL','APOLLOHOSP','BAJAJFINSV'];
    return Promise.all(syms.map((s) => this.getRolloverData(s)));
  }
  async getParticipantOI(date: string): Promise<ParticipantOI[]> {
    const p = await this.legacy.getParticipantOI();
    const out: ParticipantOI[] = [];
    for (const r of p.rows) {
      out.push({ date, category: r.category, instrumentType: 'INDEX_FUTURES', longOI: r.indexFutLong, shortOI: r.indexFutShort, netOI: r.indexFutLong - r.indexFutShort });
      out.push({ date, category: r.category, instrumentType: 'STOCK_FUTURES', longOI: r.stockFutLong, shortOI: r.stockFutShort, netOI: r.stockFutLong - r.stockFutShort });
      out.push({ date, category: r.category, instrumentType: 'INDEX_OPTIONS', longOI: r.indexCallOI + r.indexPutOI, shortOI: r.indexCallOI + r.indexPutOI, netOI: 0 });
      out.push({ date, category: r.category, instrumentType: 'STOCK_OPTIONS', longOI: r.stockCallOI + r.stockPutOI, shortOI: r.stockCallOI + r.stockPutOI, netOI: 0 });
    }
    return out;
  }
  async getCostOfCarry(symbol: string): Promise<CostOfCarry[]> {
    const r = await this.legacy.getRolloverData(symbol);
    return r.allExpiries.map((e) => ({
      symbol: r.symbol,
      expiry: e.expiry,
      spotPrice: r.spotPrice,
      futuresPrice: e.ltp,
      costOfCarryPct: e.costOfCarry,
      daysToExpiry: Math.max(1, Math.round((new Date(e.expiry).getTime() - Date.now()) / 86_400_000)),
    }));
  }
  async getOITrends(symbol: string): Promise<OITrend[]> {
    const r = await this.legacy.getRolloverData(symbol);
    return r.allExpiries.map((e) => ({
      symbol: r.symbol,
      expiry: e.expiry,
      currentOI: e.openInterest,
      previousOI: e.openInterest - e.oiChange,
      oiChange: e.oiChange,
      priceChange: (e.basis / r.spotPrice) * 100,
      classification: e.oiChange > 0
        ? (e.basis > 0 ? 'LONG_BUILDUP' as const : 'SHORT_BUILDUP' as const)
        : (e.basis > 0 ? 'SHORT_UNWINDING' as const : 'LONG_UNWINDING' as const),
    }));
  }
  async getPCR(_symbol: string): Promise<PCRData> {
    return { symbol: _symbol, expiry: 'ALL', pcrOI: 1.05, pcrVolume: 0.98, timestamp: new Date().toISOString() };
  }
  async getMarketWidePCR(): Promise<PCRData[]> {
    return [
      { symbol: 'NIFTY', expiry: 'ALL', pcrOI: 1.05, pcrVolume: 0.98, timestamp: new Date().toISOString() },
      { symbol: 'BANKNIFTY', expiry: 'ALL', pcrOI: 0.92, pcrVolume: 0.88, timestamp: new Date().toISOString() },
    ];
  }
}
