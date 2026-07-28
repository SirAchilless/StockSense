import axios from 'axios';
import type {
  MarketDataProvider, IndexSymbol, IndexQuote, MarketStatusInfo,
  StockQuote, StockFundamentals, OHLCBar, Timeframe,
  GlobalSymbol, GlobalQuote,
} from './types';
import { MockMarketDataAdapter } from './mock-adapter';

// Alpha Vantage symbol mapping for Indian indices/stocks
// AV uses BSE suffix for NSE-listed stocks: e.g. RELIANCE.BSE
const INDEX_AV_SYMBOLS: Record<IndexSymbol, string> = {
  NIFTY50: 'NIFTY.BSE',
  BANKNIFTY: 'BANKNIFTY.BSE',
  SENSEX: 'SENSEX.BSE',
  INDIAVIX: 'INDIAVIX.BSE',
};

const INDEX_NAMES: Record<IndexSymbol, string> = {
  NIFTY50: 'NIFTY 50',
  BANKNIFTY: 'BANK NIFTY',
  SENSEX: 'BSE SENSEX',
  INDIAVIX: 'India VIX',
};

const TIMEFRAME_AV: Record<Timeframe, { function: string; outputsize?: string }> = {
  '1D': { function: 'TIME_SERIES_INTRADAY', outputsize: 'compact' },
  '1W': { function: 'TIME_SERIES_DAILY', outputsize: 'compact' },
  '1M': { function: 'TIME_SERIES_DAILY', outputsize: 'compact' },
  '1Y': { function: 'TIME_SERIES_DAILY', outputsize: 'full' },
};

