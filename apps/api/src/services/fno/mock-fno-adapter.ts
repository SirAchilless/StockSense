import type {
  FnoDataProvider,
  RolloverData,
  FiiDerPositionSummary,
  ParticipantOIData,
  FuturesOI,
  FiiDerPositionDay,
  ParticipantOIRow,
  PCRData,
  OITrend,
  CostOfCarryItem,
} from './types';
import { ALL_FNO_SYMBOLS } from './types';
import {
  computeRolloverMetrics,
  computeCostOfCarry,
  computeFiiDerSummary,
  classifyOITrend,
} from '../../lib/fno-analytics';

// Realistic mock spot prices (mirrors market-data mock)
const MOCK_PRICES: Record<string, number> = {
  NIFTY: 22453.3,
  BANKNIFTY: 48321.6,
  FINNIFTY: 21847.5,
  MIDCPNIFTY: 12634.2,
  RELIANCE: 2456.75,
  TCS: 3841.2,
  HDFCBANK: 1624.8,
  INFY: 1763.9,
  ICICIBANK: 1247.6,
  SBIN: 821.45,
  WIPRO: 524.15,
  LT: 3634.7,
  AXISBANK: 1089.3,
  KOTAKBANK: 1923.4,
  BAJFINANCE: 7124.0,
  MARUTI: 12840.0,
  TATAMOTORS: 948.3,
  SUNPHARMA: 1634.8,
  HINDUNILVR: 2534.6,
};

// 3-month historical average rollover % per symbol (realistic NSE ranges)
const AVG_ROLLOVER: Record<string, number> = {
  NIFTY: 67.4,
  BANKNIFTY: 72.1,
  FINNIFTY: 65.8,
  MIDCPNIFTY: 63.2,
  RELIANCE: 78.3,
  TCS: 71.5,
  HDFCBANK: 74.8,
  INFY: 70.2,
  ICICIBANK: 76.1,
  SBIN: 79.4,
  WIPRO: 68.7,
  LT: 72.9,
  AXISBANK: 75.3,
  KOTAKBANK: 73.6,
  BAJFINANCE: 80.1,
  MARUTI: 67.8,
  TATAMOTORS: 82.4,
  SUNPHARMA: 69.3,
  HINDUNILVR: 64.5,
};

