import type {
  MarketDataProvider, IndexSymbol, IndexQuote, MarketStatusInfo,
  StockQuote, StockFundamentals, OHLCBar, Timeframe,
  GlobalSymbol, GlobalQuote, GlobalCategory,
  MarketBreadthData, BreadthStock, FiiDiiActivity,
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

type GlobalFixture = Omit<GlobalQuote, 'lastUpdated'>;

const GLOBAL_FIXTURES: Record<GlobalSymbol, GlobalFixture> = {
  DOW:      { symbol: 'DOW',      name: 'Dow Jones Industrial Average', category: 'equity',    price: 38942.10, change: 234.50,   changePercent:  0.61,  currency: 'USD' },
  NASDAQ:   { symbol: 'NASDAQ',   name: 'NASDAQ Composite',             category: 'equity',    price: 17483.24, change: -89.12,   changePercent: -0.51,  currency: 'USD' },
  SP500:    { symbol: 'SP500',    name: 'S&P 500',                      category: 'equity',    price:  5304.72, change:  18.91,   changePercent:  0.36,  currency: 'USD' },
  NIKKEI:   { symbol: 'NIKKEI',   name: 'Nikkei 225',                   category: 'equity',    price: 38437.10, change: 312.60,   changePercent:  0.82,  currency: 'JPY' },
  HANGSENG: { symbol: 'HANGSENG', name: 'Hang Seng',                    category: 'equity',    price: 18403.40, change: -156.20,  changePercent: -0.84,  currency: 'HKD' },
  DAX:      { symbol: 'DAX',      name: 'DAX 40',                       category: 'equity',    price: 18507.30, change:  97.40,   changePercent:  0.53,  currency: 'EUR' },
  CRUDE_OIL:{ symbol: 'CRUDE_OIL',name: 'Crude Oil (WTI)',              category: 'commodity', price:    78.45, change:  -1.23,   changePercent: -1.54,  currency: 'USD' },
  GOLD:     { symbol: 'GOLD',     name: 'Gold',                         category: 'commodity', price:  2341.80, change:  11.60,   changePercent:  0.50,  currency: 'USD' },
  SILVER:   { symbol: 'SILVER',   name: 'Silver',                       category: 'commodity', price:    29.42, change:   0.34,   changePercent:  1.17,  currency: 'USD' },
  USD_INR:  { symbol: 'USD_INR',  name: 'USD / INR',                    category: 'forex',     price:    83.52, change:   0.12,   changePercent:  0.14,  currency: 'INR' },
  DXY:      { symbol: 'DXY',      name: 'US Dollar Index',              category: 'forex',     price:   104.23, change:  -0.31,   changePercent: -0.30,  currency: 'USD' },
  BTC_USD:  { symbol: 'BTC_USD',  name: 'Bitcoin',                      category: 'crypto',    price: 63241.00, change: 1243.00,  changePercent:  2.00,  currency: 'USD' },
  ETH_USD:  { symbol: 'ETH_USD',  name: 'Ethereum',                     category: 'crypto',    price:  3087.50, change:  -42.30,  changePercent: -1.35,  currency: 'USD' },
};

// Real sector mapping for common NSE symbols — keeps mock portfolio analytics
// (sector allocation, diversification) meaningful rather than single-sector.
const MOCK_SECTORS: Record<string, string> = {
  TCS: 'Information Technology', INFY: 'Information Technology', WIPRO: 'Information Technology', HCLTECH: 'Information Technology', TECHM: 'Information Technology',
  HDFCBANK: 'Banking', ICICIBANK: 'Banking', SBIN: 'Banking', KOTAKBANK: 'Banking', AXISBANK: 'Banking',
  RELIANCE: 'Energy', ONGC: 'Energy', NTPC: 'Energy', POWERGRID: 'Energy', COALINDIA: 'Energy',
  SUNPHARMA: 'Pharmaceuticals', DRREDDY: 'Pharmaceuticals', CIPLA: 'Pharmaceuticals', DIVISLAB: 'Pharmaceuticals',
  HINDUNILVR: 'FMCG', ITC: 'FMCG', NESTLEIND: 'FMCG', BRITANNIA: 'FMCG', DABUR: 'FMCG',
  MARUTI: 'Automobile', TATAMOTORS: 'Automobile', M_M: 'Automobile', BAJAJ_AUTO: 'Automobile', EICHERMOT: 'Automobile',
  TATASTEEL: 'Metals', JSWSTEEL: 'Metals', HINDALCO: 'Metals', VEDL: 'Metals',
  LT: 'Infrastructure', ULTRACEMCO: 'Cement', GRASIM: 'Cement', SHREECEM: 'Cement',
  BHARTIARTL: 'Telecom', ZOMATO: 'Consumer Services', DMART: 'Retail',
};

const MOCK_INDUSTRIES: Record<string, string> = {
  'Information Technology': 'IT Services',
  Banking: 'Private/Public Sector Banks',
  Energy: 'Oil, Gas & Power',
  Pharmaceuticals: 'Drugs & Pharma',
  FMCG: 'Consumer Staples',
  Automobile: 'Auto & Ancillaries',
  Metals: 'Metals & Mining',
  Infrastructure: 'Engineering & Construction',
  Cement: 'Cement & Products',
  Telecom: 'Telecom Services',
  'Consumer Services': 'Online Services',
  Retail: 'Retailing',
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
    // Map common NSE symbols to their real sectors so portfolio-level features
    // (sector allocation, diversification scoring) are demonstrable on mock data.
    const sector = MOCK_SECTORS[symbol.toUpperCase()] ?? 'Information Technology';
    const industry = MOCK_INDUSTRIES[sector] ?? 'Diversified';
    return {
      symbol,
      name: `${symbol} Ltd`,
      sector,
      industry,
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

  async getGlobalQuotes(symbols: GlobalSymbol[]): Promise<GlobalQuote[]> {
    return symbols.map((s) => ({
      ...GLOBAL_FIXTURES[s],
      lastUpdated: new Date().toISOString(),
    }));
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

  async getMarketBreadth(): Promise<MarketBreadthData> {
    const now = new Date();

    const gainers: BreadthStock[] = [
      { symbol: 'TATAMOTORS',  name: 'Tata Motors Ltd',          price: 948.30,  change:  47.20,  changePercent:  5.24, volume: 18432100 },
      { symbol: 'ADANIENT',    name: 'Adani Enterprises Ltd',     price: 2876.50, change: 121.40,  changePercent:  4.41, volume:  4213800 },
      { symbol: 'BAJFINANCE',  name: 'Bajaj Finance Ltd',         price: 7124.00, change: 284.50,  changePercent:  4.16, volume:  3184200 },
      { symbol: 'HDFCBANK',    name: 'HDFC Bank Ltd',             price: 1624.80, change:  52.30,  changePercent:  3.32, volume: 12847300 },
      { symbol: 'WIPRO',       name: 'Wipro Ltd',                 price:  524.15, change:  16.45,  changePercent:  3.24, volume:  9234100 },
      { symbol: 'INFY',        name: 'Infosys Ltd',               price: 1763.90, change:  52.10,  changePercent:  3.04, volume:  7843200 },
      { symbol: 'MARUTI',      name: 'Maruti Suzuki India Ltd',   price: 12840.00,change: 356.00,  changePercent:  2.85, volume:   892400 },
      { symbol: 'LT',          name: 'Larsen & Toubro Ltd',       price: 3634.70, change:  89.50,  changePercent:  2.52, volume:  2341500 },
      { symbol: 'SBIN',        name: 'State Bank of India',       price:  821.45, change:  18.95,  changePercent:  2.36, volume: 21847300 },
      { symbol: 'ICICIBANK',   name: 'ICICI Bank Ltd',            price: 1247.60, change:  26.40,  changePercent:  2.16, volume: 10234800 },
    ];

    const losers: BreadthStock[] = [
      { symbol: 'ONGC',        name: 'Oil & Natural Gas Corp',    price:  271.30, change: -16.80,  changePercent: -5.83, volume: 24312700 },
      { symbol: 'POWERGRID',   name: 'Power Grid Corp of India',  price:  321.40, change: -16.90,  changePercent: -5.00, volume:  8234600 },
      { symbol: 'COALINDIA',   name: 'Coal India Ltd',            price:  453.20, change: -21.30,  changePercent: -4.49, volume: 11234500 },
      { symbol: 'NTPC',        name: 'NTPC Ltd',                  price:  378.90, change: -15.60,  changePercent: -3.96, volume:  9876500 },
      { symbol: 'SUNPHARMA',   name: 'Sun Pharmaceutical Ind',    price: 1634.80, change: -57.20,  changePercent: -3.38, volume:  4213800 },
      { symbol: 'DRREDDY',     name: "Dr. Reddy's Laboratories",  price: 5847.30, change:-178.40,  changePercent: -2.96, volume:  1234700 },
      { symbol: 'HINDUNILVR',  name: 'Hindustan Unilever Ltd',    price: 2534.60, change: -68.90,  changePercent: -2.65, volume:  2341800 },
      { symbol: 'ITC',         name: 'ITC Ltd',                   price:  487.35, change: -11.85,  changePercent: -2.37, volume: 18234700 },
      { symbol: 'BRITANNIA',   name: 'Britannia Industries Ltd',  price: 5213.40, change:-109.60,  changePercent: -2.06, volume:   783400 },
      { symbol: 'NESTLEIND',   name: 'Nestlé India Ltd',          price: 2387.50, change: -43.20,  changePercent: -1.78, volume:   432100 },
    ];

    // Generate 5 days of FII/DII data ending today
    const fiiDii: FiiDiiActivity[] = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (4 - i));
      // Skip weekends — shift to Friday
      const day = date.getDay();
      if (day === 0) date.setDate(date.getDate() - 2);
      if (day === 6) date.setDate(date.getDate() - 1);
      const fiiBuy  = 8000 + (i * 300);
      const fiiSell = 9200 + (i * 150);
      const diiBuy  = 7500 + (i * 200);
      const diiSell = 5800 + (i * 100);
      return {
        date: date.toISOString().split('T')[0],
        fiiNetBuy: +(fiiBuy - fiiSell).toFixed(2),
        diiNetBuy: +(diiBuy - diiSell).toFixed(2),
        fiiGrossBuy:  +fiiBuy.toFixed(2),
        fiiGrossSell: +fiiSell.toFixed(2),
        diiGrossBuy:  +diiBuy.toFixed(2),
        diiGrossSell: +diiSell.toFixed(2),
      };
    });

    return {
      advanceDecline: {
        advances: 1134,
        declines:  892,
        unchanged:  74,
        total:    2100,
        advanceDeclineRatio: +(1134 / 892).toFixed(2),
      },
      topGainers: gainers,
      topLosers: losers,
      sectorPerformance: [
        { sector: 'Information Technology', changePercent:  2.84, advances: 18, declines:  4 },
        { sector: 'Financials',             changePercent:  1.92, advances: 24, declines:  8 },
        { sector: 'Auto',                   changePercent:  2.31, advances: 12, declines:  3 },
        { sector: 'Consumer Discretionary', changePercent:  0.74, advances: 14, declines:  9 },
        { sector: 'Metals & Mining',        changePercent: -0.43, advances:  9, declines: 13 },
        { sector: 'Pharma',                 changePercent: -1.87, advances:  7, declines: 16 },
        { sector: 'Energy',                 changePercent: -2.64, advances:  5, declines: 18 },
        { sector: 'FMCG',                   changePercent: -1.12, advances:  8, declines: 14 },
        { sector: 'Realty',                 changePercent:  1.03, advances: 10, declines:  6 },
        { sector: 'Telecom',                changePercent:  0.38, advances:  6, declines:  5 },
      ],
      fiiDii,
      dataAsOf: now.toISOString(),
    };
  }
}
