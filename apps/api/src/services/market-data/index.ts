import type { MarketDataProvider } from './types';
import { MockMarketDataAdapter } from './mock-adapter';
import { AlphaVantageAdapter } from './alpha-vantage-adapter';

export { MockMarketDataAdapter } from './mock-adapter';
export { AlphaVantageAdapter } from './alpha-vantage-adapter';
export type { MarketDataProvider, IndexSymbol, IndexQuote, MarketStatusInfo, StockQuote, StockFundamentals, OHLCBar, Timeframe, GlobalSymbol, GlobalQuote, GlobalCategory, MarketBreadthData, BreadthStock, SectorPerformance, FiiDiiActivity, AdvanceDecline } from './types';
export { GLOBAL_SYMBOLS } from './types';

let _instance: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (_instance) return _instance;

  const provider = process.env.MARKET_DATA_PROVIDER ?? 'mock';

  if (provider === 'alpha_vantage') {
    const key = process.env.ALPHA_VANTAGE_API_KEY;
    if (!key) throw new Error('[market-data] ALPHA_VANTAGE_API_KEY is required when MARKET_DATA_PROVIDER=alpha_vantage');
    _instance = new AlphaVantageAdapter(key);
    console.log('[market-data] Using AlphaVantageAdapter');
  } else {
    _instance = new MockMarketDataAdapter();
    console.log('[market-data] Using MockMarketDataAdapter');
  }

  return _instance;
}
