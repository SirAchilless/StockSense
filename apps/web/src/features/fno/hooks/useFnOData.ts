import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { RolloverData, FiiDerPositionSummary, ParticipantOIData } from '../types/fno.types';
import type { PCRDataFrontend, OITrendFrontend, CostOfCarryItemFrontend } from '../types/fno.types';

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

export function useMarketWideRollover() {
  return useQuery<RolloverData[]>({
    queryKey: ['fno', 'rollover', 'market-wide'],
    queryFn: async () => {
      const res = await api.get<{ data: RolloverData[] }>('/fno/rollover/market-wide');
      return res.data.data;
    },
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
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

export function useCostOfCarry(symbol: string) {
  return useQuery<CostOfCarryItemFrontend[]>({
    queryKey: ['fno', 'cost-of-carry', symbol],
    queryFn: async () => {
      const res = await api.get<{ data: CostOfCarryItemFrontend[] }>(
        `/fno/cost-of-carry/${symbol}`
      );
      return res.data.data;
    },
    enabled: !!symbol,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}

export function useOITrends(symbol: string, expiry?: string) {
  return useQuery<OITrendFrontend[]>({
    queryKey: ['fno', 'oi-trends', symbol, expiry],
    queryFn: async () => {
      const params = expiry ? `?expiry=${expiry}` : '';
      const res = await api.get<{ data: OITrendFrontend[] }>(`/fno/oi-trends/${symbol}${params}`);
      return res.data.data;
    },
    enabled: !!symbol,
    refetchInterval: 15 * 60_000,
    staleTime: 5 * 60_000,
  });
}

export function usePCR(symbol: string, expiry?: string) {
  return useQuery<PCRDataFrontend>({
    queryKey: ['fno', 'pcr', symbol, expiry],
    queryFn: async () => {
      const params = expiry ? `?expiry=${expiry}` : '';
      const res = await api.get<{ data: PCRDataFrontend }>(`/fno/pcr/${symbol}${params}`);
      return res.data.data;
    },
    enabled: !!symbol,
    refetchInterval: 15 * 60_000,
    staleTime: 5 * 60_000,
  });
}

export function useMarketWidePCR() {
  return useQuery<PCRDataFrontend[]>({
    queryKey: ['fno', 'pcr', 'market-wide'],
    queryFn: async () => {
      const res = await api.get<{ data: PCRDataFrontend[] }>('/fno/pcr/market-wide');
      return res.data.data;
    },
    refetchInterval: 15 * 60_000,
    staleTime: 5 * 60_000,
  });
}
