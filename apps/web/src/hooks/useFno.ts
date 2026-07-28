import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { RolloverData, FiiDerPositionSummary, ParticipantOIData, FnoAnalysisResult } from '../types/fno';

export function useRollover(symbol: string) {
  return useQuery<RolloverData>({
    queryKey: ['fno', 'rollover', symbol],
    queryFn: async () => {
      const res = await api.get<{ data: RolloverData }>(`/fno/rollover/${symbol}`);
      return res.data.data;
    },
    enabled: !!symbol,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useFiiDerPositions() {
  return useQuery<FiiDerPositionSummary>({
    queryKey: ['fno', 'fii-positions'],
    queryFn: async () => {
      const res = await api.get<{ data: FiiDerPositionSummary }>('/fno/fii-positions');
      return res.data.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useParticipantOI() {
  return useQuery<ParticipantOIData>({
    queryKey: ['fno', 'participant-oi'],
    queryFn: async () => {
      const res = await api.get<{ data: ParticipantOIData }>('/fno/participant-oi');
      return res.data.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useFnoAnalysis(symbol: string, enabled = false) {
  return useQuery<FnoAnalysisResult>({
    queryKey: ['fno', 'analysis', symbol],
    queryFn: async () => {
      const res = await api.get<{ data: FnoAnalysisResult }>(`/fno/analysis/${symbol}`);
      return res.data.data;
    },
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