// Upcoming NSE futures expiry dates (last Thursday of each month)
function lastThursdayOfMonth(year: number, month: number): string {
  // month: 1-12
  const d = new Date(year, month, 0); // last day of month
  while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getNextThreeExpiries(): [string, string, string] {
  const now = new Date();
  const results: string[] = [];
  let y = now.getFullYear();
  let m = now.getMonth() + 1; // 1-based
  while (results.length < 3) {
    const exp = lastThursdayOfMonth(y, m);
    if (new Date(exp) > now) results.push(exp);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return results as [string, string, string];
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((d.getTime() - today.getTime()) / 86_400_000));
}

export class MockFnoAdapter implements FnoDataProvider {
  getSupportedSymbols(): string[] {
    return [...ALL_FNO_SYMBOLS];
  }

  async getRolloverData(symbol: string): Promise<RolloverData> {
    const upper = symbol.toUpperCase();
    const spot = MOCK_PRICES[upper] ?? 1000;
    const [currentExpiry, nextExpiry, farExpiry] = getNextThreeExpiries();
    const daysToCurrent = daysUntil(currentExpiry);
    const daysToNext = daysUntil(nextExpiry);
    const daysToFar = daysUntil(farExpiry);

    const avgRollover = AVG_ROLLOVER[upper] ?? 70;
    // This session's rollover is slightly above average (reflecting a risk-on session)
    const currentRolloverPct = +(avgRollover + (Math.random() > 0.5 ? 2.3 : -1.8)).toFixed(1);

    const baseOI = upper === 'NIFTY' ? 1_800_000 : upper === 'BANKNIFTY' ? 900_000 : 150_000;
    const currentMonthOI = Math.round(baseOI * (1 - currentRolloverPct / 100));
    const nextMonthOI = Math.round(baseOI * (currentRolloverPct / 100) * 0.85);
    const farMonthOI = Math.round(baseOI * 0.05);

    const coCurrent = computeCostOfCarry(spot * 1.0025, spot, daysToCurrent);
    const coNext = computeCostOfCarry(spot * 1.0048, spot, daysToNext);
    const coFar = computeCostOfCarry(spot * 1.0072, spot, daysToFar);

    const allExpiries: FuturesOI[] = [
      {
        symbol: upper,
        expiry: currentExpiry,
        openInterest: currentMonthOI,
        oiChange: -Math.round(currentMonthOI * 0.08),
        ltp: +(spot * 1.0025).toFixed(2),
        basis: +(spot * 0.0025).toFixed(2),
        costOfCarry: coCurrent,
        volume: Math.round(currentMonthOI * 0.4),
      },
      {
        symbol: upper,
        expiry: nextExpiry,
        openInterest: nextMonthOI,
        oiChange: Math.round(nextMonthOI * 0.12),
        ltp: +(spot * 1.0048).toFixed(2),
        basis: +(spot * 0.0048).toFixed(2),
        costOfCarry: coNext,
        volume: Math.round(nextMonthOI * 0.3),
      },
      {
        symbol: upper,
        expiry: farExpiry,
        openInterest: farMonthOI,
        oiChange: Math.round(farMonthOI * 0.04),
        ltp: +(spot * 1.0072).toFixed(2),
        basis: +(spot * 0.0072).toFixed(2),
        costOfCarry: coFar,
        volume: Math.round(farMonthOI * 0.1),
      },
    ];

    const metrics = computeRolloverMetrics({
      symbol: upper,
      spotPrice: spot,
      currentExpiry,
      nextExpiry,
      daysToCurrentExpiry: daysToCurrent,
      currentMonthOI,
      nextMonthOI,
      currentMonthCoC: coCurrent,
      nextMonthCoC: coNext,
      threeMonthAvgRollover: avgRollover,
      allExpiries,
    });

    return { ...metrics, dataAsOf: new Date().toISOString() };
  }

  async getFiiDerPositions(): Promise<FiiDerPositionSummary> {
    const now = new Date();
    const series: FiiDerPositionDay[] = [];

    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const day = d.getDay();
      // Skip weekends
      if (day === 0 || day === 6) continue;

      const dateStr = d.toISOString().split('T')[0];
      const trend = i < 5 ? 1 : -1; // recent days bullish, older bearish

      series.push({
        date: dateStr,
        fiiIndexFutLongOI: 280_000 + i * 2000 * trend,
        fiiIndexFutShortOI: 240_000 - i * 1500 * trend,
        fiiIndexFutNetOI: 40_000 + i * 3500 * trend,
        fiiIndexFutNetBuy: +(2400 + i * 180 * trend).toFixed(0),
        fiiStockFutLongOI: 420_000 + i * 1200 * trend,
        fiiStockFutShortOI: 380_000 - i * 800 * trend,
        fiiStockFutNetOI: 40_000 + i * 2000 * trend,
        fiiStockFutNetBuy: +(1800 + i * 120 * trend).toFixed(0),
        fiiIndexCallOI: 180_000 + i * 900,
        fiiIndexPutOI: 210_000 + i * 1100,
        fiiIndexOptNetBuy: +(650 + i * 80 * trend).toFixed(0),
        fiiStockOptNetBuy: +(320 + i * 40 * trend).toFixed(0),
        diiIndexFutLongOI: 120_000 + i * 400,
        diiIndexFutShortOI: 110_000 + i * 200,
        diiIndexFutNetOI: 10_000 + i * 200,
        diiIndexFutNetBuy: +(800 + i * 50).toFixed(0),
      });
    }

    const summary = computeFiiDerSummary(series);
    return { ...summary, dataAsOf: new Date().toISOString() };
  }

  async getParticipantOI(): Promise<ParticipantOIData> {
    const now = new Date();
    const rows: ParticipantOIRow[] = [
      {
        category: 'FII',
        indexFutLong: 284_000,
        indexFutShort: 238_000,
        indexFutNetLong: 46_000,
        stockFutLong: 425_000,
        stockFutShort: 378_000,
        stockFutNetLong: 47_000,
        indexCallOI: 182_000,
        indexPutOI: 214_000,
        stockCallOI: 95_000,
        stockPutOI: 88_000,
      },
      {
        category: 'DII',
        indexFutLong: 122_000,
        indexFutShort: 108_000,
        indexFutNetLong: 14_000,
        stockFutLong: 98_000,
        stockFutShort: 91_000,
        stockFutNetLong: 7_000,
        indexCallOI: 42_000,
        indexPutOI: 38_000,
        stockCallOI: 28_000,
        stockPutOI: 24_000,
      },
      {
        category: 'PRO',
        indexFutLong: 380_000,
        indexFutShort: 392_000,
        indexFutNetLong: -12_000,
        stockFutLong: 560_000,
        stockFutShort: 574_000,
        stockFutNetLong: -14_000,
        indexCallOI: 620_000,
        indexPutOI: 580_000,
        stockCallOI: 310_000,
        stockPutOI: 295_000,
      },
      {
        category: 'CLIENT',
        indexFutLong: 890_000,
        indexFutShort: 938_000,
        indexFutNetLong: -48_000,
        stockFutLong: 1_240_000,
        stockFutShort: 1_295_000,
        stockFutNetLong: -55_000,
        indexCallOI: 1_100_000,
        indexPutOI: 1_050_000,
        stockCallOI: 680_000,
        stockPutOI: 640_000,
      },
    ];

    return {
      rows,
      date: now.toISOString().split('T')[0],
      dataAsOf: now.toISOString(),
    };
  }

  async getCostOfCarry(symbol: string): Promise<CostOfCarryItem[]> {
    const upper = symbol.toUpperCase();
    const spot = MOCK_PRICES[upper] ?? 1000;
    const [exp1, exp2, exp3] = getNextThreeExpiries();
    const premiums = [0.0025, 0.0048, 0.0072];
    return [exp1, exp2, exp3].map((expiry, i) => {
      const daysToExpiry = daysUntil(expiry);
      const futuresPrice = +(spot * (1 + premiums[i])).toFixed(2);
      return {
        symbol: upper,
        expiry,
        spotPrice: spot,
        futuresPrice,
        costOfCarryPct: computeCostOfCarry(futuresPrice, spot, daysToExpiry),
        daysToExpiry,
      };
    });
  }

  async getOITrends(symbol: string, expiry?: string): Promise<OITrend[]> {
    const upper = symbol.toUpperCase();
    const [exp1, exp2, exp3] = getNextThreeExpiries();
    const expiries = expiry ? [expiry] : [exp1, exp2, exp3];
    const baseOI = upper === 'NIFTY' ? 1_800_000 : upper === 'BANKNIFTY' ? 900_000 : 150_000;
    return expiries.map((exp, i) => {
      const currentOI = Math.round(baseOI * (0.5 - i * 0.15));
      const oiChange = Math.round(currentOI * (i % 2 === 0 ? 0.05 : -0.03));
      const priceChange = i % 2 === 0 ? 45.3 : -22.1;
      return {
        symbol: upper,
        expiry: exp,
        currentOI,
        previousOI: currentOI - oiChange,
        oiChange,
        priceChange,
        classification: classifyOITrend({ oiChange, priceChange }),
      };
    });
  }

  async getPCR(symbol: string, expiry?: string): Promise<PCRData> {
    const upper = symbol.toUpperCase();
    // Mock PCR values are in the bullish-neutral range (0.8–1.2) for index, wider for stocks
    const isIndex = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'].includes(upper);
    const pcrOI = isIndex
      ? +(0.85 + Math.random() * 0.3).toFixed(3)
      : +(0.6 + Math.random() * 0.6).toFixed(3);
    const pcrVolume = +(pcrOI * 0.9 + Math.random() * 0.1).toFixed(3);
    return {
      symbol: upper,
      expiry: expiry ?? 'ALL',
      pcrOI,
      pcrVolume,
      timestamp: new Date().toISOString(),
    };
  }

  async getMarketWidePCR(): Promise<PCRData[]> {
    const indexSymbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];
    return Promise.all(indexSymbols.map((s) => this.getPCR(s)));
  }

  async getMarketWideRollover(): Promise<RolloverData[]> {
    return Promise.all(ALL_FNO_SYMBOLS.map((s) => this.getRolloverData(s)));
  }
}