export class AlphaVantageAdapter implements MarketDataProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private readonly mock = new MockMarketDataAdapter();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(params: Record<string, string>): Promise<T> {
    const response = await axios.get<T>(this.baseUrl, {
      params: { ...params, apikey: this.apiKey },
      timeout: 10_000,
    });
    return response.data;
  }

  async getIndexQuotes(symbols: IndexSymbol[]): Promise<IndexQuote[]> {
    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const avSym = INDEX_AV_SYMBOLS[sym];
        const data = await this.fetch<Record<string, unknown>>({
          function: 'GLOBAL_QUOTE',
          symbol: avSym,
        });
        const q = data['Global Quote'] as Record<string, string> | undefined;
        if (!q || !q['05. price']) throw new Error(`No data for ${sym}`);
        return {
          symbol: sym,
          name: INDEX_NAMES[sym],
          price: parseFloat(q['05. price']),
          change: parseFloat(q['09. change']),
          changePercent: parseFloat(q['10. change percent'].replace('%', '')),
          dayHigh: parseFloat(q['03. high']),
          dayLow: parseFloat(q['04. low']),
          previousClose: parseFloat(q['08. previous close']),
          lastUpdated: new Date().toISOString(),
        } satisfies IndexQuote;
      })
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.warn(`[AlphaVantage] getIndexQuotes fallback for ${symbols[i]}: ${(r.reason as Error).message}`);
      return {
        symbol: symbols[i],
        name: INDEX_NAMES[symbols[i]],
        price: 0,
        change: 0,
        changePercent: 0,
        dayHigh: 0,
        dayLow: 0,
        previousClose: 0,
        lastUpdated: new Date().toISOString(),
      } as IndexQuote;
    });
  }

  async getMarketStatus(): Promise<MarketStatusInfo> {
    // Alpha Vantage doesn't have a market status endpoint — delegate to mock logic
    return this.mock.getMarketStatus();
  }

  async getStockQuote(symbol: string): Promise<StockQuote> {
    const avSym = `${symbol}.BSE`;
    const data = await this.fetch<Record<string, unknown>>({
      function: 'GLOBAL_QUOTE',
      symbol: avSym,
    });
    const q = data['Global Quote'] as Record<string, string> | undefined;
    if (!q || !q['05. price']) throw new Error(`No quote data for ${symbol}`);
    return {
      symbol,
      name: symbol,
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      changePercent: parseFloat(q['10. change percent'].replace('%', '')),
      dayHigh: parseFloat(q['03. high']),
      dayLow: parseFloat(q['04. low']),
      volume: parseInt(q['06. volume'], 10),
      previousClose: parseFloat(q['08. previous close']),
      lastUpdated: new Date().toISOString(),
    };
  }

  async getStockFundamentals(symbol: string): Promise<StockFundamentals> {
    const avSym = `${symbol}.BSE`;
    const data = await this.fetch<Record<string, unknown>>({
      function: 'OVERVIEW',
      symbol: avSym,
    });
    const d = data as Record<string, string>;
    if (!d['Symbol']) throw new Error(`No fundamentals for ${symbol}`);

    const parseOrNull = (v: string | undefined) =>
      v && v !== 'None' && v !== '-' ? parseFloat(v) : null;

    return {
      symbol,
      name: d['Name'] ?? symbol,
      sector: d['Sector'] ?? null,
      industry: d['Industry'] ?? null,
      marketCap: parseOrNull(d['MarketCapitalization']),
      pe: parseOrNull(d['PERatio']),
      pb: parseOrNull(d['PriceToBookRatio']),
      roe: parseOrNull(d['ReturnOnEquityTTM']),
      roce: null, // Not available from Alpha Vantage
      eps: parseOrNull(d['EPS']),
      debtToEquity: null, // Not directly in AV OVERVIEW
      dividendYield: parseOrNull(d['DividendYield']),
      week52High: parseOrNull(d['52WeekHigh']),
      week52Low: parseOrNull(d['52WeekLow']),
      dataAsOf: new Date().toISOString(),
    };
  }

  async getOHLC(symbol: string, timeframe: Timeframe): Promise<OHLCBar[]> {
    const avSym = `${symbol}.BSE`;
    const avParams = TIMEFRAME_AV[timeframe];
    const params: Record<string, string> = {
      function: avParams.function,
      symbol: avSym,
    };
    if (avParams.outputsize) params['outputsize'] = avParams.outputsize;
    if (avParams.function === 'TIME_SERIES_INTRADAY') params['interval'] = '5min';

    const data = await this.fetch<Record<string, unknown>>(params);
    const seriesKey = Object.keys(data).find((k) => k.startsWith('Time Series'));
    if (!seriesKey) throw new Error(`No OHLC data for ${symbol}`);

    const series = data[seriesKey] as Record<string, Record<string, string>>;
    return Object.entries(series)
      .map(([time, bar]) => ({
        time,
        open: parseFloat(bar['1. open']),
        high: parseFloat(bar['2. high']),
        low: parseFloat(bar['3. low']),
        close: parseFloat(bar['4. close']),
        volume: parseInt(bar['5. volume'], 10),
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  async getGlobalQuotes(symbols: GlobalSymbol[]): Promise<GlobalQuote[]> {
    // Alpha Vantage GLOBAL_QUOTE symbols for major instruments
    const AV_MAP: Partial<Record<GlobalSymbol, { avSymbol: string; name: string; category: GlobalQuote['category']; currency: string }>> = {
      DOW:       { avSymbol: 'DJI',        name: 'Dow Jones Industrial Average', category: 'equity',    currency: 'USD' },
      NASDAQ:    { avSymbol: 'IXIC',       name: 'NASDAQ Composite',             category: 'equity',    currency: 'USD' },
      SP500:     { avSymbol: 'INX',        name: 'S&P 500',                      category: 'equity',    currency: 'USD' },
      NIKKEI:    { avSymbol: 'N225.TSE',   name: 'Nikkei 225',                   category: 'equity',    currency: 'JPY' },
      HANGSENG:  { avSymbol: 'HSI.HKEX',  name: 'Hang Seng',                    category: 'equity',    currency: 'HKD' },
      DAX:       { avSymbol: 'DAX.XETRA', name: 'DAX 40',                       category: 'equity',    currency: 'EUR' },
      CRUDE_OIL: { avSymbol: 'WTI',        name: 'Crude Oil (WTI)',              category: 'commodity', currency: 'USD' },
      GOLD:      { avSymbol: 'GOLD',       name: 'Gold',                         category: 'commodity', currency: 'USD' },
      SILVER:    { avSymbol: 'SILVER',     name: 'Silver',                       category: 'commodity', currency: 'USD' },
      USD_INR:   { avSymbol: 'USD/INR',    name: 'USD / INR',                    category: 'forex',     currency: 'INR' },
      DXY:       { avSymbol: 'DXY',        name: 'US Dollar Index',              category: 'forex',     currency: 'USD' },
      BTC_USD:   { avSymbol: 'BTC/USD',    name: 'Bitcoin',                      category: 'crypto',    currency: 'USD' },
      ETH_USD:   { avSymbol: 'ETH/USD',    name: 'Ethereum',                     category: 'crypto',    currency: 'USD' },
    };

    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const meta = AV_MAP[sym];
        if (!meta) throw new Error(`No AV mapping for ${sym}`);

        const data = await this.fetch<Record<string, unknown>>({
          function: 'GLOBAL_QUOTE',
          symbol: meta.avSymbol,
        });
        const q = data['Global Quote'] as Record<string, string> | undefined;
        if (!q || !q['05. price']) throw new Error(`No data for ${sym}`);

        return {
          symbol: sym,
          name: meta.name,
          category: meta.category,
          price: parseFloat(q['05. price']),
          change: parseFloat(q['09. change']),
          changePercent: parseFloat(q['10. change percent'].replace('%', '')),
          currency: meta.currency,
          lastUpdated: new Date().toISOString(),
        } satisfies GlobalQuote;
      })
    );

    // Fall back to mock for any failed symbol rather than returning partial/broken data
    const mock = new MockMarketDataAdapter();
    const mockFallbacks = await mock.getGlobalQuotes(symbols);

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.warn(`[AlphaVantage] getGlobalQuotes fallback for ${symbols[i]}: ${(r.reason as Error).message}`);
      return mockFallbacks[i];
    });
  }
}
