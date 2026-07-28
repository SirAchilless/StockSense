import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FnOProvider } from '@stocksense/market-data';
import { DataUnavailableError } from '../../../lib/errors';
import { NseFnOAdapter } from '../nse-fno-adapter';
import axios from 'axios';

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}));

class FailingProvider implements FnOProvider {
  async getRolloverData(): Promise<never> { throw new Error('network'); }
  async getMarketWideRollover(): Promise<never> { throw new Error('network'); }
  async getParticipantOI(): Promise<never> { throw new Error('network'); }
  async getCostOfCarry(): Promise<never> { throw new Error('network'); }
  async getOITrends(): Promise<never> { throw new Error('network'); }
  async getPCR(): Promise<never> { throw new Error('network'); }
  async getMarketWidePCR(): Promise<never> { throw new Error('network'); }
}

import { fnoService } from '../index';

describe('FnO service methods propagate DataUnavailableError', () => {
  it('all methods convert upstream failures into DataUnavailableError', async () => {
    // Replace the singleton's provider by reaching into the cached instance.
    // Since fnoService uses getFnOProvider() which memoises, we replace _instance
    // via the module's cache — simulate by spying the NseFnOAdapter.
    const fp = new FailingProvider();
    const mod = await import('../index');
    // Access the cached provider slot via the module (it's exported via getFnOProvider)
    (mod as { _instance?: FnOProvider })._instance = fp;

    await expect(fnoService.getRolloverData('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
    await expect(fnoService.getMarketWideRollover()).rejects.toBeInstanceOf(DataUnavailableError);
    await expect(fnoService.getParticipantOI('2025-01-10')).rejects.toBeInstanceOf(DataUnavailableError);
    await expect(fnoService.getCostOfCarry('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
    await expect(fnoService.getOITrends('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
    await expect(fnoService.getPCR('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
    await expect(fnoService.getMarketWidePCR()).rejects.toBeInstanceOf(DataUnavailableError);
  });
});

describe('NseFnOAdapter on upstream failure', () => {
  let adapter: NseFnOAdapter;
  beforeEach(() => {
    adapter = new NseFnOAdapter();
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.get).mockRejectedValue(new Error('upstream timeout'));
  });

  it('getRolloverData throws DataUnavailableError', async () => {
    await expect(adapter.getRolloverData('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
  });
  it('getMarketWideRollover throws DataUnavailableError', async () => {
    await expect(adapter.getMarketWideRollover()).rejects.toBeInstanceOf(DataUnavailableError);
  });
  it('getParticipantOI throws DataUnavailableError', async () => {
    await expect(adapter.getParticipantOI('2025-01-10')).rejects.toBeInstanceOf(DataUnavailableError);
  });
  it('getCostOfCarry throws DataUnavailableError', async () => {
    await expect(adapter.getCostOfCarry('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
  });
  it('getOITrends throws DataUnavailableError', async () => {
    await expect(adapter.getOITrends('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
  });
  it('getPCR throws DataUnavailableError', async () => {
    await expect(adapter.getPCR('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
  });
  it('getMarketWidePCR throws DataUnavailableError', async () => {
    await expect(adapter.getMarketWidePCR()).rejects.toBeInstanceOf(DataUnavailableError);
  });
});

describe('NseFnOAdapter validation', () => {
  let adapter: NseFnOAdapter;
  beforeEach(() => {
    adapter = new NseFnOAdapter();
    vi.mocked(axios.get).mockReset();
  });

  it('getRolloverData throws DataUnavailableError when there is no spot price', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      headers: {},
      data: { underlyingValue: 0, stocks: [] },
    } as unknown as { headers: Record<string, string>; data: Record<string, unknown> });
    await expect(adapter.getRolloverData('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
  });

  it('getRolloverData throws when <2 expiries', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ headers: { 'set-cookie': ['abc=1'] }, data: {} })
      .mockResolvedValueOnce({
        headers: {},
        data: {
          underlyingValue: 22000,
          stocks: [{
            metadata: { instrumentType: 'Index Futures', expiryDate: '2025-01-30' },
            marketDeptOrderBook: { tradeInfo: { openInterest: 1000 } },
            lastPrice: 22100,
          }],
        },
      });
    await expect(adapter.getRolloverData('NIFTY')).rejects.toBeInstanceOf(DataUnavailableError);
  });
});
