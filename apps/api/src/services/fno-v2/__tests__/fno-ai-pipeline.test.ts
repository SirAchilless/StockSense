import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFnoAICommentary } from '../../ai/grounding-pipeline';
import { DataUnavailableError } from '../../../lib/errors';
import type { AIProvider } from '../../ai/types';
import type { FnOProvider } from '@stocksense/market-data';

const mockAI: AIProvider = {
  generateResearch: vi.fn(),
  generateChatReply: vi.fn(),
  generateGlobalNote: vi.fn(),
  generateNewsSentiment: vi.fn(),
  generatePortfolioAnalysis: vi.fn(),
  generateOptionChainInterpretation: vi.fn(),
  generateFnoInterpretation: vi.fn(),
};

function makeProvider(overrides: Partial<FnOProvider> = {}): FnOProvider {
  return {
    getRolloverData: vi.fn().mockResolvedValue({
      symbol: 'NIFTY', expiryNear: '2025-01-30', expiryNext: '2025-02-27',
      rolloverPct: 72.5, rolloverCostBps: 18,
      historicalAvgRolloverPct: 67.4, historicalAvgRolloverCostBps: 25,
    }),
    getMarketWideRollover: vi.fn().mockResolvedValue([]),
    getParticipantOI: vi.fn().mockResolvedValue([
      { date: '2025-01-10', category: 'FII', instrumentType: 'INDEX_FUTURES', longOI: 100, shortOI: 80, netOI: 20 },
    ]),
    getCostOfCarry: vi.fn().mockResolvedValue([]),
    getOITrends: vi.fn().mockResolvedValue([]),
    getPCR: vi.fn().mockResolvedValue({ symbol: 'NIFTY', expiry: 'ALL', pcrOI: 1.1, pcrVolume: 1.0, timestamp: new Date().toISOString() }),
    getMarketWidePCR: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('runFnoAICommentary (C.4 RAG pipeline)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws DataUnavailableError and does NOT call AI when rolloverPct is invalid', async () => {
    const provider = makeProvider({
      getRolloverData: vi.fn().mockResolvedValue({
        symbol: 'NIFTY', expiryNear: '2025-01-30', expiryNext: '2025-02-27',
        rolloverPct: -1, rolloverCostBps: 0, historicalAvgRolloverPct: 70, historicalAvgRolloverCostBps: 25,
      }),
    });
    await expect(runFnoAICommentary({
      symbol: 'NIFTY',
      metrics: ['rollover'],
      fnoProvider: provider,
      aiProvider: mockAI,
    })).rejects.toBeInstanceOf(DataUnavailableError);

    expect(mockAI.generateFnoInterpretation).not.toHaveBeenCalled();
  });

  it('throws DataUnavailableError and does NOT call AI when PCR is zero/missing', async () => {
    const provider = makeProvider({
      getPCR: vi.fn().mockResolvedValue({
        symbol: 'NIFTY', expiry: 'ALL', pcrOI: 0, pcrVolume: 0, timestamp: new Date().toISOString(),
      }),
    });
    await expect(runFnoAICommentary({
      symbol: 'NIFTY',
      metrics: ['pcr'],
      fnoProvider: provider,
      aiProvider: mockAI,
    })).rejects.toBeInstanceOf(DataUnavailableError);
    expect(mockAI.generateFnoInterpretation).not.toHaveBeenCalled();
  });

  it('calls AI and returns commentary when all fields are valid', async () => {
    vi.mocked(mockAI.generateFnoInterpretation).mockResolvedValue({
      rolloverNote: 'r', fiiPositioningNote: 'f', diiPositioningNote: 'd',
      costOfCarryNote: 'c', overallNote: 'o',
      confidence: 0.7, dataAvailable: true,
    });
    const provider = makeProvider();
    const result = await runFnoAICommentary({
      symbol: 'NIFTY', metrics: ['rollover', 'pcr'],
      fnoProvider: provider, aiProvider: mockAI,
    });
    expect(mockAI.generateFnoInterpretation).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(mockAI.generateFnoInterpretation).mock.calls[0][0];
    // Prompt must only contain data from the current fetch — no extraneous symbols.
    expect(payload.symbol).toBe('NIFTY');
    expect(payload.marketData).toBeDefined();
    // The serialized payload contains only keys we fetched for the requested metrics
    const md = payload.marketData as Record<string, unknown>;
    expect(md.rollover).toBeDefined();
    expect(md.pcr).toBeDefined();
    expect(md.costOfCarry).toBeUndefined(); // not requested
    expect(result.dataAvailable).toBe(true);
    expect(result.commentary).toContain('o');
    expect(result.disclaimer).toMatch(/Not SEBI-registered advisory/);
  });
});
