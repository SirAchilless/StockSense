import type {
  MarketDataProvider, IndexSymbol, IndexQuote, MarketStatusInfo,
  StockQuote, StockFundamentals, OHLCBar, Timeframe
} from './types';

// Determine if Indian market is currently open
// NSE hours: Mon–Fri, 09:15–15:30 IST (UTC+5:30)
function getMarketStatus(): MarketStatusInfo {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay(); // 0=Sun, 6=Sat
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 15;  // 9:15
  const marketClose = 15 * 60 + 30; // 15:30

  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = timeInMinutes >= marketOpen && timeInMinutes < marketClose;

  if (isWeekday && isMarketHours) {
    return { status: 'open', nextOpenAt: null, previousClose: null };
  }

  // Calculate next open
  const nextOpen = new Date(ist);
  if (!isWeekday || timeInMinutes >= marketClose) {
    nextOpen.setDate(nextOpen.getDate() + (day === 5 ? 3 : day === 6 ? 2 : 1));
  }
  nextOpen.setHours(9, 15, 0, 0);

  return {
    status: 'closed',
    nextOpenAt: nextOpen.toISOString(),
    previousClose: new Date(ist.setHours(15, 30, 0, 0)).toISOString(),
  };
}

const INDEX_FIXTURES: Record<IndexSymbol, Omit<IndexQuote, 'lastUpdated'>> = {
  NIFTY50: {
    symbol: 'NIFTY50', name: 'NIFTY 50',
    price: 22453.30, change: 187.45, changePercent: 0.84,
    dayHigh: 22510.80, dayLow: 22298.60, previousClose: 22265.85,
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY', name: 'BANK NIFTY',
    price: 48321.60, change: -124.30, changePercent: -0.26,
    dayHigh: 48620.00, dayLow: 48180.50, previousClose: 48445.90,
  },
  SENSEX: {
    symbol: 'SENSEX', name: 'BSE SENSEX',
    price: 73847.15, change: 612.20, changePercent: 0.84,
    dayHigh: 74052.30, dayLow: 73461.10, previousClose: 73234.95,
  },
  INDIAVIX: {
    symbol: 'INDIAVIX', name: 'India VIX',
    price: 13.42, change: -0.31, changePercent: -2.26,
    dayHigh: 13.95, dayLow: 13.20, previousClose: 13.73,
  },
};

export class MockMarketDataAdapter implements MarketDataProvider {
  async getIndexQuotes(symbols: IndexSymbol[]): Promise<IndexQuote[]> {
    return symbols.map((s) => ({
      ...INDEX_FIXTURES[s],
      lastUpdated: new Date().toISOString(),
    }));
  }

  async getMarketStatus(): Promise<MarketStatusInfo> {
    return getMarketStatus();
  }

  async getStockQuote(symbol: string): Promise<StockQuote> {
    return {
      symbol,
      name: `${symbol} Ltd`,
      price: 2456.75,
      change: 34.20,
      changePercent: 1.41,
      dayHigh: 2478.90,
      dayLow: 2418.30,
      volume: 4523891,
      previousClose: 2422.55,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getStockFundamentals(symbol: string): Promise<StockFundamentals> {
    return {
      symbol,
      name: `${symbol} Ltd`,
      sector: 'Information Technology',
      industry: 'IT Services',
      marketCap: 1234567890000,
      pe: 28.4,
      pb: 9.2,
      roe: 32.1,
      roce: 41.5,
      eps: 86.43,
      debtToEquity: 0.02,
      dividendYield: 1.8,
      week52High: 2890.0,
      week52Low: 1820.0,
      dataAsOf: new Date().toISOString(),
    };
  }

  async getOHLC(symbol: string, timeframe: Timeframe): Promise<OHLCBar[]> {
    const bars: OHLCBar[] = [];
    const count = timeframe === '1D' ? 78 : timeframe === '1W' ? 5 : timeframe === '1M' ? 22 : 252;
    let price = 2456.75;
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      price = price * (1 + (Math.random() - 0.5) * 0.02);
      const open = price * (1 + (Math.random() - 0.5) * 0.005);
      const high = Math.max(open, price) * (1 + Math.random() * 0.01);
      const low = Math.min(open, price) * (1 - Math.random() * 0.01);
      bars.push({
        time: date.toISOString().split('T')[0],
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +price.toFixed(2),
        volume: Math.floor(Math.random() * 5000000 + 1000000),
      });
    }
    return bars;
  }
}
