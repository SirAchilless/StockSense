import type { OptionChainProvider } from './types';
import { MockOptionChainAdapter } from './mock-options-adapter';
import { NseOptionsAdapter } from './nse-options-adapter';

export { MockOptionChainAdapter } from './mock-options-adapter';
export { NseOptionsAdapter } from './nse-options-adapter';
export type {
  OptionChainProvider,
  OptionChain,
  OptionLeg,
  OptionStrikeRow,
  OptionChainInterpretation,
} from './types';
export { ALL_OPTION_SYMBOLS, INDEX_OPTION_SYMBOLS, STOCK_OPTION_SYMBOLS, LOT_SIZES, OptionChainInterpretationSchema } from './types';

let _instance: OptionChainProvider | null = null;

export function getOptionChainProvider(): OptionChainProvider {
  if (_instance) return _instance;

  const provider = process.env.OPTIONS_PROVIDER ?? 'mock';

  if (provider === 'nse') {
    _instance = new NseOptionsAdapter();
    console.log('[options] Using NseOptionsAdapter');
  } else {
    _instance = new MockOptionChainAdapter();
    console.log('[options] Using MockOptionChainAdapter');
  }

  return _instance;
}
