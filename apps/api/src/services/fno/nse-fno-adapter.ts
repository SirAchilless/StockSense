import axios from 'axios';
import type { FnoDataProvider, RolloverData, FiiDerPositionSummary, ParticipantOIData, FuturesOI, FiiDerPositionDay, ParticipantOIRow } from './types';
import { computeRolloverMetrics, computeCostOfCarry, computeFiiDerSummary } from '../../lib/fno-analytics';

const NSE_BASE = 'https://www.nseindia.com';
const RISK_FREE_RATE = 0.065;

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((d.getTime() - today.getTime()) / 86_400_000));
}

function parseNSEDate(raw: string): string {
  try { return new Date(raw).toISOString().split('T')[0]; } catch { return raw; }
}

// 3-month historical average rollovers (fallback when live data unavailable)
const AVG_ROLLOVER: Record<string, number> = {
  NIFTY: 67.4, BANKNIFTY: 72.1, FINNIFTY: 65.8, MIDCPNIFTY: 63.2,
};

export class NseFnoAdapter implements FnoDataProvider {
  private cookies = '';
  private lastCookieRefresh = 0;

  private async ensureSession(): Promise<void> {
    const now = Date.now();
    if (this.cookies && now - this.lastCookieRefresh < 5 * 60 * 1000) return;
    const res = await axios.get(NSE_BASE, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockSense/1.0)', Accept: 'text/html' },
      timeout: 15_000,
    });
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      this.cookies = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : '';
      this.lastCookieRefresh = now;
    }
  }

  private async fetchNSE<T>(url: string, params?: Record<string, string>): Promise<T> {
    await this.ensureSession();
    const res = await axios.get<T>(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockSense/1.0)',
        Accept: 'application/json',
        Referer: `${NSE_BASE}/market-data/equity-derivatives`,
        Cookie: this.cookies,
      },
      timeout: 20_000,
    });
    return res.data;
  }

  getSupportedSymbols(): string[] {
    return ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY',
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
      'SBIN', 'WIPRO', 'LT', 'AXISBANK', 'KOTAKBANK',
      'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'SUNPHARMA', 'HINDUNILVR'];
  }

  async getRolloverData(symbol: string): Promise<RolloverData> {
    const upper = symbol.toUpperCase();
    // NSE futures OI API: /api/quote-derivative?symbol=NIFTY
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await this.fetchNSE<any>(`${NSE_BASE}/api/quote-derivative`, { symbol: upper });

    const spotPrice: number = data.underlyingValue ?? data.lastPrice ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const futRows: any[] = (data.stocks ?? []).filter((s: any) => s.metadata?.instrumentType === 'Stock Futures'
      || s.metadata?.instrumentType === 'Index Futures');

    // Group by expiry
    const expiryMap = new Map<string, { oi: number; ltp: number; oiChange: number; volume: number }>();
    for (const row of futRows) {
      const expiry = parseNSEDate(row.metadata?.expiryDate ?? '');
      if (!expiry) continue;
      const oi: number = row.marketDeptOrderBook?.tradeInfo?.openInterest ?? 0;
      const ltp: number = row.underlyingValue ?? row.lastPrice ?? 0;
      const oiChange: number = row.marketDeptOrderBook?.tradeInfo?.changeinOpenInterest ?? 0;
      const volume: number = row.marketDeptOrderBook?.tradeInfo?.tradedVolume ?? 0;
      const prev = expiryMap.get(expiry) ?? { oi: 0, ltp, oiChange: 0, volume: 0 };
      expiryMap.set(expiry, { oi: prev.oi + oi, ltp, oiChange: prev.oiChange + oiChange, volume: prev.volume + volume });
    }

    const sortedExpiries = [...expiryMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (sortedExpiries.length < 2) {
      // Fallback to mock if insufficient data
      const { MockFnoAdapter } = await import('./mock-fno-adapter');
      return new MockFnoAdapter().getRolloverData(symbol);
    }

    const [[currentExpiry, currentData], [nextExpiry, nextData]] = sortedExpiries;
    const daysToCurrent = daysUntil(currentExpiry);
    const daysToNext = daysUntil(nextExpiry);

    const allExpiries: FuturesOI[] = sortedExpiries.map(([exp, d]) => {
      const dte = daysUntil(exp);
      const coc = computeCostOfCarry(d.ltp, spotPrice, dte);
      return {
        symbol: upper,
        expiry: exp,
        openInterest: d.oi,
        oiChange: d.oiChange,
        ltp: d.ltp,
        basis: +(d.ltp - spotPrice).toFixed(2),
        costOfCarry: coc,
        volume: d.volume,
      };
    });

    const metrics = computeRolloverMetrics({
      symbol: upper,
      spotPrice,
      currentExpiry,
      nextExpiry,
      daysToCurrentExpiry: daysToCurrent,
      currentMonthOI: currentData.oi,
      nextMonthOI: nextData.oi,
      currentMonthCoC: computeCostOfCarry(currentData.ltp, spotPrice, daysToCurrent),
      nextMonthCoC: computeCostOfCarry(nextData.ltp, spotPrice, daysToNext),
      threeMonthAvgRollover: AVG_ROLLOVER[upper] ?? 70,
      allExpiries,
    });

    return { ...metrics, dataAsOf: new Date().toISOString() };
  }

  async getFiiDerPositions(): Promise<FiiDerPositionSummary> {
    // NSE FII/DII derivatives data: /api/fiiDiiData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await this.fetchNSE<any[]>(`${NSE_BASE}/api/fiiDiiData`);

    const series: FiiDerPositionDay[] = (Array.isArray(data) ? data : []).slice(-10).map((row) => ({
      date: parseNSEDate(row.date ?? ''),
      fiiIndexFutLongOI: row.fiiIndexFutLong ?? 0,
      fiiIndexFutShortOI: row.fiiIndexFutShort ?? 0,
      fiiIndexFutNetOI: (row.fiiIndexFutLong ?? 0) - (row.fiiIndexFutShort ?? 0),
      fiiIndexFutNetBuy: row.fiiIndexFutNetBuy ?? 0,
      fiiStockFutLongOI: row.fiiStockFutLong ?? 0,
      fiiStockFutShortOI: row.fiiStockFutShort ?? 0,
      fiiStockFutNetOI: (row.fiiStockFutLong ?? 0) - (row.fiiStockFutShort ?? 0),
      fiiStockFutNetBuy: row.fiiStockFutNetBuy ?? 0,
      fiiIndexCallOI: row.fiiIndexCallOI ?? 0,
      fiiIndexPutOI: row.fiiIndexPutOI ?? 0,
      fiiIndexOptNetBuy: row.fiiIndexOptNetBuy ?? 0,
      fiiStockOptNetBuy: row.fiiStockOptNetBuy ?? 0,
      diiIndexFutLongOI: row.diiIndexFutLong ?? 0,
      diiIndexFutShortOI: row.diiIndexFutShort ?? 0,
      diiIndexFutNetOI: (row.diiIndexFutLong ?? 0) - (row.diiIndexFutShort ?? 0),
      diiIndexFutNetBuy: row.diiIndexFutNetBuy ?? 0,
    }));

    const summary = computeFiiDerSummary(series);
    return { ...summary, dataAsOf: new Date().toISOString() };
  }

  async getParticipantOI(): Promise<ParticipantOIData> {
    // NSE participant-wise OI: /api/participant-oi
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await this.fetchNSE<any>(`${NSE_BASE}/api/participant-oi`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: ParticipantOIRow[] = (data?.data ?? []).map((r: any) => ({
      category: r.clientType as 'FII' | 'DII' | 'PRO' | 'CLIENT',
      indexFutLong: r.futureIndexLong ?? 0,
      indexFutShort: r.futureIndexShort ?? 0,
      indexFutNetLong: (r.futureIndexLong ?? 0) - (r.futureIndexShort ?? 0),
      stockFutLong: r.futureStockLong ?? 0,
      stockFutShort: r.futureStockShort ?? 0,
      stockFutNetLong: (r.futureStockLong ?? 0) - (r.futureStockShort ?? 0),
      indexCallOI: r.optionIndexCallOI ?? 0,
      indexPutOI: r.optionIndexPutOI ?? 0,
      stockCallOI: r.optionStockCallOI ?? 0,
      stockPutOI: r.optionStockPutOI ?? 0,
    }));

    return {
      rows,
      date: data?.date ? parseNSEDate(data.date) : new Date().toISOString().split('T')[0],
      dataAsOf: new Date().toISOString(),
    };
  }
}
