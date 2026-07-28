import type { FnoDataProvider } from './types';
import { MockFnoAdapter } from './mock-fno-adapter';
import { NseFnoAdapter } from './nse-fno-adapter';

export { MockFnoAdapter } from './mock-fno-adapter';
export { NseFnoAdapter } from './nse-fno-adapter';
export type {
  FnoDataProvider,
  RolloverData,
  FuturesOI,
  FiiDerPositionSummary,
  FiiDerPositionDay,
  ParticipantOIData,
  ParticipantOIRow,
  FnoIntelligenceData,
  FnoInterpretationResponse,
} from './types';
export { ALL_FNO_SYMBOLS, FNO_INDEX_SYMBOLS, FNO_STOCK_SYMBOLS, FnoInterpretationResponseSchema } from './types';

let _instance: FnoDataProvider | null = null;

export function getFnoProvider(): FnoDataProvider {
  if (_instance) return _instance;
  const provider = process.env.FNO_PROVIDER ?? 'mock';
  if (provider === 'nse') {
    _instance = new NseFnoAdapter();
    console.log('[fno] Using NseFnoAdapter');
  } else {
    _instance = new MockFnoAdapter();
    console.log('[fno] Using MockFnoAdapter');
  }
  return _instance;
}
